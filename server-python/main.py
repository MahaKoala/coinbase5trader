"""
FastAPI backend for Coinbase Advanced Trade API
Replaces the Node.js proxy with Python implementation using official SDK
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import os
import json
from typing import Optional, Dict, Any
import logging
from datetime import datetime
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Coinbase Advanced Trade API Backend", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
PORT = int(os.getenv("PORT", "8787"))
DEBUG = os.getenv("DEBUG_COINBASE", "1") == "1" or os.getenv("DEBUG_COINBASE", "false").lower() == "true"
COINBASE_KEY_NAME = os.getenv("COINBASE_KEY_NAME")
COINBASE_KEY_ID = os.getenv("COINBASE_KEY_ID")
COINBASE_PRIVATE_KEY = os.getenv("COINBASE_PRIVATE_KEY")

class CoinbaseAPIClient:
    """Handles Coinbase API requests using official SDK"""
    
    def __init__(self):
        self.client = None
    
    def get_client(self, key_name: str, private_key: str, key_id: Optional[str] = None):
        """Get configured Coinbase client"""
        try:
            from coinbase.rest import RESTClient
            
            # Create client with credentials
            self.client = RESTClient(
                api_key=key_id,
                api_secret=private_key
            )
            
            if DEBUG:
                logger.info(f"Coinbase client initialized for key: {key_name}")
            
            return self.client
            
        except Exception as e:
            logger.error(f"Failed to initialize Coinbase client: {str(e)}")
            raise ValueError(f"Failed to initialize Coinbase client: {str(e)}")
    
    async def make_request(
        self,
        method: str,
        path: str,
        key_name: str,
        private_key: str,
        key_id: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make authenticated request to Coinbase API using SDK"""
        
        try:
            # Get client
            client = self.get_client(key_name, private_key, key_id)
            
            if DEBUG:
                logger.info(f"Making {method} request to {path}")
            
            # Map common endpoints to SDK methods
            if path == '/api/v3/brokerage/accounts' and method.upper() == 'GET':
                result = client.get_accounts()
            elif path.startswith('/api/v3/brokerage/products/') and path.endswith('/ticker') and method.upper() == 'GET':
                product_id = path.split('/')[-2]
                result = client.get_public_product(product_id)
            elif path == '/api/v3/brokerage/orders' and method.upper() == 'POST':
                result = client.create_order(payload)
            elif path == '/api/v3/brokerage/orders' and method.upper() == 'GET':
                result = client.list_orders()
            else:
                # For unsupported endpoints, return error
                return {
                    'error': f'Endpoint {method} {path} not yet implemented in Python backend'
                }
            
            # Convert response to dict if it's not already
            if hasattr(result, '__dict__'):
                result = result.__dict__
            
            if DEBUG:
                logger.info(f"API request successful")
            
            return result
            
        except Exception as e:
            logger.error(f"Coinbase API request failed: {str(e)}")
            return {'error': str(e)}

# Initialize API client
api_client = CoinbaseAPIClient()

@app.post("/proxy")
async def proxy_request(request: Request):
    """Proxy endpoint for Coinbase API requests"""
    
    try:
        # Parse request body
        body = await request.json()
        
        # Extract parameters
        key_name = body.get('keyName') or COINBASE_KEY_NAME
        key_id = body.get('keyId') or COINBASE_KEY_ID
        private_key = body.get('privateKey') or COINBASE_PRIVATE_KEY
        method = body.get('method')
        path = body.get('path')
        payload = body.get('payload')
        
        # Validate required parameters
        if not all([key_name, private_key, method, path]):
            raise HTTPException(
                status_code=400,
                detail="Missing required fields: keyName, privateKey, method, path"
            )
        
        # Ensure required parameters are not None
        if key_name is None:
            raise HTTPException(status_code=400, detail="keyName is required")
        if private_key is None:
            raise HTTPException(status_code=400, detail="privateKey is required")
        
        # Normalize path
        if not path.startswith('/'):
            path = f'/{path}'
        
        if DEBUG:
            logger.info(f"Proxying request: {method} {path}")
        
        # Make API request
        result = await api_client.make_request(
            method=method,
            path=path,
            key_name=key_name,
            private_key=private_key,
            key_id=key_id,
            payload=payload
        )
        
        # Check for errors
        if 'error' in result:
            status_code = 500
            if 'Coinbase API error' in result['error']:
                # Extract status code from error message
                match = re.search(r'error (\d+)', result['error'])
                if match:
                    status_code = int(match.group(1))
            
            raise HTTPException(
                status_code=status_code,
                detail=result
            )
        
        return result
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in request body")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Proxy request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Coinbase Advanced Trade API Backend",
        "version": "1.0.0",
        "endpoints": ["/proxy", "/health"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=DEBUG,
        log_level="info" if DEBUG else "warning"
    )