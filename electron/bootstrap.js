/**
 * First-Run Bootstrap Service
 * 
 * Ministry of Foreign Affairs (MoFA), Ghana - HR Leave Portal
 * 
 * Handles automatic first-run initialization:
 * - Detects first run per OS user
 * - Creates encrypted SQLite database
 * - Runs schema migrations
 * - Seeds static data (leave types, holidays, policies)
 * - Initializes sync metadata
 * - Initializes audit logging
 * 
 * Requirements:
 * - Idempotent (safe to run multiple times)
 * - No user interaction required
 * - No admin rights required
 * - Recovers from partial/failed setup
 * - Logs all bootstrap steps for audit
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { getEncryptedDatabase } = require('./database-encrypted');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

// Initialize paths after app is ready
let BOOTSTRAP_FLAG_FILE = null;
let BOOTSTRAP_LOG_FILE = null;

function initializePaths() {
  if (!BOOTSTRAP_FLAG_FILE) {
    BOOTSTRAP_FLAG_FILE = path.join(app.getPath('userData'), '.bootstrap-complete');
    BOOTSTRAP_LOG_FILE = path.join(app.getPath('userData'), 'bootstrap.log');
  }
}

/**
 * Check if bootstrap has been completed
 * 
 * @returns {boolean} True if bootstrap is complete
 */
function isBootstrapComplete() {
  try {
    initializePaths();
    return fs.existsSync(BOOTSTRAP_FLAG_FILE);
  } catch (error) {
    logger.warn(`[Bootstrap] Error checking bootstrap status: ${error.message}`);
    return false;
  }
}

/**
 * Mark bootstrap as complete
 */
function markBootstrapComplete() {
  try {
    initializePaths();
    const timestamp = new Date().toISOString();
    fs.writeFileSync(BOOTSTRAP_FLAG_FILE, JSON.stringify({
      completed: true,
      timestamp,
      version: '1.0.0'
    }), { mode: 0o600 });
    logger.info('[Bootstrap] Bootstrap marked as complete');
  } catch (error) {
    logger.error(`[Bootstrap] Error marking bootstrap complete: ${error.message}`);
    throw error;
  }
}

/**
 * Log bootstrap step
 */
function logBootstrapStep(step, status, details = null) {
  initializePaths();
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    step,
    status,
    details
  };
  
  try {
    const logDir = path.dirname(BOOTSTRAP_LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(BOOTSTRAP_LOG_FILE, logLine, { mode: 0o644 });
  } catch (error) {
    // Fallback to console if file logging fails
    console.error(`[Bootstrap] Failed to log step: ${error.message}`);
  }
  
  logger.info(`[Bootstrap] ${step}: ${status}${details ? ` - ${JSON.stringify(details)}` : ''}`);
}

/**
 * Seed leave types (static reference data)
 */
