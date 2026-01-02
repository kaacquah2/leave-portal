/**
 * Token Expiry Enforcement Service
 * 
 * Ministry of Foreign Affairs (MoFA), Ghana - HR Leave Portal
 * 
 * Enforces strict token expiry with automatic lockout:
 * - Monitors session expiration
 * - Automatically locks app on token expiry
 * - Prevents offline access after expiry
 * - Shows clear messages to users
 * - Requires internet for re-authentication
 * 
 * Security Features:
 * - No token reuse
 * - No privilege escalation
 * - Immediate lockout on expiry
 * - Device-bound enforcement
 * 
 * @version 1.0.0
 */

const { getCurrentSession, isSessionExpired, deleteSession } = require('./offline-session');
const logger = require('./logger');
const { app, BrowserWindow } = require('electron');

let expiryCheckInterval = null;
let isLocked = false;

/**
 * Check if app should be locked due to token expiry
 * 
 * @returns {boolean} True if app should be locked
 */
function shouldLockApp() {
  const session = getCurrentSession();
  
  if (!session) {
    return true; // No session = locked
  }

  if (isSessionExpired()) {
    return true; // Expired session = locked
  }

  // Check if session expires within next minute (proactive lock)
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  const timeUntilExpiry = expiresAt.getTime() - now.getTime();
  
  // Lock if expires within 60 seconds
  if (timeUntilExpiry <= 60000) {
    return true;
  }

  return false;
}

/**
 * Lock the application
 * 
 * @param {string} reason - Reason for lockout
 */
function lockApp(reason = 'Token expired') {
  if (isLocked) {
    return; // Already locked
  }

  isLocked = true;
  logger.warn(`[TokenExpiry] App locked: ${reason}`);

  // Delete expired session
  deleteSession();

  // Notify all windows
  const windows = BrowserWindow.getAllWindows();
  for (const window of windows) {
    if (window && !window.isDestroyed()) {
      window.webContents.send('app:token-expired', {
        reason,
        timestamp: new Date().toISOString(),
        requiresInternet: true
      });
    }
  }

  // Log audit event
  try {
    const { getEncryptedDatabase } = require('./database-encrypted');
    const db = getEncryptedDatabase();
    const { v4: uuidv4 } = require('uuid');
    
    db.prepare(`
      INSERT INTO audit_logs (
        id, action, user, user_role, details, sync_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'token_expired_lockout',
      'system',
      'system',
      JSON.stringify({ reason, timestamp: new Date().toISOString() }),
      'pending',
      new Date().toISOString()
    );
  } catch (error) {
    logger.error(`[TokenExpiry] Error logging lockout: ${error.message}`);
  }
}

/**
 * Unlock the application (after successful re-authentication)
 */
function unlockApp() {
  if (!isLocked) {
    return; // Not locked
  }

  isLocked = false;
  logger.info('[TokenExpiry] App unlocked after re-authentication');

  // Notify all windows
  const windows = BrowserWindow.getAllWindows();
  for (const window of windows) {
    if (window && !window.isDestroyed()) {
      window.webContents.send('app:token-refreshed', {
        timestamp: new Date().toISOString()
      });
    }
  }
}

/**
 * Check if app is currently locked
 * 
 * @returns {boolean} True if app is locked
 */
function isAppLocked() {
  return isLocked;
}

/**
 * Start expiry monitoring
 * Checks every 30 seconds for token expiry
 */
function startExpiryMonitoring() {
  if (expiryCheckInterval) {
    return; // Already monitoring
  }

  logger.info('[TokenExpiry] Starting token expiry monitoring');

  // Check immediately
  checkExpiry();

  // Then check every 30 seconds
  expiryCheckInterval = setInterval(() => {
    checkExpiry();
  }, 30000); // 30 seconds
}

/**
 * Stop expiry monitoring
 */
function stopExpiryMonitoring() {
  if (expiryCheckInterval) {
    clearInterval(expiryCheckInterval);
    expiryCheckInterval = null;
    logger.info('[TokenExpiry] Stopped token expiry monitoring');
  }
}

/**
 * Check token expiry and lock if needed
 */
function checkExpiry() {
  try {
    if (shouldLockApp()) {
      if (!isLocked) {
        lockApp('Token expired - internet connection required for re-authentication');
      }
    } else {
      // Token is valid - ensure app is unlocked
      if (isLocked) {
        // Don't auto-unlock - requires re-authentication
        logger.warn('[TokenExpiry] App is locked but token check passed - manual unlock required');
      }
    }
  } catch (error) {
    logger.error(`[TokenExpiry] Error checking expiry: ${error.message}`);
  }
}

/**
 * Validate token before allowing operation
 * 
 * @param {string} operation - Operation name for logging
 * @returns {boolean} True if token is valid and operation allowed
 */
function validateTokenForOperation(operation) {
  if (isLocked) {
    logger.warn(`[TokenExpiry] Operation blocked: ${operation} - app is locked`);
    return false;
  }

  if (shouldLockApp()) {
    lockApp('Token expired during operation');
    logger.warn(`[TokenExpiry] Operation blocked: ${operation} - token expired`);
    return false;
  }

  return true;
}

/**
 * Get token expiry information
 * 
 * @returns {Object} Token expiry info
 */
function getTokenExpiryInfo() {
  const session = getCurrentSession();
  
  if (!session) {
    return {
      hasSession: false,
      isExpired: true,
      expiresAt: null,
      timeRemainingSeconds: 0,
      isLocked: isLocked
    };
  }

  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  const timeRemaining = Math.max(0, expiresAt.getTime() - now.getTime());

  return {
    hasSession: true,
    isExpired: now > expiresAt,
    expiresAt: session.expiresAt,
    timeRemainingSeconds: Math.floor(timeRemaining / 1000),
    timeRemainingMinutes: Math.floor(timeRemaining / 60000),
    isLocked: isLocked
  };
}

/**
 * Handle app ready - start monitoring
 */
app.once('ready', () => {
  // Start monitoring after a short delay to allow initialization
  setTimeout(() => {
    startExpiryMonitoring();
  }, 5000); // 5 seconds after app ready
});

/**
 * Handle app before-quit - stop monitoring
 */
app.once('before-quit', () => {
  stopExpiryMonitoring();
});

module.exports = {
  lockApp,
  unlockApp,
  isAppLocked,
  startExpiryMonitoring,
  stopExpiryMonitoring,
  checkExpiry,
  validateTokenForOperation,
  getTokenExpiryInfo,
  shouldLockApp
};

