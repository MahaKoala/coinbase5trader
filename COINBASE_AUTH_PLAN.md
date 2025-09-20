# Coinbase API Key Authentication — Plan & Tracking

Source of truth:
- Coinbase docs: https://docs.cdp.coinbase.com/coinbase-app/authentication-authorization/api-key-authentication#javascript

Goals
- Implement JWT (ES256/ECDSA P-256) per Coinbase spec for API Key authentication.
- Support both SEC1 (EC PRIVATE KEY) and PKCS#8 (PRIVATE KEY) PEM inputs from the UI.
- **MIGRATED**: Sign requests reliably via Python backend using official Coinbase SDK (avoids browser WebCrypto/CORS issues) and keep claims/header exactly as documented.
- **MIGRATED**: Use official Coinbase SDK for robust authentication and API communication.

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
- **MIGRATED**: Always use the Python backend for authentication in development and by default in production. This avoids WebCrypto availability issues, secures the private key off the browser, and leverages the official Coinbase SDK.
- **MIGRATED**: Accept SEC1 in the UI but now handled by official Coinbase SDK which supports both formats natively.
- **MIGRATED**: Use official `coinbase-advanced-py` SDK for reliable authentication and API communication.

Implementation Plan (COMPLETED)
1) **COMPLETED** Python backend with official SDK
   - Input: `{ keyName, keyId?, privateKey, method, path, payload? }`
   - Use official Coinbase SDK (`coinbase-advanced-py`) for authentication
   - SDK handles JWT signing, PEM parsing, and API communication automatically
   - FastAPI framework with CORS support and health checks
2) **COMPLETED** Client library
   - Route requests to same-origin `/proxy` during dev (Vite proxy → localhost:8787).
   - Optional `VITE_PROXY_URL` to override proxy endpoint.
   - Provide UI for Key Name, Key ID (optional), and Private Key (EC or PKCS#8).
3) **COMPLETED** Robust PEM handling
   - Official Coinbase SDK handles all PEM formats natively
   - No need for custom ASN.1 parsing or format conversion
4) **COMPLETED** Docs & validation
   - README: Python backend usage, environment configuration, and verification steps.
   - Add concise diagnostics if auth fails (status code and Coinbase message).
   - Python backend DEBUG mode to log API requests and responses (no secrets).

Verification Steps (UPDATED)
- Start dev: `npm run dev` and `npm run proxy`.
- Settings → paste API Key Name, Key ID (optional), Private Key (EC or PKCS#8).
- **MIGRATION COMPLETED**: All Node.js server files removed, Python backend is now the default.
- Test Connection → expect success; if failure, capture Python backend 4xx/5xx body.
- Place a small test call: `GET /api/v3/brokerage/accounts`.
 - Enable debug if needed: `DEBUG_COINBASE=1 npm run proxy-python` to log API requests and responses (no secrets).

Open Questions
- Some tenants may require a different `aud`. Defaulting to `api.coinbase.com` per docs; handled automatically by official SDK.

Changelog (keep this updated)
- [v1] Initial plan, proxy-first signing, SEC1 support, client wiring.
- [v2] **MIGRATION COMPLETED**: Migrated from Node.js proxy to Python backend with official Coinbase SDK for improved reliability and maintainability.
