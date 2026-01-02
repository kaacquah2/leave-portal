/**
 * Local SQLite Database for Offline Data Storage
 * 
 * This module provides a local SQLite database for storing data offline
 * and syncing with the remote server when online.
 * 
 * Database Location: app.getPath('userData')/database.sqlite
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;
let dbPath = null;

/**
 * Initialize the database
 */
function initDatabase() {
  if (db) {
    return db;
  }

  try {
    // Get user data directory
    const userDataPath = app.getPath('userData');
    dbPath = path.join(userDataPath, 'database.sqlite');
    
    // Ensure directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    // Open or create database
    db = new Database(dbPath);
    
    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    
    // Create tables
    createTables();
    
    console.log('[Database] Initialized SQLite database at:', dbPath);
    return db;
  } catch (error) {
    console.error('[Database] Error initializing database:', error);
    throw error;
  }
}

/**
 * Create all necessary tables
 */
function createTables() {
  // Sync queue table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
      record_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      retries INTEGER DEFAULT 0,
      last_error TEXT
    )
  `);

  // Sync metadata table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // StaffMember table (mirrors remote schema)
  db.exec(`
    CREATE TABLE IF NOT EXISTS StaffMember (
      id TEXT PRIMARY KEY,
      staffId TEXT UNIQUE NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      department TEXT NOT NULL,
      position TEXT NOT NULL,
      grade TEXT NOT NULL,
      level TEXT NOT NULL,
      rank TEXT,
      step TEXT,
      directorate TEXT,
      division TEXT,
      unit TEXT,
      dutyStation TEXT,
      photoUrl TEXT,
      active INTEGER DEFAULT 1,
      employmentStatus TEXT DEFAULT 'active',
      terminationDate TEXT,
      terminationReason TEXT,
      joinDate TEXT NOT NULL,
      confirmationDate TEXT,
      managerId TEXT,
      immediateSupervisorId TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      synced_at TEXT
    )
  `);

  // LeaveRequest table
  db.exec(`
    CREATE TABLE IF NOT EXISTS LeaveRequest (
      id TEXT PRIMARY KEY,
      staffId TEXT NOT NULL,
      staffName TEXT NOT NULL,
      leaveType TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      days INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      approvedBy TEXT,
      approvalDate TEXT,
      templateId TEXT,
      approvalLevels TEXT,
      officerTakingOver TEXT,
      handoverNotes TEXT,
      declarationAccepted INTEGER DEFAULT 0,
      payrollImpactFlag INTEGER DEFAULT 0,
      locked INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      synced_at TEXT,
      FOREIGN KEY (staffId) REFERENCES StaffMember(staffId)
    )
  `);

  // LeaveBalance table
  db.exec(`
    CREATE TABLE IF NOT EXISTS LeaveBalance (
      id TEXT PRIMARY KEY,
      staffId TEXT UNIQUE NOT NULL,
      annual REAL DEFAULT 0,
      sick REAL DEFAULT 0,
      unpaid REAL DEFAULT 0,
      specialService REAL DEFAULT 0,
      training REAL DEFAULT 0,
      study REAL DEFAULT 0,
      maternity REAL DEFAULT 0,
      paternity REAL DEFAULT 0,
      compassionate REAL DEFAULT 0,
      annualCarryForward REAL DEFAULT 0,
      sickCarryForward REAL DEFAULT 0,
      specialServiceCarryForward REAL DEFAULT 0,
      trainingCarryForward REAL DEFAULT 0,
      studyCarryForward REAL DEFAULT 0,
      lastAccrualDate TEXT,
      accrualPeriod TEXT,
      annualExpiresAt TEXT,
      sickExpiresAt TEXT,
      specialServiceExpiresAt TEXT,
      trainingExpiresAt TEXT,
      studyExpiresAt TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      synced_at TEXT,
      FOREIGN KEY (staffId) REFERENCES StaffMember(staffId)
    )
  `);

  // Holiday table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Holiday (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      recurring INTEGER DEFAULT 0,
      year INTEGER,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      synced_at TEXT
    )
  `);

  // LeaveRequestTemplate table
  db.exec(`
    CREATE TABLE IF NOT EXISTS LeaveRequestTemplate (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      leaveType TEXT NOT NULL,
      defaultDays INTEGER NOT NULL,
      defaultReason TEXT NOT NULL,
      department TEXT,
      active INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      synced_at TEXT
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_table_name ON sync_queue(table_name);
    CREATE INDEX IF NOT EXISTS idx_staff_member_staff_id ON StaffMember(staffId);
    CREATE INDEX IF NOT EXISTS idx_leave_request_staff_id ON LeaveRequest(staffId);
    CREATE INDEX IF NOT EXISTS idx_leave_request_status ON LeaveRequest(status);
    CREATE INDEX IF NOT EXISTS idx_leave_balance_staff_id ON LeaveBalance(staffId);
  `);

  console.log('[Database] Tables created successfully');
}

