// Minimal Coinbase proxy for JWT signing + request forwarding
// Usage: npm run proxy (default port 8787)

import dotenv from 'dotenv';
// Load .env.local first (override with .env if present)
dotenv.config({ path: '.env.local' });
dotenv.config();
import http from 'node:http';
import { URL } from 'node:url';
import { createPrivateKey } from 'node:crypto';
import jwt from 'jsonwebtoken';

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const DEBUG = process.env.DEBUG_COINBASE === '1' || process.env.DEBUG_COINBASE === 'true';

// Utilities for SEC1 (EC PRIVATE KEY) -> PKCS#8 wrapping (P-256)
const derEncodeLength = (len) => {
  if (len < 128) return Uint8Array.from([len]);
  const bytes = [];
  let tmp = len;
  while (tmp > 0) { bytes.unshift(tmp & 0xff); tmp >>= 8; }
  return Uint8Array.from([0x80 | bytes.length, ...bytes]);
};
const concatUint8 = (...parts) => {
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
const base64ToBytes = (b64) => {
  let clean = b64
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
    .replace(/[\uFF0B]/g, '+')
    .replace(/[\uFF0F]/g, '/')
    .replace(/[\uFF1D]/g, '=');
  clean = clean.replace(/[^A-Za-z0-9+/=]/g, '');
  const rem = clean.length % 4;
  if (rem === 1) throw new Error('Invalid base64 length');
  if (rem > 0) clean = clean.padEnd(clean.length + (4 - rem), '=');
  return Buffer.from(clean, 'base64');
};
const pemToDer = (pem) => {
  const m = pem.match(/-----BEGIN [^-]+-----([\s\S]*?)-----END [^-]+-----/);
  if (!m) throw new Error('Invalid PEM');
  return base64ToBytes(m[1]);
};
const derToPem = (der, label) => {
  const b64 = Buffer.from(der).toString('base64').replace(/(.{64})/g, '$1\n');
  return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----`;
};
const sec1ToPkcs8 = (sec1Pem) => {
  const ecPrivateKey = pemToDer(sec1Pem);
  const oidEcPublicKey = Uint8Array.from([0x06,0x07,0x2a,0x86,0x48,0xce,0x3d,0x02,0x01]);
  const oidPrime256v1 = Uint8Array.from([0x06,0x08,0x2a,0x86,0x48,0xce,0x3d,0x03,0x01,0x07]);
  const algIdSeqContent = concatUint8(oidEcPublicKey, oidPrime256v1);
  const algIdSeq = concatUint8(Uint8Array.from([0x30]), derEncodeLength(algIdSeqContent.length), algIdSeqContent);
  const privateKeyOctet = concatUint8(Uint8Array.from([0x04]), derEncodeLength(ecPrivateKey.length), ecPrivateKey);
  const version = Uint8Array.from([0x02,0x01,0x00]);
  const pkcs8SeqContent = concatUint8(version, algIdSeq, privateKeyOctet);
  const pkcs8Seq = concatUint8(Uint8Array.from([0x30]), derEncodeLength(pkcs8SeqContent.length), pkcs8SeqContent);
  return derToPem(pkcs8Seq, 'PRIVATE KEY');
};

// --- Minimal ASN.1 readers to extract EC private scalar (d) ---
function readASN1Length(buf, pos) {
  const first = buf[pos++];
  if ((first & 0x80) === 0) return [first, pos];
  const num = first & 0x7f;
  let len = 0;
  for (let i = 0; i < num; i++) len = (len << 8) | buf[pos++];
  return [len, pos];
}
function readASN1Type(buf, pos, expectedTag) {
  if (buf[pos++] !== expectedTag) throw new Error('ASN.1 tag mismatch');
  const [len, p2] = readASN1Length(buf, pos);
  const start = p2;
  const end = start + len;
  return [buf.subarray(start, end), end];
}
function extractDFromSEC1(sec1Der) {
  let pos = 0;
  // SEQUENCE (ECPrivateKey)
  const [seq, posAfter] = readASN1Type(sec1Der, pos, 0x30);
  let p = 0;
  // Version INTEGER
  [, p] = readASN1Type(seq, p, 0x02);
  // privateKey OCTET STRING
  const [privOct] = readASN1Type(seq, p, 0x04);
  return privOct; // d
}
function extractDFromPKCS8(pkcs8Der) {
  let pos = 0;
  // Outer SEQUENCE
  const [seq, posAfter] = readASN1Type(pkcs8Der, pos, 0x30);
  // Work within seq
  let p = 0;
  // version
  [, p] = readASN1Type(seq, p, 0x02);
  // algorithmIdentifier SEQUENCE
  [, p] = readASN1Type(seq, p, 0x30);
  // privateKey OCTET STRING containing ECPrivateKey
  const [privOct] = readASN1Type(seq, p, 0x04);
  // Parse ECPrivateKey inside
  return extractDFromSEC1(privOct);
}
function extractDFromPem(pem) {
  const cleaned = sanitizePem(pem);
  if (/BEGIN EC PRIVATE KEY/.test(cleaned)) {
    const der = pemToDer(cleaned);
    return extractDFromSEC1(der);
  }
  if (/BEGIN PRIVATE KEY/.test(cleaned)) {
    const der = pemToDer(cleaned);
    return extractDFromPKCS8(der);
  }
  throw new Error('Unsupported key format (expected EC PRIVATE KEY or PRIVATE KEY)');
}
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');

function leftPad(buf, len) {
  if (buf.length === len) return buf;
  if (buf.length > len) throw new Error('EC private key length is too large');
  const out = Buffer.alloc(len);
  buf.copy(out, len - buf.length);
  return out;
}

function sanitizePem(pem) {
  return String(pem)
    .replace(/[\uFEFF]/g, '') // strip BOM
    .replace(/[\r]+/g, '\n')
    .replace(/[ \t\u00A0\u2000-\u200B\u202F\u205F\u3000]+$/gm, '')
    .trim();
}

async function generateJWT({ keyName, privateKey, method, path, keyId }) {
  // Extract EC private scalar d from PEM and build a JWK (avoids OpenSSL PEM decoders entirely)
  const dBytesRaw = extractDFromPem(privateKey);
  const d32 = leftPad(Buffer.from(dBytesRaw), 32);
  const jwk = { kty: 'EC', crv: 'P-256', d: b64url(d32) };
  if (DEBUG) {
    const pemType = privateKey.includes('BEGIN EC PRIVATE KEY') ? 'SEC1' : 'PKCS#8';
    console.log('[Coinbase DEBUG] PEM type:', pemType);
  }
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'cdp',
    sub: keyName,
    nbf: now,
    exp: now + 120,
    uri: `${method.toUpperCase()} ${path}`,
    aud: 'api.coinbase.com',
  };
  const header = { alg: 'ES256', kid: keyId || keyName, typ: 'JWT' };
  if (DEBUG) {
    // Sanitize and log header/payload for diagnostics
    console.log('[Coinbase DEBUG] JWT Header:', header);
    console.log('[Coinbase DEBUG] JWT Payload:', payload);
  }
  // Create a KeyObject from JWK (supported in modern Node). Fallback to PKCS#8 PEM if not supported.
  let keyObj;
  try {
    keyObj = createPrivateKey({ key: jwk, format: 'jwk' });
  } catch (e) {
    if (DEBUG) console.warn('[Coinbase DEBUG] JWK import failed, falling back to PKCS#8:', e?.message || e);
    // Build PKCS#8 wrapper from SEC1/PKCS#8 PEM to get a valid PEM for Node
    const pem = /BEGIN EC PRIVATE KEY/.test(privateKey) ? sec1ToPkcs8(privateKey) : sanitizePem(privateKey);
    keyObj = createPrivateKey({ key: pem, format: 'pem' });
  }
  const token = jwt.sign(payload, keyObj, {
    algorithm: 'ES256',
    header,
  });
  // jsonwebtoken internally produces a proper JWS with ES256
  return token;
}

async function handleProxy(req, res, body) {
  try {
    let { keyName, privateKey, method, path, payload, keyId } = JSON.parse(body || '{}');
    keyName ||= process.env.COINBASE_KEY_NAME;
    keyId ||= process.env.COINBASE_KEY_ID || keyName;
    privateKey ||= process.env.COINBASE_PRIVATE_KEY;
    if (!keyName || !privateKey || !method || !path) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': CORS_ORIGIN });
      res.end(JSON.stringify({ error: 'Missing required fields' }));
      return;
    }
    const m = String(method).toUpperCase();
    const p = path.startsWith('/') ? path : `/${path}`;
    if (DEBUG) {
      console.log('[Coinbase DEBUG] Signing request:', { method: m, path: p, keyName, kid: keyId || keyName });
    }
    const token = await generateJWT({ keyName, privateKey, method: m, path: p, keyId });
    const upstream = new URL(`https://api.coinbase.com${p}`);
    const upstreamRes = await fetch(upstream, {
      method: m,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const text = await upstreamRes.text();
    if (DEBUG) {
      console.log('[Coinbase DEBUG] Upstream status:', upstreamRes.status);
      console.log('[Coinbase DEBUG] Upstream body:', text.slice(0, 1000));
    }
    // Always return JSON structure on error to help the client display details
    if (!upstreamRes.ok) {
      res.writeHead(upstreamRes.status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': CORS_ORIGIN,
      });
      res.end(JSON.stringify({ error: `Coinbase API error ${upstreamRes.status}`, body: text }));
      return;
    }
    res.writeHead(upstreamRes.status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': CORS_ORIGIN,
    });
    res.end(text);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': CORS_ORIGIN });
    const msg = e instanceof Error ? e.message : String(e);
    if (DEBUG) console.error('[Coinbase DEBUG] Proxy error:', e);
    res.end(JSON.stringify({ error: msg }));
  }
}

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    });
    res.end();
    return;
  }
  if (req.method === 'POST' && req.url === '/proxy') {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => handleProxy(req, res, data));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': CORS_ORIGIN });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Coinbase proxy listening on http://localhost:${PORT}`);
});
