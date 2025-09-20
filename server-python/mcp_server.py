"""
Coinbase MCP Server in Python
Replaces the Node.js MCP server with Python implementation
"""

import asyncio
import json
import os
import sys
from typing import Dict, Any, Optional
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv('../.env.local')
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
DEBUG = os.getenv("DEBUG_COINBASE", "1") == "1" or os.getenv("DEBUG_COINBASE", "false").lower() == "true"
COINBASE_KEY_NAME = os.getenv("COINBASE_KEY_NAME")
COINBASE_KEY_ID = os.getenv("COINBASE_KEY_ID")
COINBASE_PRIVATE_KEY = os.getenv("COINBASE_PRIVATE_KEY")

class CoinbaseMCPServer:
    """Coinbase MCP Server implementation"""
    
    def __init__(self):
        self.client = None
        self.initialize_client()
    
    def initialize_client(self):
        """Initialize Coinbase client"""
        try:
            from coinbase.rest import RESTClient
            
            if not COINBASE_KEY_NAME or not COINBASE_PRIVATE_KEY:
                logger.warning("Missing COINBASE_KEY_NAME or COINBASE_PRIVATE_KEY environment variables - client will be initialized on demand")
                return
            
            self.client = RESTClient(
                api_key=COINBASE_KEY_ID,
                api_secret=COINBASE_PRIVATE_KEY
            )
            
            if DEBUG:
                logger.info("Coinbase MCP client initialized successfully")
                
        except Exception as e:
            logger.error(f"Failed to initialize Coinbase client: {str(e)}")
            # Don't raise - allow server to start and initialize client later
    
    async def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle MCP request"""
        
        try:
            method = request.get('method')
            params = request.get('params', {})
            
            if DEBUG:
                logger.info(f"Received MCP request: {method}")
            
            # Route to appropriate method
            if method == 'coinbase_get_accounts':
                return await self.get_accounts(params)
            elif method == 'coinbase_get_product_ticker':
                return await self.get_product_ticker(params)
            elif method == 'coinbase_place_order':
                return await self.place_order(params)
            else:
                return {
                    'error': f'Unknown method: {method}',
                    'id': request.get('id')
                }
                
        except Exception as e:
            logger.error(f"MCP request failed: {str(e)}")
            return {
                'error': str(e),
                'id': request.get('id')
            }
    
    async def get_accounts(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get brokerage accounts"""
        
        try:
            # Lazy initialize client if needed
            if not self.client:
                self.initialize_client()
                if not self.client:
                    raise ValueError("Coinbase client not initialized - check environment variables")
            
            result = self.client.get_accounts()
            
            # Convert response to dict if it's not already
            if hasattr(result, '__dict__'):
                result_dict = result.__dict__
                # Handle nested objects that might not be JSON serializable
                if 'accounts' in result_dict and hasattr(result_dict['accounts'], '__iter__'):
                    result_dict['accounts'] = [account.__dict__ if hasattr(account, '__dict__') else account for account in result_dict['accounts']]
            else:
                result_dict = result
            
            if DEBUG:
                accounts_count = len(result_dict.get('accounts', [])) if isinstance(result_dict, dict) else 0
                logger.info(f"Retrieved {accounts_count} accounts")
            
            return {
                'result': result_dict,
                'id': params.get('id')
            }
            
        except Exception as e:
            return {
                'error': f"Failed to get accounts: {str(e)}",
                'id': params.get('id')
            }
    
    async def get_product_ticker(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get product ticker"""
        
        try:
            # Lazy initialize client if needed
            if not self.client:
                self.initialize_client()
                if not self.client:
                    raise ValueError("Coinbase client not initialized - check environment variables")
            
            product_id = params.get('product_id')
            if not product_id:
                raise ValueError("product_id is required")
            
            result = self.client.get_public_product(product_id)
            
            # Convert response to dict if it's not already
            if hasattr(result, '__dict__'):
                result_dict = result.__dict__
            else:
                result_dict = result
            
            if DEBUG:
                logger.info(f"Retrieved ticker for {product_id}")
            
            return {
                'result': result_dict,
                'id': params.get('id')
            }
            
        except Exception as e:
            return {
                'error': f"Failed to get product ticker: {str(e)}",
                'id': params.get('id')
            }
    
    async def place_order(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Place an order"""
        
        try:
            # Lazy initialize client if needed
            if not self.client:
                self.initialize_client()
                if not self.client:
                    raise ValueError("Coinbase client not initialized - check environment variables")
            
            # Validate required parameters
            required_fields = ['product_id', 'side', 'type', 'amount']
            for field in required_fields:
                if field not in params:
                    raise ValueError(f"{field} is required")
            
            product_id = params['product_id']
            side = params['side'].upper()
            order_type = params['type'].upper()
            amount = params['amount']
            price = params.get('price')
            
            # Validate side and type
            if side not in ['BUY', 'SELL']:
                raise ValueError("side must be 'BUY' or 'SELL'")
            if order_type not in ['MARKET', 'LIMIT']:
                raise ValueError("type must be 'MARKET' or 'LIMIT'")
            
            # Build order configuration
            order_config = {
                'client_order_id': f"order_{int(asyncio.get_event_loop().time())}",
                'product_id': product_id,
                'side': side
            }
            
            if order_type == 'MARKET':
                order_config['order_configuration'] = {
                    'market_market_ioc': {
                        'quote_size': amount
                    }
                }
            else:  # LIMIT
                if not price:
                    raise ValueError("price is required for limit orders")
                order_config['order_configuration'] = {
                    'limit_limit_gtc': {
                        'base_size': amount,
                        'limit_price': price
                    }
                }
            
            result = self.client.create_order(order_config)
            
            # Convert response to dict if it's not already
            if hasattr(result, '__dict__'):
                result_dict = result.__dict__
            else:
                result_dict = result
            
            if DEBUG:
                logger.info(f"Placed {side} order for {product_id}")
            
            return {
                'result': result_dict,
                'id': params.get('id')
            }
            
        except Exception as e:
            return {
                'error': f"Failed to place order: {str(e)}",
                'id': params.get('id')
            }

async def main():
    """Main MCP server loop"""
    
    try:
        server = CoinbaseMCPServer()
        
        if DEBUG:
            logger.info("Coinbase MCP server started")
        
        # Simple stdio communication
        while True:
            try:
                # Read request from stdin
                line = await asyncio.get_event_loop().run_in_executor(
                    None, sys.stdin.readline
                )
                
                if not line:
                    break
                
                # Parse JSON request
                request = json.loads(line.strip())
                
                # Handle request
                response = await server.handle_request(request)
                
                # Send response to stdout
                print(json.dumps(response))
                sys.stdout.flush()
                
            except json.JSONDecodeError as e:
                error_response = {
                    'error': f'Invalid JSON: {str(e)}',
                    'id': None
                }
                print(json.dumps(error_response))
                sys.stdout.flush()
                
            except Exception as e:
                error_response = {
                    'error': f'Server error: {str(e)}',
                    'id': None
                }
                print(json.dumps(error_response))
                sys.stdout.flush()
                
    except KeyboardInterrupt:
        if DEBUG:
            logger.info("MCP server stopped by user")
    except Exception as e:
        logger.error(f"MCP server failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())