function seedLeaveTypes(db) {
  logBootstrapStep('seed-leave-types', 'starting');
  
  try {
    const leaveTypes = [
      {
        id: uuidv4(),
        code: 'ANNUAL',
        name: 'Annual Leave',
        description: 'Annual vacation leave',
        maxDays: 30,
        requiresApproval: true,
        accrualType: 'monthly',
        canCarryForward: true,
        maxCarryForward: 10,
        active: true
      },
      {
        id: uuidv4(),
        code: 'SICK',
        name: 'Sick Leave',
        description: 'Medical leave for illness',
        maxDays: 15,
        requiresApproval: true,
        accrualType: 'monthly',
        canCarryForward: true,
        maxCarryForward: 5,
        active: true
      },
      {
        id: uuidv4(),
        code: 'UNPAID',
        name: 'Unpaid Leave',
        description: 'Leave without pay',
        maxDays: null, // No limit
        requiresApproval: true,
        accrualType: 'none',
        canCarryForward: false,
        active: true
      },
      {
        id: uuidv4(),
        code: 'SPECIAL_SERVICE',
        name: 'Special Service Leave',
        description: 'Leave for special government service',
        maxDays: 7,
        requiresApproval: true,
        accrualType: 'annual',
        canCarryForward: false,
        active: true
      },
      {
        id: uuidv4(),
        code: 'TRAINING',
        name: 'Training Leave',
        description: 'Leave for training and development',
        maxDays: 10,
        requiresApproval: true,
        accrualType: 'annual',
        canCarryForward: false,
        active: true
      },
      {
        id: uuidv4(),
        code: 'STUDY',
        name: 'Study Leave',
        description: 'Leave for academic studies',
        maxDays: 30,
        requiresApproval: true,
        accrualType: 'annual',
        canCarryForward: false,
        active: true
      },
      {
        id: uuidv4(),
        code: 'MATERNITY',
        name: 'Maternity Leave',
        description: 'Maternity leave for female staff',
        maxDays: 90,
        requiresApproval: true,
        accrualType: 'none',
        canCarryForward: false,
        active: true
      },
      {
        id: uuidv4(),
        code: 'PATERNITY',
        name: 'Paternity Leave',
        description: 'Paternity leave for male staff',
        maxDays: 7,
        requiresApproval: true,
        accrualType: 'none',
        canCarryForward: false,
        active: true
      },
      {
        id: uuidv4(),
        code: 'COMPASSIONATE',
        name: 'Compassionate Leave',
        description: 'Leave for bereavement',
        maxDays: 5,
        requiresApproval: true,
        accrualType: 'none',
        canCarryForward: false,
        active: true
      }
    ];

    // Check if leave_types table exists (from schema)
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='leave_types'
    `).get();

    if (!tableExists) {
      // Create leave_types table if it doesn't exist
      db.exec(`
        CREATE TABLE IF NOT EXISTS leave_types (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          max_days INTEGER,
          requires_approval INTEGER NOT NULL DEFAULT 1,
          accrual_type TEXT NOT NULL DEFAULT 'monthly',
          can_carry_forward INTEGER NOT NULL DEFAULT 0,
          max_carry_forward INTEGER,
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
          updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        )
      `);
    }

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO leave_types (
        id, code, name, description, max_days, requires_approval,
        accrual_type, can_carry_forward, max_carry_forward, active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((types) => {
      for (const type of types) {
        insertStmt.run(
          type.id,
          type.code,
          type.name,
          type.description,
          type.maxDays,
          type.requiresApproval ? 1 : 0,
          type.accrualType,
          type.canCarryForward ? 1 : 0,
          type.maxCarryForward,
          type.active ? 1 : 0,
          new Date().toISOString(),
          new Date().toISOString()
        );
      }
    });

    transaction(leaveTypes);
    
    const count = db.prepare('SELECT COUNT(*) as count FROM leave_types').get().count;
    logBootstrapStep('seed-leave-types', 'completed', { count });
  } catch (error) {
    logBootstrapStep('seed-leave-types', 'failed', { error: error.message });
    throw error;
  }
}

/**
 * Seed holidays (Ghana public holidays for current year)
 */
function seedHolidays(db) {
  logBootstrapStep('seed-holidays', 'starting');
  
  try {
    const currentYear = new Date().getFullYear();
    
    // Ghana public holidays (fixed dates)
    const holidays = [
      { name: 'New Year\'s Day', date: `${currentYear}-01-01`, type: 'public' },
      { name: 'Independence Day', date: `${currentYear}-03-06`, type: 'public' },
      { name: 'Good Friday', date: getGoodFriday(currentYear), type: 'public' },
      { name: 'Easter Monday', date: getEasterMonday(currentYear), type: 'public' },
      { name: 'Labour Day', date: `${currentYear}-05-01`, type: 'public' },
      { name: 'Eid al-Fitr', date: getEidAlFitr(currentYear), type: 'public' }, // Approximate
      { name: 'Eid al-Adha', date: getEidAlAdha(currentYear), type: 'public' }, // Approximate
      { name: 'Founders\' Day', date: `${currentYear}-08-04`, type: 'public' },
      { name: 'Kwame Nkrumah Memorial Day', date: `${currentYear}-09-21`, type: 'public' },
      { name: 'Farmers\' Day', date: getFarmersDay(currentYear), type: 'public' },
      { name: 'Christmas Day', date: `${currentYear}-12-25`, type: 'public' },
      { name: 'Boxing Day', date: `${currentYear}-12-26`, type: 'public' }
    ];

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO holidays (id, name, date, type, description, sync_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((holidayList) => {
      for (const holiday of holidayList) {
        insertStmt.run(
          uuidv4(),
          holiday.name,
          holiday.date,
          holiday.type,
          `Ghana public holiday - ${holiday.name}`,
          'synced',
          new Date().toISOString(),
          new Date().toISOString()
        );
      }
    });

    transaction(holidays);
    
    const count = db.prepare('SELECT COUNT(*) as count FROM holidays WHERE date LIKE ?').get(`${currentYear}%`).count;
    logBootstrapStep('seed-holidays', 'completed', { count, year: currentYear });
  } catch (error) {
    logBootstrapStep('seed-holidays', 'failed', { error: error.message });
    throw error;
  }
}

/**
 * Calculate Good Friday (Easter - 2 days)
 */
function getGoodFriday(year) {
  const easter = getEaster(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  return formatDate(goodFriday);
}

/**
 * Calculate Easter Monday (Easter + 1 day)
 */
function getEasterMonday(year) {
  const easter = getEaster(year);
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  return formatDate(easterMonday);
}

/**
 * Calculate Easter Sunday (using algorithm)
 */
function getEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Get Eid al-Fitr (approximate - actual date varies by lunar calendar)
 */
function getEidAlFitr(year) {
  // Approximate: early May (varies by year)
  // In production, this should be synced from server
  return `${year}-05-03`; // Placeholder
}

/**
 * Get Eid al-Adha (approximate - actual date varies by lunar calendar)
 */
function getEidAlAdha(year) {
  // Approximate: mid-July (varies by year)
  // In production, this should be synced from server
  return `${year}-07-10`; // Placeholder
}

/**
 * Get Farmers' Day (first Friday in December)
 */
function getFarmersDay(year) {
  const dec1 = new Date(year, 11, 1);
  const dayOfWeek = dec1.getDay();
  const daysToAdd = dayOfWeek <= 5 ? (5 - dayOfWeek) : (12 - dayOfWeek);
  const farmersDay = new Date(dec1);
  farmersDay.setDate(dec1.getDate() + daysToAdd);
  return formatDate(farmersDay);
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Seed policy versions (leave policy metadata)
 */
function seedPolicyVersions(db) {
  logBootstrapStep('seed-policy-versions', 'starting');
  
  try {
    // Check if policy_versions table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='policy_versions'
    `).get();

    if (!tableExists) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS policy_versions (
          id TEXT PRIMARY KEY,
          version TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          effective_date TEXT NOT NULL,
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
          updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        )
      `);
    }

    const currentDate = new Date().toISOString().split('T')[0];
    const policyVersion = {
      id: uuidv4(),
      version: '1.0.0',
      name: 'MoFA HR Leave Policy v1.0',
      description: 'Initial leave policy for Ministry of Foreign Affairs, Ghana',
      effectiveDate: currentDate,
      active: true
    };

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO policy_versions (
        id, version, name, description, effective_date, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      policyVersion.id,
      policyVersion.version,
      policyVersion.name,
      policyVersion.description,
      policyVersion.effectiveDate,
      policyVersion.active ? 1 : 0,
      new Date().toISOString(),
      new Date().toISOString()
    );

    logBootstrapStep('seed-policy-versions', 'completed', { version: policyVersion.version });
  } catch (error) {
    logBootstrapStep('seed-policy-versions', 'failed', { error: error.message });
    throw error;
  }
}

/**
 * Initialize sync metadata
 */
function initializeSyncMetadata(db) {
  logBootstrapStep('initialize-sync-metadata', 'starting');
  
  try {
    // Ensure sync_metadata table exists (should be from migration)
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO sync_metadata (key, value, updated_at)
      VALUES (?, ?, ?)
    `);

    const now = new Date().toISOString();
    const metadata = [
      ['last_sync_at', '1970-01-01T00:00:00Z', now],
      ['sync_schema_version', '1', now],
      ['last_full_sync_at', '1970-01-01T00:00:00Z', now],
      ['sync_enabled', 'true', now],
      ['conflict_resolution_strategy', 'server_wins', now],
      ['bootstrap_completed_at', now, now]
    ];

    const transaction = db.transaction((items) => {
      for (const [key, value, updatedAt] of items) {
        insertStmt.run(key, value, updatedAt);
      }
    });

    transaction(metadata);
    
    logBootstrapStep('initialize-sync-metadata', 'completed', { count: metadata.length });
  } catch (error) {
    logBootstrapStep('initialize-sync-metadata', 'failed', { error: error.message });
    throw error;
  }
}

