# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/eea62d46-d140-481b-8027-f438532f20bc

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/eea62d46-d140-481b-8027-f438532f20bc) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/eea62d46-d140-481b-8027-f438532f20bc) and click on Share -> Publish.

## Coinbase API local proxy (recommended)

For secure, reliable JWT signing and to avoid browser WebCrypto/CORS limitations, run the local proxy:

```sh
npm run proxy  # starts http://localhost:8787
```

The frontend now routes Coinbase requests through this proxy by default for correct JWT handling and to keep your private key off the browser. To specify a custom URL, set `VITE_PROXY_URL`.

Environment configuration (proxy and MCP read .env.local automatically):

Create `.env.local` in project root (already added in this repo):

```
COINBASE_KEY_NAME="organizations/.../apiKeys/<KEY_ID>"
COINBASE_KEY_ID="<KEY_ID>"
COINBASE_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"
DEBUG_COINBASE="1"
```

The proxy will use these when the client does not send credentials in the request body.

JWT structure (per Coinbase docs):
- Header: `alg` ES256, `kid` Key ID (or Key Name), `typ` JWT
- Payload: `iss` cdp, `sub` Key Name, `nbf` now, `exp` now+120s, `aud` api.coinbase.com, `uri` "<METHOD> <PATH>"

Settings expects:
- API Key Name: `organizations/.../apiKeys/<KEY_ID>`
- Key ID (optional but preferred): `<KEY_ID>` (used for JWT `kid`)
- Private Key: paste EC (SEC1) or PKCS#8 PEM

## Coinbase MCP Server (optional)

Run a local MCP server providing Coinbase tools for agents.

Install dependencies (see docs):

```sh
npm i -D @modelcontextprotocol/sdk jsonwebtoken
```

Set env vars:

```sh
export COINBASE_KEY_NAME="organizations/.../apiKeys/<KEY_ID>"
export COINBASE_KEY_ID="<KEY_ID>"   # optional
export COINBASE_PRIVATE_KEY="$(cat /path/to/your/private_key.pem)"
```

Start the server (stdio transport):

```sh
npm run mcp
```

Tools exposed:
- `coinbase_get_accounts`
- `coinbase_get_product_ticker` (input: `{ "product_id": "BTC-USD" }`)
- `coinbase_place_order` (inputs: `product_id`, `side`, `type`, `amount`, optional `price`)

See https://docs.cdp.coinbase.com/mcp for integrating this MCP server with your agent runtime.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
