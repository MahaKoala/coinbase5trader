// Secure API Key Manager - No file storage, no hardcoding
// Uses session storage with encryption for temporary key management

import { CoinbaseCredentials } from './coinbase-api';

const STORAGE_KEY = 'coinbase_encrypted_credentials';
const ENCRYPTION_KEY = 'coinbase_secure_session_key';

// Simple encryption for session storage (not for production use)
// In production, consider using Web Crypto API with proper key management
class SimpleEncryption {
  private static getKey(): string {
    return ENCRYPTION_KEY;
  }

  static encrypt(data: string): string {
    try {
      // Simple XOR-based obfuscation for demo purposes
      // In production, use proper encryption like Web Crypto API
      const key = this.getKey();
      let encrypted = '';
      for (let i = 0; i < data.length; i++) {
        encrypted += String.fromCharCode(
          data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return btoa(encrypted);
    } catch (error) {
      console.error('Encryption failed:', error);
      return '';
    }
  }

  static decrypt(encryptedData: string): string {
    try {
      const key = this.getKey();
      const decoded = atob(encryptedData);
      let decrypted = '';
      for (let i = 0; i < decoded.length; i++) {
        decrypted += String.fromCharCode(
          decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }
}

export class SecureKeyManager {
  // Store credentials encrypted in session storage (cleared when browser closes)
  static storeCredentials(credentials: CoinbaseCredentials): void {
    try {
      const encryptedData = SimpleEncryption.encrypt(JSON.stringify(credentials));
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEY, encryptedData);
      }
    } catch (error) {
      console.error('Failed to store credentials:', error);
      throw new Error('Unable to securely store API credentials');
    }
  }

  // Retrieve and decrypt credentials from session storage
  static getCredentials(): CoinbaseCredentials | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }
      
      const encryptedData = sessionStorage.getItem(STORAGE_KEY);
      if (!encryptedData) {
        return null;
      }

      const decryptedData = SimpleEncryption.decrypt(encryptedData);
      const credentials = JSON.parse(decryptedData);
      
      // Validate credentials structure
      if (!credentials.keyName || !credentials.privateKey) {
        throw new Error('Invalid credentials format');
      }

      return credentials;
    } catch (error) {
      console.error('Failed to retrieve credentials:', error);
      this.clearCredentials();
      return null;
    }
  }

  // Clear stored credentials
  static clearCredentials(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  // Check if credentials are stored
  static hasCredentials(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return sessionStorage.getItem(STORAGE_KEY) !== null;
  }

  // Validate credentials format
  static validateCredentials(credentials: Partial<CoinbaseCredentials>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!credentials.keyName) {
      errors.push('API Key Name is required');
    } else if (!credentials.keyName.includes('organizations/') || !credentials.keyName.includes('/apiKeys/')) {
      errors.push('API Key Name must be in format: organizations/ORG_ID/apiKeys/KEY_NAME');
    }

    if (!credentials.privateKey) {
      errors.push('Private Key is required');
    } else {
      const keyTrimmed = credentials.privateKey.trim();
      if (!keyTrimmed.includes('BEGIN') || !keyTrimmed.includes('END')) {
        errors.push('Private Key must include BEGIN and END markers');
      }
      if (!keyTrimmed.includes('PRIVATE KEY')) {
        errors.push('Private Key must be a valid PEM format (EC PRIVATE KEY or PRIVATE KEY)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get masked key name for display (security)
  static getMaskedKeyName(credentials: CoinbaseCredentials | null): string {
    if (!credentials || !credentials.keyName) {
      return 'Not configured';
    }

    try {
      const parts = credentials.keyName.split('/');
      if (parts.length >= 4) {
        const orgId = parts[1];
        const keyId = parts[parts.length - 1];
        
        // Mask the organization ID and show partial key ID
        const maskedOrg = orgId.length > 8 ? 
          orgId.substring(0, 4) + '****' + orgId.substring(orgId.length - 4) : 
          '****';
        
        const maskedKey = keyId.length > 8 ? 
          keyId.substring(0, 4) + '****' + keyId.substring(keyId.length - 4) : 
          '****';
        
        return `organizations/${maskedOrg}/apiKeys/${maskedKey}`;
      }
      
      // Fallback: mask the entire string
      return credentials.keyName.length > 16 ? 
        credentials.keyName.substring(0, 8) + '****' + credentials.keyName.substring(credentials.keyName.length - 8) :
        '****';
    } catch (error) {
      return '****';
    }
  }

  // Check if session is active (credentials exist and are valid)
  static isSessionActive(): boolean {
    try {
      const credentials = this.getCredentials();
      if (!credentials) {
        return false;
      }
      
      const validation = this.validateCredentials(credentials);
      return validation.isValid;
    } catch (error) {
      return false;
    }
  }

  // Auto-clear credentials after inactivity (optional security feature)
  static setupAutoClear(timeoutMinutes: number = 30): () => void {
    let timeoutId: NodeJS.Timeout;
    
    const resetTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        this.clearCredentials();
        console.log('Credentials cleared due to inactivity');
      }, timeoutMinutes * 60 * 1000);
    };

    // Set up event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    if (typeof window !== 'undefined') {
      events.forEach(event => {
        window.addEventListener(event, resetTimeout, { passive: true });
      });
      
      // Initial timeout
      resetTimeout();
    }

    // Return cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (typeof window !== 'undefined') {
        events.forEach(event => {
          window.removeEventListener(event, resetTimeout);
        });
      }
    };
  }
}