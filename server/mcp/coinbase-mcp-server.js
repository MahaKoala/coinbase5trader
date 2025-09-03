// Coinbase MCP Server (stdio) — integrates Coinbase API via MCP tools.
// Requires installation:
//   npm i -D @modelcontextprotocol/sdk jsonwebtoken
// Env vars:
//   COINBASE_KEY_NAME, COINBASE_PRIVATE_KEY, (optional) COINBASE_KEY_ID
// Run:
//   node server/mcp/coinbase-mcp-server.js

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import process from 'node:process';
import { createPrivateKey } from 'node:crypto';
import jwt from 'jsonwebtoken';

let Server, StdioServerTransport;
try {
  ({ Server } = await import('@modelcontextprotocol/sdk/server/index.js'));
  ({ StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js'));
} catch (e) {
  console.error('[MCP] Missing SDK. Please install:\n  npm i -D @modelcontextprotocol/sdk jsonwebtoken');
  process.exit(1);
}

const DEBUG = process.env.DEBUG_COINBASE === '1' || process.env.DEBUG_COINBASE === 'true';

// Utilities copied/adapted from server/proxy.js for key handling
const base64ToBytes = (b64) => Buffer.from(b64, 'base64');
const pemToDer = (pem) => {
  const m = pem.match(/-----BEGIN [^-]+-----([\s\S]*?)-----END [^-]+-----/);
  if (!m) throw new Error('Invalid PEM');
  return base64ToBytes(m[1].replace(/[^A-Za-z0-9+/=]/g, ''));
};
function readASN1Length(buf, pos) {
  const first = buf[pos++];
  if ((first & 0x80) === 0) return [first, pos];
  const num = first & 0x7f;
  let len = 0; for (let i = 0; i < num; i++) len = (len << 8) | buf[pos++];
  return [len, pos];
}
function readASN1Type(buf, pos, expectedTag) {
  if (buf[pos++] !== expectedTag) throw new Error('ASN.1 tag mismatch');
  const [len, p2] = readASN1Length(buf, pos);
  const start = p2, end = start + len;
  return [buf.subarray(start, end), end];
}
function extractDFromSEC1(sec1Der) {
  let pos = 0;
  const [seq] = readASN1Type(sec1Der, pos, 0x30);
  let p = 0;
  [, p] = readASN1Type(seq, p, 0x02); // version
  const [privOct] = readASN1Type(seq, p, 0x04); // d
  return privOct;
}
function extractDFromPKCS8(pkcs8Der) {
  let pos = 0;
  const [seq] = readASN1Type(pkcs8Der, pos, 0x30);
  let p = 0; [, p] = readASN1Type(seq, p, 0x02); // version
  [, p] = readASN1Type(seq, p, 0x30); // alg id
  const [privOct] = readASN1Type(seq, p, 0x04); // ECPrivateKey
  return extractDFromSEC1(privOct);
}
function extractDFromPem(pem) {
  const cleaned = String(pem).trim();
  if (/BEGIN EC PRIVATE KEY/.test(cleaned)) return extractDFromSEC1(pemToDer(cleaned));
  if (/BEGIN PRIVATE KEY/.test(cleaned)) return extractDFromPKCS8(pemToDer(cleaned));
  throw new Error('Unsupported key format (expected EC PRIVATE KEY or PRIVATE KEY)');
}
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
function leftPad(buf, len) { if (buf.length === len) return buf; const out = Buffer.alloc(len); buf.copy(out, len - buf.length); return out; }

function makeKeyObjectFromPem(pem) {
  const dRaw = extractDFromPem(pem);
  const d32 = leftPad(Buffer.from(dRaw), 32);
  const jwk = { kty: 'EC', crv: 'P-256', d: b64url(d32) };
  return createPrivateKey({ key: jwk, format: 'jwk' });
}

async function signJWT({ keyName, keyId, privateKey, method, path }) {
  const keyObj = makeKeyObjectFromPem(privateKey);
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'cdp', sub: keyName, nbf: now, exp: now + 120,
    uri: `${method.toUpperCase()} ${path}`, aud: 'api.coinbase.com'
  };
  const header = { alg: 'ES256', kid: keyId || keyName, typ: 'JWT' };
  if (DEBUG) { console.log('[MCP DEBUG] Header:', header); console.log('[MCP DEBUG] Payload:', payload); }
  return jwt.sign(payload, keyObj, { algorithm: 'ES256', header });
}

async function coinbaseFetch({ keyName, keyId, privateKey, method, path, payload }) {
  const token = await signJWT({ keyName, keyId, privateKey, method, path });
  const res = await fetch(`https://api.coinbase.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Coinbase ${res.status}: ${text}`);
  return JSON.parse(text);
}

const server = new Server({ name: 'coinbase-mcp', version: '0.1.0' });

server.tool('coinbase_get_accounts', {
  description: 'List brokerage accounts',
  inputSchema: { type: 'object', properties: {}, required: [] },
}, async () => {
  const keyName = process.env.COINBASE_KEY_NAME;
  const keyId = process.env.COINBASE_KEY_ID;
  const privateKey = process.env.COINBASE_PRIVATE_KEY;
  if (!keyName || !privateKey) throw new Error('Missing COINBASE_KEY_NAME or COINBASE_PRIVATE_KEY');
  return coinbaseFetch({ keyName, keyId, privateKey, method: 'GET', path: '/api/v3/brokerage/accounts' });
});

server.tool('coinbase_get_product_ticker', {
  description: 'Get product ticker by product_id (e.g., BTC-USD)',
  inputSchema: { type: 'object', properties: { product_id: { type: 'string' } }, required: ['product_id'] },
}, async ({ product_id }) => {
  const keyName = process.env.COINBASE_KEY_NAME;
  const keyId = process.env.COINBASE_KEY_ID;
  const privateKey = process.env.COINBASE_PRIVATE_KEY;
  if (!keyName || !privateKey) throw new Error('Missing COINBASE_KEY_NAME or COINBASE_PRIVATE_KEY');
  return coinbaseFetch({ keyName, keyId, privateKey, method: 'GET', path: `/api/v3/brokerage/products/${product_id}/ticker` });
});

server.tool('coinbase_place_order', {
  description: 'Place a market or limit order',
  inputSchema: {
    type: 'object',
    properties: {
      product_id: { type: 'string' }, side: { type: 'string', enum: ['BUY', 'SELL'] },
      type: { type: 'string', enum: ['MARKET', 'LIMIT'] }, amount: { type: 'string' }, price: { type: 'string' },
    }, required: ['product_id', 'side', 'type', 'amount']
  },
}, async ({ product_id, side, type, amount, price }) => {
  const keyName = process.env.COINBASE_KEY_NAME;
  const keyId = process.env.COINBASE_KEY_ID;
  const privateKey = process.env.COINBASE_PRIVATE_KEY;
  if (!keyName || !privateKey) throw new Error('Missing COINBASE_KEY_NAME or COINBASE_PRIVATE_KEY');
  const payload = {
    client_order_id: `order_${Date.now()}`,
    product_id,
    side,
    order_configuration: type === 'MARKET'
      ? { market_market_ioc: { quote_size: amount } }
      : { limit_limit_gtc: { base_size: amount, limit_price: price || '0' } },
  };
  return coinbaseFetch({ keyName, keyId, privateKey, method: 'POST', path: '/api/v3/brokerage/orders', payload });
});

const transport = new StdioServerTransport();
await server.connect(transport);
if (DEBUG) console.log('[MCP] Coinbase MCP server running on stdio');
