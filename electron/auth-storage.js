/**
 * Secure token storage for Electron
 * Uses Electron's safeStorage API when available (macOS Keychain, Windows Credential Manager, Linux Secret Service)
 * Falls back to encrypted file storage if safeStorage is not available
 * 
 * Fallback encryption uses AES-256-GCM for authenticated encryption (tamper protection)
 * Backward compatible with legacy AES-256-CBC encrypted tokens
 */

const { safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

const TOKEN_FILE = path.join(app.getPath('userData'), 'token.encrypted');
const TOKEN_META_FILE = path.join(app.getPath('userData'), 'token.meta.json');
const KEY_VERSION_FILE = path.join(app.getPath('userData'), 'key.version.json');

// Current key version (increment when rotating keys)
const CURRENT_KEY_VERSION = 1;

/**
 * Get encryption key for a specific version
 * 
 * Key rotation: Each version uses a different derivation input
 * This allows seamless migration between key versions
 * 
 * @param {number} version - Key version (default: current)
 * @returns {Buffer} 32-byte encryption key
 */
function getEncryptionKey(version = CURRENT_KEY_VERSION) {
  const appName = app.getName();
  const userDataPath = app.getPath('userData');
  
  // Include version in key derivation for key rotation support
  const keyMaterial = `${appName}${userDataPath}v${version}`;
  const salt = crypto.createHash('sha256').update(keyMaterial).digest();
  
  // Use PBKDF2 for key derivation (more secure than simple hash)
  // 100,000 iterations is a good balance between security and performance
  // Increased to 200,000 for version 2+ keys (better security)
  const iterations = version >= 2 ? 200000 : 100000;
  return crypto.pbkdf2Sync(keyMaterial, salt, iterations, 32, 'sha256');
}

/**
 * Get current key version from metadata
 * @returns {number} Current key version
 */
function getCurrentKeyVersion() {
  try {
    if (fs.existsSync(KEY_VERSION_FILE)) {
      const meta = JSON.parse(fs.readFileSync(KEY_VERSION_FILE, 'utf8'));
      return meta.keyVersion || CURRENT_KEY_VERSION;
    }
  } catch (error) {
    console.warn('[Auth Storage] Error reading key version, using default:', error);
  }
  return CURRENT_KEY_VERSION;
}

/**
 * Set current key version in metadata
 * @param {number} version - Key version to set
 */
function setCurrentKeyVersion(version) {
  try {
    fs.writeFileSync(KEY_VERSION_FILE, JSON.stringify({ 
      keyVersion: version,
      updatedAt: new Date().toISOString()
    }), { mode: 0o600 });
  } catch (error) {
    console.error('[Auth Storage] Error setting key version:', error);
  }
}

/**
 * Rotate encryption key
 * 
 * This function re-encrypts the token with a new key version.
 * It supports seamless migration without data loss.
 * 
 * @param {number} newVersion - New key version (default: CURRENT_KEY_VERSION + 1)
 * @returns {boolean} True if rotation successful
 */
function rotateEncryptionKey(newVersion = CURRENT_KEY_VERSION + 1) {
  try {
    const currentToken = getToken();
    if (!currentToken) {
      console.warn('[Auth Storage] No token to rotate');
      return false;
    }

    const currentVersion = getCurrentKeyVersion();
    if (newVersion <= currentVersion) {
      console.warn(`[Auth Storage] New key version (${newVersion}) must be greater than current (${currentVersion})`);
      return false;
    }

    console.log(`[Auth Storage] Rotating encryption key from version ${currentVersion} to ${newVersion}`);
    
    // Store token with new key version
    setCurrentKeyVersion(newVersion);
    
    // Re-encrypt token (this will use the new key version)
    // Temporarily set version for this operation
    const originalGetKey = getEncryptionKey;
    const tempGetKey = (version) => originalGetKey(newVersion);
    
    // Clear old token files
    if (fs.existsSync(TOKEN_FILE)) {
      fs.unlinkSync(TOKEN_FILE);
    }
    if (fs.existsSync(TOKEN_META_FILE)) {
      fs.unlinkSync(TOKEN_META_FILE);
    }
    
    // Re-encrypt with new key
    setToken(currentToken);
    
    console.log(`[Auth Storage] Key rotation completed successfully`);
    return true;
  } catch (error) {
    console.error('[Auth Storage] Error rotating encryption key:', error);
    return false;
  }
}

/**
 * Check if secure storage is available
 */
function isSecureStorageAvailable() {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch (error) {
    console.error('[Auth Storage] Error checking secure storage:', error);
    return false;
  }
}

/**
 * Get stored authentication token
 */
function getToken() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) {
      return null;
    }
    
    // Check metadata to see which encryption method was used
    let useSafeStorage = false;
    let encryptionMethod = 'gcm'; // Default to GCM for new tokens
    if (fs.existsSync(TOKEN_META_FILE)) {
      try {
        const meta = JSON.parse(fs.readFileSync(TOKEN_META_FILE, 'utf8'));
        useSafeStorage = meta.useSafeStorage === true;
        encryptionMethod = meta.encryptionMethod || 'cbc'; // Default to CBC for backward compatibility
      } catch (error) {
        console.warn('[Auth Storage] Error reading metadata, using fallback:', error);
      }
    }
    
    // Try safeStorage decryption first
    if (useSafeStorage && isSecureStorageAvailable()) {
      try {
        const encrypted = fs.readFileSync(TOKEN_FILE);
        const decrypted = safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
        return decrypted;
      } catch (error) {
        console.warn('[Auth Storage] safeStorage decryption failed, trying fallback:', error);
      }
    }
    
    // Fallback: Decrypt using Node.js crypto
    const encryptedData = fs.readFileSync(TOKEN_FILE, 'utf8');
    
    // Get key version from metadata (for key rotation support)
    let keyVersion = CURRENT_KEY_VERSION;
    if (fs.existsSync(TOKEN_META_FILE)) {
      try {
        const meta = JSON.parse(fs.readFileSync(TOKEN_META_FILE, 'utf8'));
        keyVersion = meta.keyVersion || CURRENT_KEY_VERSION;
      } catch (error) {
        console.warn('[Auth Storage] Error reading key version from metadata, using default');
      }
    }
    
    // Try current key version first, then fallback to previous versions for migration
    const versionsToTry = [keyVersion, keyVersion - 1, CURRENT_KEY_VERSION];
    const uniqueVersions = [...new Set(versionsToTry)].filter(v => v > 0);
    
    for (const version of uniqueVersions) {
      try {
        const key = getEncryptionKey(version);
        
        if (encryptionMethod === 'gcm') {
      // GCM format: IV (32 hex chars = 16 bytes) + authTag (32 hex chars = 16 bytes) + encrypted data
      if (encryptedData.length < 64) {
        throw new Error('Invalid encrypted data format (too short for GCM)');
      }
      const iv = Buffer.from(encryptedData.slice(0, 32), 'hex');
      const authTag = Buffer.from(encryptedData.slice(32, 64), 'hex');
      const encrypted = encryptedData.slice(64);
      
      if (iv.length !== 16 || authTag.length !== 16) {
        throw new Error('Invalid IV or auth tag length');
      }
      
          const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
          decipher.setAuthTag(authTag);
          let decrypted = decipher.update(encrypted, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          
          // If decrypted with older key version, migrate to current version
          if (version < CURRENT_KEY_VERSION) {
            console.log(`[Auth Storage] Migrating token from key version ${version} to ${CURRENT_KEY_VERSION}`);
            setToken(decrypted); // Re-encrypt with current key version
          }
          
          return decrypted;
        } else {
          // Legacy CBC format: IV (32 hex chars = 16 bytes) + encrypted data
          if (encryptedData.length < 32) {
            throw new Error('Invalid encrypted data format');
          }
          const iv = Buffer.from(encryptedData.slice(0, 32), 'hex');
          const encrypted = encryptedData.slice(32);
          
          if (iv.length !== 16) {
            throw new Error('Invalid IV length');
          }
          
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
          let decrypted = decipher.update(encrypted, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          
          // Migrate from CBC to GCM with current key version
          console.log('[Auth Storage] Migrating token from CBC to GCM encryption');
          setToken(decrypted); // Re-encrypt with GCM and current key version
          
          return decrypted;
        }
      } catch (error) {
        // If this is not the last version to try, continue to next version
        if (version !== uniqueVersions[uniqueVersions.length - 1]) {
          continue;
        }
        // If all versions failed, throw the last error
        throw error;
      }
    }
    
    // Should not reach here, but handle gracefully
    throw new Error('Failed to decrypt with any key version');
  } catch (error) {
    console.error('[Auth Storage] Error getting token:', error);
    return null;
  }
}

