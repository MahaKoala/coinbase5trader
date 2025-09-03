// JWT Authentication utility for Coinbase Advanced Trade API
// Uses ES256 (ECDSA with P-256 curve) as required by Coinbase
import { SignJWT, importPKCS8 } from 'jose';

// Minimal ASN.1 DER utilities to wrap an EC (SEC1) key into PKCS#8
const derEncodeLength = (len: number): Uint8Array => {
  if (len < 128) return new Uint8Array([len]);
  const bytes = [] as number[];
  let tmp = len;
  while (tmp > 0) {
    bytes.unshift(tmp & 0xff);
    tmp >>= 8;
  }
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
};

const concatUint8 = (...parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((acc, p) => acc + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
};

const base64ToBytes = (b64: string): Uint8Array => {
  // Normalize common Unicode variants to ASCII first
  let clean = b64
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ') // spaces
    .replace(/[\uFF0B]/g, '+') // fullwidth plus
    .replace(/[\uFF0F]/g, '/') // fullwidth slash
    .replace(/[\uFF1D]/g, '='); // fullwidth equals

  // Keep only valid base64 characters
  clean = clean.replace(/[^A-Za-z0-9+/=]/g, '');
  // Pad to multiple of 4 if needed (except impossible remainder 1)
  const rem = clean.length % 4;
  if (rem === 1) {
    throw new Error('Invalid base64 string in PEM (incorrect length)');
  } else if (rem > 0) {
    clean = clean.padEnd(clean.length + (4 - rem), '=');
  }

  // Manual base64 decode (tolerant of extraneous chars removed above)
  const table = new Uint8Array(256);
  for (let i = 0; i < 256; i++) table[i] = 255;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (let i = 0; i < alphabet.length; i++) table[alphabet.charCodeAt(i)] = i;

  const out: number[] = [];
  let q: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const c = clean.charCodeAt(i);
    if (c === 61) { // '=' padding
      // Emit remaining bytes based on current quartet length
      if (q.length === 2) {
        out.push(((q[0] << 2) | (q[1] >> 4)) & 0xff);
      } else if (q.length === 3) {
        out.push(((q[0] << 2) | (q[1] >> 4)) & 0xff);
        out.push(((q[1] << 4) | (q[2] >> 2)) & 0xff);
      }
      break;
    }
    const v = table[c];
    if (v === 255) continue; // skip any stray
    q.push(v);
    if (q.length === 4) {
      out.push(((q[0] << 2) | (q[1] >> 4)) & 0xff);
      out.push(((q[1] << 4) | (q[2] >> 2)) & 0xff);
      out.push(((q[2] << 6) | q[3]) & 0xff);
      q = [];
    }
  }
  if (q.length === 1) {
    // Tolerate a stray trailing 6-bit quantum; ignore it.
  } else if (q.length === 2) {
    out.push(((q[0] << 2) | (q[1] >> 4)) & 0xff);
  } else if (q.length === 3) {
    out.push(((q[0] << 2) | (q[1] >> 4)) & 0xff);
    out.push(((q[1] << 4) | (q[2] >> 2)) & 0xff);
  }
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out[i];
  return bytes;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

const pemToDer = (pem: string): Uint8Array => {
  const match = pem.match(/-----BEGIN [^-]+-----([\s\S]*?)-----END [^-]+-----/);
  if (!match) {
    throw new Error('Invalid PEM format: missing BEGIN/END markers');
  }
  const base64 = match[1];
  return base64ToBytes(base64);
};

const derToPem = (der: Uint8Array, label: string): string => {
  const b64 = bytesToBase64(der).replace(/(.{64})/g, '$1\n');
  return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----`;
};

// Wraps an ECPrivateKey (SEC1, RFC5915) DER into a PKCS#8 PrivateKeyInfo
// Assumes P-256 (prime256v1) if curve parameters are not inspected.
const sec1ToPkcs8 = (sec1Pem: string): string => {
  const ecPrivateKey = pemToDer(sec1Pem);
  // AlgorithmIdentifier for id-ecPublicKey with prime256v1 parameters
  const oidEcPublicKey = new Uint8Array([0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01]); // 1.2.840.10045.2.1
  const oidPrime256v1 = new Uint8Array([0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07]); // 1.2.840.10045.3.1.7
  const algIdSeqContent = concatUint8(oidEcPublicKey, oidPrime256v1);
  const algIdSeq = concatUint8(new Uint8Array([0x30]), derEncodeLength(algIdSeqContent.length), algIdSeqContent);

  const privateKeyOctet = concatUint8(new Uint8Array([0x04]), derEncodeLength(ecPrivateKey.length), ecPrivateKey);

  const version = new Uint8Array([0x02, 0x01, 0x00]); // INTEGER 0
  const pkcs8SeqContent = concatUint8(version, algIdSeq, privateKeyOctet);
  const pkcs8Seq = concatUint8(new Uint8Array([0x30]), derEncodeLength(pkcs8SeqContent.length), pkcs8SeqContent);
  return derToPem(pkcs8Seq, 'PRIVATE KEY');
};

export interface CoinbaseCredentials {
  keyName: string; // API key name (organizations/.../apiKeys/...) per Coinbase
  keyId?: string;  // API key ID (kid) if provided separately
  privateKey: string;
}

// Function to create JWT token for Coinbase API authentication
export const generateJWT = async (
  credentials: CoinbaseCredentials,
  requestMethod: string,
  requestPath: string
): Promise<string> => {
  const { keyName, privateKey } = credentials;
  
  // JWT payload
  const now = Math.floor(Date.now() / 1000);
  
  try {
    // Accept both SEC1 (EC PRIVATE KEY) and PKCS#8 (PRIVATE KEY)
    const pkcs8Pem = privateKey.includes('BEGIN EC PRIVATE KEY')
      ? sec1ToPkcs8(privateKey)
      : privateKey;

    if (!pkcs8Pem.includes('BEGIN PRIVATE KEY')) {
      throw new Error('Unsupported private key format. Provide EC PRIVATE KEY or PRIVATE KEY PEM.');
    }

    const cryptoKey: CryptoKey = await importPKCS8(pkcs8Pem, 'ES256');
    
    // Create and sign the JWT
    const method = requestMethod.toUpperCase();
    const jwt = await new SignJWT({
      iss: 'cdp',
      sub: keyName,
      nbf: now,
      exp: now + 120, // Expires in 2 minutes as required by Coinbase
      // Per Coinbase docs, "uri" should be "<METHOD> <PATH>" (no scheme/host)
      uri: `${method} ${requestPath}`,
      // Some integrations also include aud, which is safe to add
      aud: 'api.coinbase.com',
    })
      .setProtectedHeader({
        alg: 'ES256',
        kid: credentials.keyId || keyName,
        typ: 'JWT'
      })
      .sign(cryptoKey);
    return jwt;
  } catch (error) {
    throw new Error(`Failed to generate JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Function to make authenticated requests to Coinbase API
export const makeCoinbaseRequest = async (
  credentials: CoinbaseCredentials,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: any
): Promise<any> => {
  // Prefer proxy for compliance, security, and to avoid WebCrypto/CORS issues
  const useProxy = true;

  try {
    if (useProxy) {
      const envUrl = (import.meta as any).env?.VITE_PROXY_URL as string | undefined;
      const sameOrigin = typeof window !== 'undefined' ? `${window.location.origin}/proxy` : undefined;
      const proxyUrl = envUrl || sameOrigin || 'http://localhost:8787/proxy';
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyName: credentials.keyName,
          keyId: credentials.keyId,
          privateKey: credentials.privateKey,
          method,
          path,
          payload: body ?? null,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Proxy error: ${response.status} - ${errorData.error || response.statusText}`);
      }
      return await response.json();
    }

    const jwt = await generateJWT(credentials, method, path);
    const response = await fetch(`https://api.coinbase.com${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Coinbase API error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Coinbase API request failed:', error);
    throw error;
  }
};

// Function to test API connection
export const testApiConnection = async (
  credentials: CoinbaseCredentials
): Promise<{ success: boolean; message: string }> => {
  try {
    // Use a simple authenticated endpoint to test connection
    await makeCoinbaseRequest(
      credentials,
      'GET',
      '/api/v3/brokerage/accounts'
    );
    
    return {
      success: true,
      message: "API connection successful"
    };
  } catch (error) {
    console.error('API connection test failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "API connection failed"
    };
  }
};

// Function to get real-time price for a cryptocurrency
export const getCryptoPrice = async (
  credentials: CoinbaseCredentials,
  productId: string
): Promise<{ price: number; volume: number }> => {
  try {
    const data = await makeCoinbaseRequest(
      credentials,
      'GET',
      `/api/v3/brokerage/products/${productId}/ticker`
    );
    
    return {
      price: parseFloat(data.price),
      volume: parseFloat(data.volume_24h || data.volume || '0')
    };
  } catch (error) {
    console.error(`Failed to get price for ${productId}:`, error);
    throw error;
  }
};

// Function to get account balances
export const getAccountBalances = async (
  credentials: CoinbaseCredentials
): Promise<any[]> => {
  try {
    const data = await makeCoinbaseRequest(
      credentials,
      'GET',
      '/api/v3/brokerage/accounts'
    );
    
    return data.accounts || [];
  } catch (error) {
    console.error('Failed to get account balances:', error);
    throw error;
  }
};

// Function to place an order
export const placeOrder = async (
  credentials: CoinbaseCredentials,
  orderConfig: {
    productId: string;
    side: 'BUY' | 'SELL';
    orderType: 'MARKET' | 'LIMIT';
    amount: string;
    price?: string;
  }
): Promise<any> => {
  try {
    const orderData = {
      client_order_id: `order_${Date.now()}`,
      product_id: orderConfig.productId,
      side: orderConfig.side,
      order_configuration: 
        orderConfig.orderType === 'MARKET' 
          ? {
              market_market_ioc: {
                quote_size: orderConfig.amount
              }
            }
          : {
              limit_limit_gtc: {
                base_size: orderConfig.amount,
                limit_price: orderConfig.price || '0'
              }
            }
    };

    const data = await makeCoinbaseRequest(
      credentials,
      'POST',
      '/api/v3/brokerage/orders',
      orderData
    );
    
    return data;
  } catch (error) {
    console.error('Failed to place order:', error);
    throw error;
  }
};
