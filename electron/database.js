/**
 * Local SQLite database for offline storage
 * 
 * Provides database operations with:
 * - Migration system for schema changes
 * - Automatic WAL checkpoint on app idle
 * - Database backup functionality
 * - Database abstraction layer for easier testing
 * 
 * @version 1.0.0
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DB_FILE = path.join(app.getPath('userData'), 'database.sqlite');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const BACKUP_DIR = path.join(app.getPath('userData'), 'backups');

let db = null;
let checkpointInterval = null;
let idleTimeout = null;
const IDLE_CHECKPOINT_DELAY = 30000; // 30 seconds of inactivity

/**
 * Initialize database connection
 * 
 * @returns {Database} Database instance
 */
function initDatabase() {
  if (db) {
    return db;
  }

  try {
    // Ensure userData directory exists
    const userDataDir = app.getPath('userData');
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    // Open database
    db = new Database(DB_FILE);
    
    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    
    // Enable foreign key constraints
    db.pragma('foreign_keys = ON');
    
    // Create migrations table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Run migrations
    runMigrations();

    // Setup automatic WAL checkpoint on idle
    setupIdleCheckpoint();

    console.log('[Database] Database initialized successfully');
    return db;
  } catch (error) {
    console.error('[Database] Error initializing database:', error);
    throw error;
  }
}

/**
 * Run database migrations
 * 
 * Migrations are SQL files in the migrations directory named:
 * - 001_initial_schema.sql
 * - 002_add_indexes.sql
 * - etc.
 */
function runMigrations() {
  try {
    // Get list of applied migrations
    const appliedMigrations = new Set(
      db.prepare('SELECT version FROM schema_migrations ORDER BY version')
        .all()
        .map(row => row.version)
    );

    // Get migration files
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
      console.log('[Database] Migrations directory created');
      return;
    }

    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Run pending migrations
    for (const file of migrationFiles) {
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        console.warn(`[Database] Skipping invalid migration file: ${file}`);
        continue;
      }

      const version = parseInt(match[1], 10);
      const name = match[2];

      if (appliedMigrations.has(version)) {
        console.log(`[Database] Migration ${version}_${name} already applied`);
        continue;
      }

      console.log(`[Database] Running migration ${version}_${name}...`);
      
      const migrationPath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      // Run migration in a transaction
      const transaction = db.transaction(() => {
        db.exec(sql);
        db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)')
          .run(version, name);
      });

      try {
        transaction();
        console.log(`[Database] Migration ${version}_${name} applied successfully`);
      } catch (error) {
        console.error(`[Database] Error applying migration ${version}_${name}:`, error);
        throw error;
      }
    }
  } catch (error) {
    console.error('[Database] Error running migrations:', error);
    throw error;
  }
}

/**
 * Setup automatic WAL checkpoint on app idle
 * 
 * WAL (Write-Ahead Logging) mode improves concurrency but requires
 * periodic checkpoints to merge WAL file into main database.
 */
function setupIdleCheckpoint() {
  // Clear existing interval/timeout
  if (checkpointInterval) {
    clearInterval(checkpointInterval);
  }
  if (idleTimeout) {
    clearTimeout(idleTimeout);
  }

  // Perform checkpoint on idle (30 seconds of no activity)
  const performCheckpoint = () => {
    if (!db) return;

    try {
      // Use WAL checkpoint with RESTART mode (merges WAL into main DB)
      db.pragma('wal_checkpoint(RESTART)');
      console.log('[Database] WAL checkpoint performed');
    } catch (error) {
      console.error('[Database] Error performing WAL checkpoint:', error);
    }
  };

  // Reset idle timeout on any database operation
  const resetIdleTimeout = () => {
    if (idleTimeout) {
      clearTimeout(idleTimeout);
    }
    idleTimeout = setTimeout(performCheckpoint, IDLE_CHECKPOINT_DELAY);
  };

  // Also perform periodic checkpoint (every 5 minutes)
  checkpointInterval = setInterval(performCheckpoint, 5 * 60 * 1000);

  // Expose reset function for use by database operations
  db.onIdle = resetIdleTimeout;
}

/**
 * Perform WAL checkpoint manually
 * 
 * Useful for ensuring data is persisted before app shutdown
 */
function checkpoint() {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    db.pragma('wal_checkpoint(RESTART)');
    console.log('[Database] Manual WAL checkpoint performed');
    return true;
  } catch (error) {
    console.error('[Database] Error performing manual checkpoint:', error);
    return false;
  }
}

/**
 * Create database backup
 * 
 * @param {string} backupName - Optional backup name (default: timestamp-based)
 * @returns {string} Path to backup file
 */
function createBackup(backupName = null) {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Generate backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = backupName || `backup-${timestamp}.sqlite`;
    const backupPath = path.join(BACKUP_DIR, filename);

    // Perform checkpoint before backup
    checkpoint();

    // Copy database file
    fs.copyFileSync(DB_FILE, backupPath);

    console.log(`[Database] Backup created: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('[Database] Error creating backup:', error);
    throw error;
  }
}

/**
 * Restore database from backup
 * 
 * @param {string} backupPath - Path to backup file
 * @returns {boolean} True if restore successful
 */
function restoreBackup(backupPath) {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  try {
    // Close existing database connection
    if (db) {
      db.close();
      db = null;
    }

    // Restore backup
    fs.copyFileSync(backupPath, DB_FILE);

    // Reinitialize database
    initDatabase();

    console.log(`[Database] Database restored from: ${backupPath}`);
    return true;
  } catch (error) {
    console.error('[Database] Error restoring backup:', error);
    throw error;
  }
}

/**
 * Get list of available backups
 * 
 * @returns {Array<Object>} List of backup files with metadata
 */
function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.sqlite'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        };
      })
      .sort((a, b) => b.created - a.created); // Newest first

    return files;
  } catch (error) {
    console.error('[Database] Error listing backups:', error);
    return [];
  }
}

/**
 * Get database instance (for use by other modules)
 * 
 * @returns {Database} Database instance
 */
function getDatabase() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (checkpointInterval) {
    clearInterval(checkpointInterval);
    checkpointInterval = null;
  }
  if (idleTimeout) {
    clearTimeout(idleTimeout);
    idleTimeout = null;
  }

  if (db) {
    try {
      // Perform final checkpoint before closing
      checkpoint();
      db.close();
      console.log('[Database] Database closed');
    } catch (error) {
      console.error('[Database] Error closing database:', error);
    }
    db = null;
  }
}

/**
 * Database abstraction layer for easier testing
 * 
 * Provides a simple interface for common database operations
 */
const dbAbstraction = {
  /**
   * Execute a query and return all results
   */
  query(sql, params = []) {
    const db = getDatabase();
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  },

  /**
   * Execute a query and return first result
   */
  queryOne(sql, params = []) {
    const db = getDatabase();
    const stmt = db.prepare(sql);
    return stmt.get(...params);
  },

  /**
   * Execute a query and return nothing
   */
  execute(sql, params = []) {
    const db = getDatabase();
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  },

  /**
   * Execute multiple statements in a transaction
   */
  transaction(callback) {
    const db = getDatabase();
    const transaction = db.transaction(callback);
    return transaction();
  },
};

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  checkpoint,
  createBackup,
  restoreBackup,
  listBackups,
  runMigrations,
  db: dbAbstraction, // Database abstraction layer
};