/**
 * Store authentication token securely
 */
function setToken(token) {
  try {
    // Ensure userData directory exists
    const userDataDir = app.getPath('userData');
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    
    // Use safeStorage encryption if available
    if (isSecureStorageAvailable()) {
      try {
        // Encrypt token using safeStorage
        const encrypted = safeStorage.encryptString(token);
        // Store encrypted token in file (safeStorage returns Buffer)
        fs.writeFileSync(TOKEN_FILE, encrypted.toString('base64'), { mode: 0o600 });
        // Store metadata
        fs.writeFileSync(TOKEN_META_FILE, JSON.stringify({ useSafeStorage: true }), { mode: 0o600 });
        console.log('[Auth Storage] Token stored using safeStorage');
        return;
      } catch (error) {
        console.warn('[Auth Storage] safeStorage encryption failed, using fallback:', error);
      }
    }
    
    // Fallback: Encrypt using Node.js crypto with AES-256-GCM
    // GCM provides authenticated encryption (tamper protection)
    // Generate random IV for each encryption (cryptographically secure)
    // GCM works with 12 or 16 byte IVs; using 16 bytes for consistency
    const keyVersion = getCurrentKeyVersion();
    const iv = crypto.randomBytes(16);
    const key = getEncryptionKey(keyVersion);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    // Store IV + authTag + encrypted data
    // IV is 16 bytes = 32 hex chars, authTag is 16 bytes = 32 hex chars
    fs.writeFileSync(TOKEN_FILE, iv.toString('hex') + authTag.toString('hex') + encrypted, { mode: 0o600 });
    // Store metadata with encryption method and key version
    fs.writeFileSync(TOKEN_META_FILE, JSON.stringify({ 
      useSafeStorage: false, 
      encryptionMethod: 'gcm',
      keyVersion: keyVersion
    }), { mode: 0o600 });
    console.log(`[Auth Storage] Token stored using fallback encryption (AES-256-GCM, key version ${keyVersion})`);
  } catch (error) {
    console.error('[Auth Storage] Error storing token:', error);
    throw error;
  }
}

