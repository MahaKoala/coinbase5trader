# Coinbase API Key Authentication — Plan & Tracking

Source of truth:
- Coinbase docs: https://docs.cdp.coinbase.com/coinbase-app/authentication-authorization/api-key-authentication#javascript

Goals
- Implement JWT (ES256/ECDSA P-256) per Coinbase spec for API Key authentication.
- Support both SEC1 (EC PRIVATE KEY) and PKCS#8 (PRIVATE KEY) PEM inputs from the UI.
- Sign requests reliably via a small Node proxy (avoids browser WebCrypto/CORS issues) and keep claims/header exactly as documented.
 - In proxy, avoid OpenSSL PEM decoders by extracting EC private scalar (d) from PEM and importing as JWK into Node crypto.

JWT Requirements (from docs)
- Header:
  - `alg`: ES256
  - `kid`: API Key ID (recommended). If absent, use the Key Name.
  - `typ`: JWT
- Payload:
  - `iss`: cdp
  - `sub`: API Key Name (e.g., organizations/.../apiKeys/KEY_ID)
  - `nbf`: current epoch seconds
  - `exp`: `nbf + 120` seconds
  - `uri`: "<METHOD> <PATH>" (e.g., `GET /api/v3/brokerage/accounts`)
  - `aud`: `api.coinbase.com`

Decisions
- Always use the local proxy for signing in development and by default in production. This avoids WebCrypto availability issues and secures the private key off the browser.
- Accept SEC1 in the UI but immediately convert to PKCS#8 in the signer to avoid OpenSSL 3 decoder issues.
- Prefer `jsonwebtoken` for Node signing to match common JS samples; ensure header and payload are set exactly.

Implementation Plan
1) Proxy signer
   - Input: `{ keyName, keyId?, privateKey, method, path, payload? }`
   - Extract EC private scalar d from SEC1 or PKCS#8 using minimal ASN.1.
   - Import as JWK into Node crypto (`createPrivateKey({ format: 'jwk' })`).
   - Build claims and protected header per docs.
   - Sign with ES256 via `jsonwebtoken` and forward to Coinbase.
2) Client library
   - Route requests to same-origin `/proxy` during dev (Vite proxy → localhost:8787).
   - Optional `VITE_PROXY_URL` to override proxy endpoint.
   - Provide UI for Key Name, Key ID (optional), and Private Key (EC or PKCS#8).
3) Robust PEM handling
   - Tolerant parsing for clipboard artifacts (NBSP, fullwidth chars, etc.).
   - Convert SEC1 → PKCS#8 with ASN.1 wrapper for P-256.
4) Docs & validation
   - README: proxy usage, environment configuration, and verification steps.
   - Add concise diagnostics if auth fails (status code and Coinbase message).
   - Add proxy DEBUG mode to log sanitized JWT header/payload and the exact signed `uri`.

Verification Steps
- Start dev: `npm run dev` and `npm run proxy`.
- Settings → paste API Key Name, Key ID (optional), Private Key (EC or PKCS#8).
- Test Connection → expect success; if failure, capture proxy 4xx/5xx body.
- Place a small test call: `GET /api/v3/brokerage/accounts`.
 - Enable debug if needed: `DEBUG_COINBASE=1 npm run proxy` to log header/payload and upstream responses (no secrets).

Open Questions
- Some tenants may require a different `aud`. Defaulting to `api.coinbase.com` per docs; make configurable if needed.

Changelog (keep this updated)
- [v1] Initial plan, proxy-first signing, SEC1 support, client wiring.