/**
 * Verify database integrity
 */
function verifyDatabaseIntegrity(db) {
  logBootstrapStep('verify-database-integrity', 'starting');
  
  try {
    // Run integrity check
    const integrityCheck = db.pragma('integrity_check');
    
    if (integrityCheck && integrityCheck.length > 0 && integrityCheck[0].integrity_check !== 'ok') {
      throw new Error(`Database integrity check failed: ${integrityCheck[0].integrity_check}`);
    }

    // Verify critical tables exist
    const requiredTables = [
      'employees',
      'leave_requests',
      'leave_balances',
      'holidays',
      'audit_logs',
      'sync_queue',
      'sync_metadata',
      'local_sessions'
    ];

    const missingTables = [];
    for (const table of requiredTables) {
      const exists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `).get(table);
      
      if (!exists) {
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
    }

    logBootstrapStep('verify-database-integrity', 'completed', { 
      integrity: 'ok',
      tables: requiredTables.length 
    });
  } catch (error) {
    logBootstrapStep('verify-database-integrity', 'failed', { error: error.message });
    throw error;
  }
}

/**
 * Run bootstrap process
 * 
 * @returns {Object} Bootstrap result
 */
function runBootstrap() {
  logBootstrapStep('bootstrap-start', 'starting');
  
  // Check if already completed
  if (isBootstrapComplete()) {
    logBootstrapStep('bootstrap-check', 'skipped', { reason: 'already_complete' });
    return {
      success: true,
      skipped: true,
      message: 'Bootstrap already completed'
    };
  }

  try {
    // Get database instance (will be initialized if needed)
    const db = getEncryptedDatabase();
    
    // Verify database integrity
    verifyDatabaseIntegrity(db);
    
    // Initialize sync metadata
    initializeSyncMetadata(db);
    
    // Seed static data
    seedLeaveTypes(db);
    seedHolidays(db);
    seedPolicyVersions(db);
    
    // Mark bootstrap as complete
    markBootstrapComplete();
    
    logBootstrapStep('bootstrap-complete', 'completed');
    
    return {
      success: true,
      skipped: false,
      message: 'Bootstrap completed successfully'
    };
  } catch (error) {
    logBootstrapStep('bootstrap-error', 'failed', { error: error.message, stack: error.stack });
    
    // Don't mark as complete on error - allow retry
    return {
      success: false,
      skipped: false,
      error: error.message,
      message: 'Bootstrap failed - will retry on next launch'
    };
  }
}

/**
 * Reset bootstrap (for testing/recovery)
 * WARNING: This deletes the bootstrap flag - use with caution
 */
function resetBootstrap() {
  try {
    initializePaths();
    if (fs.existsSync(BOOTSTRAP_FLAG_FILE)) {
      fs.unlinkSync(BOOTSTRAP_FLAG_FILE);
      logger.warn('[Bootstrap] Bootstrap flag reset - will run on next launch');
    }
  } catch (error) {
    logger.error(`[Bootstrap] Error resetting bootstrap: ${error.message}`);
    throw error;
  }
}

module.exports = {
  runBootstrap,
  isBootstrapComplete,
  resetBootstrap,
  logBootstrapStep
};