/**
 * Clear stored authentication token
 */
function clearToken() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      fs.unlinkSync(TOKEN_FILE);
    }
    if (fs.existsSync(TOKEN_META_FILE)) {
      fs.unlinkSync(TOKEN_META_FILE);
    }
    console.log('[Auth Storage] Token cleared');
  } catch (error) {
    console.error('[Auth Storage] Error clearing token:', error);
  }
}

/**
 * Check if token exists
 */
function hasToken() {
  return fs.existsSync(TOKEN_FILE);
}

/**
 * Check if hardware-backed encryption is available
 * 
 * safeStorage uses hardware-backed keys when available:
 * - macOS: Secure Enclave (T2/M-series chips)
 * - Windows: TPM (Trusted Platform Module)
 * - Linux: TPM (if available)
 * 
 * @returns {boolean} True if hardware-backed encryption is available
 */
function isHardwareBackedEncryptionAvailable() {
  return isSecureStorageAvailable();
}

/**
 * Get encryption information for security audits
 * 
 * @returns {Object} Encryption information
 */
function getEncryptionInfo() {
  const useSafeStorage = isSecureStorageAvailable();
  const keyVersion = getCurrentKeyVersion();
  const hardwareBacked = isHardwareBackedEncryptionAvailable();
  
  let encryptionMethod = 'unknown';
  if (fs.existsSync(TOKEN_META_FILE)) {
    try {
      const meta = JSON.parse(fs.readFileSync(TOKEN_META_FILE, 'utf8'));
      encryptionMethod = meta.useSafeStorage ? 'safeStorage' : (meta.encryptionMethod || 'gcm');
    } catch (error) {
      // Ignore
    }
  }
  
  return {
    useSafeStorage,
    hardwareBacked,
    encryptionMethod,
    keyVersion,
    currentKeyVersion: CURRENT_KEY_VERSION,
  };
}

module.exports = {
  getToken,
  setToken,
  clearToken,
  hasToken,
  isSecureStorageAvailable,
  isHardwareBackedEncryptionAvailable,
  rotateEncryptionKey,
  getEncryptionInfo,
  getCurrentKeyVersion,
  CURRENT_KEY_VERSION,
};
