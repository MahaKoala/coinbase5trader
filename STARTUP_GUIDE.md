# Quick Start Guide

## Prerequisites
- Python 3.8+ installed
- Node.js 18+ installed (for frontend)
- Coinbase API credentials (Key Name, Key ID, Private Key)

## Step 1: Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install Python backend dependencies
cd server-python
pip install -r requirements.txt
cd ..
```

## Step 2: Set Environment Variables
Create `.env.local` in the project root:
```bash
# Coinbase API Credentials
COINBASE_KEY_NAME=organizations/YOUR_ORG_ID/apiKeys/YOUR_KEY_NAME
COINBASE_KEY_ID=YOUR_KEY_ID  # Optional but recommended
COINBASE_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END EC PRIVATE KEY-----"

# Optional: Debug mode
DEBUG_COINBASE=true
```

## Step 3: Start the Servers

### Option A: Development Mode (Recommended)
```bash
# Terminal 1: Start Python backend
npm run proxy

# Terminal 2: Start frontend
npm run dev
```

### Option B: Production Mode
```bash
# Build frontend
npm run build

# Start Python backend
npm run proxy

# Serve built frontend
npm run preview
```

## Step 4: Verify Setup
1. Open http://localhost:5173 (dev) or http://localhost:4173 (preview)
2. Go to Settings → API Configuration
3. Enter your Coinbase credentials
4. Test connection with "Test API Connection" button

## Available Commands
```bash
npm run proxy          # Start Python backend server
npm run mcp            # Start Python MCP server
npm run dev            # Start frontend dev server
npm run build          # Build frontend for production
npm run preview        # Preview production build
npm run lint           # Run ESLint
```

## Server Details
- **Backend**: Python FastAPI on port 8787
- **Frontend**: Vite dev server on port 5173
- **Health Check**: http://localhost:8787/health
- **API Proxy**: http://localhost:8787/proxy

## Troubleshooting
- **Port 8787 in use**: Kill existing process or change `PORT` in `.env.local`
- **CORS issues**: Ensure backend is running before accessing frontend
- **API errors**: Check credentials in `.env.local` and enable `DEBUG_COINBASE=true`