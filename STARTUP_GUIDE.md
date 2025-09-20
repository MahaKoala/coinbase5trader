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

## Step 2: API Key Management (No File Storage Required!)

**NEW: Secure Session-Based Key Management**
- API keys are now stored in browser session memory only
- No `.env.local` file needed for API credentials
- Keys are automatically cleared when browser closes
- Optional auto-clear after 30 minutes of inactivity
- Encrypted storage for additional security

**To configure API keys:**
1. Start the application
2. Click "Settings" in the header
3. Enter your Coinbase credentials in the dialog:
   - **API Key Name**: `organizations/YOUR_ORG_ID/apiKeys/YOUR_KEY_NAME`
   - **Key ID** (optional): Your key ID
   - **Private Key**: Your EC or PKCS#8 private key with BEGIN/END markers
4. Click "Test Connection" to verify credentials
5. Click "Save Keys" to store securely in session

**Optional Environment Variables** (create `.env.local` if needed):
```bash
# Optional: Debug mode for backend
DEBUG_COINBASE=true

# Optional: Custom backend port (default: 8787)
PORT=8787
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
2. Click "Settings" in the header
3. Enter your Coinbase credentials in the API dialog
4. Click "Test Connection" to verify credentials work
5. Click "Save Keys" to store securely in session memory
6. Check header shows "API Connected" with masked key name

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
- **API errors**: Verify credentials format and enable `DEBUG_COINBASE=true`
- **Keys not persisting**: This is normal! Keys are session-only for security
- **Connection issues**: Check that backend is running with `npm run proxy`
- **Invalid credentials**: Ensure key name format is correct and private key includes BEGIN/END markers