// JWT Authentication utility for Coinbase Advanced Trade API
// Uses ES256 (ECDSA with P-256 curve) as required by Coinbase
import { SignJWT, importPKCS8 } from 'jose';

export interface CoinbaseCredentials {
  keyName: string;
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
    // Import the private key (expects PKCS#8 format)
    const cryptoKey = await importPKCS8(privateKey, 'ES256');
    
    // Create and sign the JWT
    const jwt = await new SignJWT({
      iss: 'cdp',
      nbf: now,
      exp: now + 120, // Expires in 2 minutes as required by Coinbase
      sub: keyName,
      uri: `${requestMethod} api.coinbase.com${requestPath}`
    })
      .setProtectedHeader({
        alg: 'ES256',
        kid: keyName,
        typ: 'JWT'
      })
      .sign(cryptoKey);

    return jwt;
  } catch (error) {
    console.error('JWT generation failed:', error);
    throw new Error('Failed to generate JWT token. Please check that your private key is in PKCS#8 format.');
  }
};

// Function to make authenticated requests to Coinbase API
export const makeCoinbaseRequest = async (
  credentials: CoinbaseCredentials,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: any
): Promise<any> => {
  try {
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