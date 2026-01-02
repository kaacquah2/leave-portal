/**
 * Offline Session Management
 * 
 * Handles device-bound offline sessions with token-based authentication
 * NO password storage offline - only tokens
 * Enforces session expiration and device binding
 * 
 * Security Features:
 * - Device-bound sessions (cannot be transferred)
 * - Session expiration enforcement
 * - Automatic logout on expiry
 * - Token hashing (not plain storage)
 */

const { getEncryptedDatabase } = require('./database-encrypted');
const crypto = require('crypto');
const { app } = require('electron');

/**
 * Get device ID (unique per device)
 */
function getDeviceId() {
  // Use machine ID + app userData path for uniqueness
  const machineId = require('os').hostname();
  const userDataPath = app.getPath('userData');
  const deviceMaterial = `${machineId}${userDataPath}`;
  return crypto.createHash('sha256').update(deviceMaterial).digest('hex').substring(0, 32);
}

/**
 * Hash token for storage
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create offline session
 * 
 * @param {string} userId - User ID from server
 * @param {string} email - User email
 * @param {string} role - User role
 * @param {string} staffId - Optional staff ID
 * @param {string} token - Authentication token
 * @param {number} expiresInSeconds - Session expiration in seconds (default: 30 minutes)
 * @returns {Object} Session object
 */
function createSession(userId, email, role, staffId, token, expiresInSeconds = 1800) {
  const db = getEncryptedDatabase();
  const { v4: uuidv4 } = require('uuid');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);
  const deviceId = getDeviceId();
  const tokenHash = hashToken(token);

  // Delete any existing sessions for this user on this device
  db.prepare('DELETE FROM local_sessions WHERE user_id = ? AND device_id = ?').run(userId, deviceId);

  // Create new session
  const stmt = db.prepare(`
    INSERT INTO local_sessions (
      id, user_id, email, role, staff_id, token_hash, device_id,
      expires_at, last_activity, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    uuidv4(),
    userId,
    email,
    role,
    staffId || null,
    tokenHash,
    deviceId,
    expiresAt.toISOString(),
    now.toISOString(),
    now.toISOString()
  );

  return {
    userId,
    email,
    role,
    staffId,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Get current session
 * 
 * @returns {Object | null} Session object or null if no valid session
 */
function getCurrentSession() {
  const db = getEncryptedDatabase();
  const deviceId = getDeviceId();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    SELECT * FROM local_sessions
    WHERE device_id = ? AND expires_at > ?
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const session = stmt.get(deviceId, now);

  if (!session) {
    return null;
  }

  // Update last activity
  db.prepare('UPDATE local_sessions SET last_activity = ? WHERE id = ?').run(now, session.id);

  return {
    userId: session.user_id,
    email: session.email,
    role: session.role,
    staffId: session.staff_id,
    expiresAt: session.expires_at,
    lastActivity: session.last_activity,
  };
}

/**
 * Validate session
 * 
 * @param {string} token - Authentication token to validate
 * @returns {boolean} True if session is valid
 */
function validateSession(token) {
  const session = getCurrentSession();
  if (!session) {
    return false;
  }

  const tokenHash = hashToken(token);
  const db = getEncryptedDatabase();
  const stmt = db.prepare('SELECT token_hash FROM local_sessions WHERE user_id = ? AND device_id = ?');
  const stored = stmt.get(session.userId, getDeviceId());

  if (!stored || stored.token_hash !== tokenHash) {
    return false;
  }

  // Check expiration
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  if (now > expiresAt) {
    deleteSession();
    return false;
  }

  return true;
}

/**
 * Update session activity
 */
function updateActivity() {
  const session = getCurrentSession();
  if (!session) {
    return false;
  }

  const db = getEncryptedDatabase();
  const now = new Date().toISOString();
  db.prepare('UPDATE local_sessions SET last_activity = ? WHERE user_id = ? AND device_id = ?').run(
    now,
    session.userId,
    getDeviceId()
  );

  return true;
}

/**
 * Delete session (logout)
 */
function deleteSession() {
  const db = getEncryptedDatabase();
  const deviceId = getDeviceId();
  db.prepare('DELETE FROM local_sessions WHERE device_id = ?').run(deviceId);
}

/**
 * Check if session is expired
 */
function isSessionExpired() {
  const session = getCurrentSession();
  if (!session) {
    return true;
  }

  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  return now > expiresAt;
}

/**
 * Cleanup expired sessions
 */
function cleanupExpiredSessions() {
  const db = getEncryptedDatabase();
  const now = new Date().toISOString();
  const result = db.prepare('DELETE FROM local_sessions WHERE expires_at <= ?').run(now);
  return result.changes;
}

/**
 * Get session info (for UI)
 */
function getSessionInfo() {
  const session = getCurrentSession();
  if (!session) {
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  const timeRemaining = Math.max(0, expiresAt.getTime() - now.getTime());

  return {
    ...session,
    isExpired: now > expiresAt,
    timeRemainingSeconds: Math.floor(timeRemaining / 1000),
    timeRemainingMinutes: Math.floor(timeRemaining / 60000),
  };
}

// Cleanup expired sessions on startup
setInterval(() => {
  cleanupExpiredSessions();
}, 60000); // Every minute

module.exports = {
  createSession,
  getCurrentSession,
  validateSession,
  updateActivity,
  deleteSession,
  isSessionExpired,
  cleanupExpiredSessions,
  getSessionInfo,
  getDeviceId,
};

