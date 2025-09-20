#!/usr/bin/env python3
"""
Startup script for Coinbase Advanced Trade API Python backend
"""

import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')
load_dotenv()

# Configuration
PORT = int(os.getenv("PORT", "8787"))
DEBUG = os.getenv("DEBUG_COINBASE", "1") == "1" or os.getenv("DEBUG_COINBASE", "false").lower() == "true"

if __name__ == "__main__":
    print(f"Starting Coinbase Advanced Trade API Python backend on port {PORT}")
    print(f"Debug mode: {DEBUG}")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=DEBUG,
        log_level="info" if DEBUG else "warning"
    )