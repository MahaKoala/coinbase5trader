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
    console.log('Attempting JWT generation with key:', keyName);
    console.log('Private key format check:', privateKey.substring(0, 50) + '...');
    
    // Handle different private key formats
    let cryptoKey: CryptoKey;
    
    if (privateKey.includes('BEGIN EC PRIVATE KEY')) {
      console.log('Detected EC PRIVATE KEY format, converting...');
      
      // For EC private keys, we need to convert to PKCS#8 format
      // This is a more robust conversion
      const cleanKey = privateKey
        .replace(/-----BEGIN EC PRIVATE KEY-----/g, '')
        .replace(/-----END EC PRIVATE KEY-----/g, '')
        .replace(/\s/g, '');
      
      console.log('Cleaned key length:', cleanKey.length);
      
      // Create PKCS#8 wrapper for EC P-256 private key
      const pkcs8Header = 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg';
      const pkcs8Key = `-----BEGIN PRIVATE KEY-----
${pkcs8Header}${cleanKey.substring(14)}
-----END PRIVATE KEY-----`;
      
      console.log('Converted PKCS#8 key preview:', pkcs8Key.substring(0, 100) + '...');
      cryptoKey = await importPKCS8(pkcs8Key, 'ES256');
      
    } else if (privateKey.includes('BEGIN PRIVATE KEY')) {
      console.log('Detected PKCS#8 format');
      cryptoKey = await importPKCS8(privateKey, 'ES256');
    } else {
      throw new Error('Unsupported private key format. Expected EC PRIVATE KEY or PRIVATE KEY format.');
    }
    
    console.log('Successfully imported private key');
    
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

    console.log('JWT generated successfully');
    return jwt;
  } catch (error) {
    console.error('JWT generation failed with error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
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