/**
 * Get database instance (initialize if needed)
 */
function getDatabase() {
  if (!db) {
    initDatabase();
  }
  return db;
}

/**
 * Add item to sync queue
 */
function addToSyncQueue(tableName, operation, recordId, payload) {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT INTO sync_queue (table_name, operation, record_id, payload)
    VALUES (?, ?, ?, ?)
  `);
  
  const result = stmt.run(tableName, operation, recordId, JSON.stringify(payload));
  return result.lastInsertRowid;
}

/**
 * Get sync queue items
 */
function getSyncQueue(limit = 50) {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT * FROM sync_queue
    ORDER BY created_at ASC
    LIMIT ?
  `);
  
  return stmt.all(limit).map(row => ({
    id: row.id,
    table_name: row.table_name,
    operation: row.operation,
    record_id: row.record_id,
    payload: row.payload,
    created_at: row.created_at,
    retries: row.retries || 0,
    last_error: row.last_error
  }));
}

/**
 * Remove item from sync queue
 */
function removeFromSyncQueue(id) {
  const database = getDatabase();
  const stmt = database.prepare('DELETE FROM sync_queue WHERE id = ?');
  stmt.run(id);
}

/**
 * Increment retry count for sync queue item
 */
function incrementSyncQueueRetry(id, error) {
  const database = getDatabase();
  const stmt = database.prepare(`
    UPDATE sync_queue
    SET retries = retries + 1,
        last_error = ?
    WHERE id = ?
  `);
  stmt.run(error, id);
}

/**
 * Get last sync time
 */
function getLastSyncTime() {
  const database = getDatabase();
  const stmt = database.prepare('SELECT value FROM sync_metadata WHERE key = ?');
  const row = stmt.get('last_sync_time');
  return row ? row.value : null;
}

/**
 * Set last sync time
 */
function setLastSyncTime(timestamp) {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
    VALUES ('last_sync_time', ?, datetime('now'))
  `);
  stmt.run(timestamp);
}

/**
 * Mark record as synced
 */
function markSynced(tableName, recordId) {
  const database = getDatabase();
  try {
    const stmt = database.prepare(`
      UPDATE ${tableName}
      SET synced = 1, synced_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(recordId);
  } catch (error) {
    console.warn(`[Database] Could not mark ${tableName}.${recordId} as synced:`, error.message);
  }
}

/**
 * Insert or update record in table
 */
function upsertRecord(tableName, record) {
  const database = getDatabase();
  const columns = Object.keys(record);
  const values = Object.values(record);
  const placeholders = values.map(() => '?').join(', ');
  
  // Build INSERT ... ON CONFLICT UPDATE query
  const updateClause = columns
    .filter(col => col !== 'id')
    .map(col => `${col} = excluded.${col}`)
    .join(', ');
  
  const sql = `
    INSERT INTO ${tableName} (${columns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT(id) DO UPDATE SET ${updateClause}, updatedAt = datetime('now')
  `;
  
  const stmt = database.prepare(sql);
  stmt.run(...values);
}

/**
 * Get record by ID
 */
function getRecord(tableName, recordId) {
  const database = getDatabase();
  const stmt = database.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
  return stmt.get(recordId);
}

/**
 * Get all records from table
 */
function getAllRecords(tableName, limit = 1000) {
  const database = getDatabase();
  const stmt = database.prepare(`SELECT * FROM ${tableName} LIMIT ?`);
  return stmt.all(limit);
}

/**
 * Delete record
 */
function deleteRecord(tableName, recordId) {
  const database = getDatabase();
  const stmt = database.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
  stmt.run(recordId);
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('[Database] Database connection closed');
  }
}

// Close database when app quits
if (app) {
  app.on('before-quit', () => {
    closeDatabase();
  });
}

module.exports = {
  initDatabase,
  getDatabase,
  addToSyncQueue,
  getSyncQueue,
  removeFromSyncQueue,
  incrementSyncQueueRetry,
  getLastSyncTime,
  setLastSyncTime,
  markSynced,
  upsertRecord,
  getRecord,
  getAllRecords,
  deleteRecord,
  closeDatabase,
};

