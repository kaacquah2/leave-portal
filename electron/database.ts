/**
 * Local SQLite Database Service for Offline-First Architecture
 * 
 * This service manages a local SQLite database that mirrors the Neon Postgres database.
 * All writes go to SQLite first, then sync to Neon via the Vercel API.
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export interface SyncQueueItem {
  id: number;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  payload: string; // JSON string
  created_at: string;
}

export class LocalDatabase {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    // Use Electron's userData directory for the database
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'hr-portal-local.db');
    
    // Ensure directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  /**
   * Initialize the database and create tables
   */
  initialize(): void {
    try {
      this.db = new Database(this.dbPath);
      
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      
      // Create sync_queue table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
          record_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at);
        CREATE INDEX IF NOT EXISTS idx_sync_queue_table_operation ON sync_queue(table_name, operation);
      `);

      // Create metadata table for tracking last sync time
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sync_metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Mirror tables - StaffMember
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS staff_member (
          id TEXT PRIMARY KEY,
          staff_id TEXT UNIQUE NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          phone TEXT NOT NULL,
          department TEXT NOT NULL,
          position TEXT NOT NULL,
          grade TEXT NOT NULL,
          level TEXT NOT NULL,
          rank TEXT,
          step TEXT,
          directorate TEXT,
          unit TEXT,
          photo_url TEXT,
          active INTEGER DEFAULT 1,
          employment_status TEXT DEFAULT 'active',
          termination_date TEXT,
          termination_reason TEXT,
          join_date TEXT NOT NULL,
          manager_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          synced_at TEXT,
          is_dirty INTEGER DEFAULT 0
        );
        
        CREATE INDEX IF NOT EXISTS idx_staff_staff_id ON staff_member(staff_id);
        CREATE INDEX IF NOT EXISTS idx_staff_updated_at ON staff_member(updated_at);
      `);

      // Mirror tables - LeaveRequest
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS leave_request (
          id TEXT PRIMARY KEY,
          staff_id TEXT NOT NULL,
          staff_name TEXT NOT NULL,
          leave_type TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          days INTEGER NOT NULL,
          reason TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          approved_by TEXT,
          approval_date TEXT,
          template_id TEXT,
          approval_levels TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          synced_at TEXT,
          is_dirty INTEGER DEFAULT 0
        );
        
        CREATE INDEX IF NOT EXISTS idx_leave_staff_id ON leave_request(staff_id);
        CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_request(status);
        CREATE INDEX IF NOT EXISTS idx_leave_updated_at ON leave_request(updated_at);
      `);

      // Mirror tables - LeaveBalance
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS leave_balance (
          id TEXT PRIMARY KEY,
          staff_id TEXT UNIQUE NOT NULL,
          annual REAL DEFAULT 0,
          sick REAL DEFAULT 0,
          unpaid REAL DEFAULT 0,
          special_service REAL DEFAULT 0,
          training REAL DEFAULT 0,
          study REAL DEFAULT 0,
          maternity REAL DEFAULT 0,
          paternity REAL DEFAULT 0,
          compassionate REAL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          synced_at TEXT,
          is_dirty INTEGER DEFAULT 0
        );
        
        CREATE INDEX IF NOT EXISTS idx_balance_staff_id ON leave_balance(staff_id);
        CREATE INDEX IF NOT EXISTS idx_balance_updated_at ON leave_balance(updated_at);
      `);

      // Mirror tables - LeavePolicy
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS leave_policy (
          id TEXT PRIMARY KEY,
          leave_type TEXT NOT NULL,
          max_days INTEGER NOT NULL,
          accrual_rate REAL NOT NULL,
          carryover_allowed INTEGER DEFAULT 0,
          max_carryover INTEGER DEFAULT 0,
          requires_approval INTEGER DEFAULT 1,
          approval_levels INTEGER DEFAULT 1,
          active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          synced_at TEXT,
          is_dirty INTEGER DEFAULT 0
        );
        
        CREATE INDEX IF NOT EXISTS idx_policy_leave_type ON leave_policy(leave_type);
        CREATE INDEX IF NOT EXISTS idx_policy_updated_at ON leave_policy(updated_at);
      `);

      // Mirror tables - Holiday
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS holiday (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          date TEXT NOT NULL,
          type TEXT NOT NULL,
          recurring INTEGER DEFAULT 0,
          year INTEGER,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          synced_at TEXT,
          is_dirty INTEGER DEFAULT 0
        );
        
        CREATE INDEX IF NOT EXISTS idx_holiday_date ON holiday(date);
        CREATE INDEX IF NOT EXISTS idx_holiday_updated_at ON holiday(updated_at);
      `);

      // Mirror tables - LeaveRequestTemplate
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS leave_template (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          leave_type TEXT NOT NULL,
          default_days INTEGER NOT NULL,
          default_reason TEXT NOT NULL,
          department TEXT,
          active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          synced_at TEXT,
          is_dirty INTEGER DEFAULT 0
        );
        
        CREATE INDEX IF NOT EXISTS idx_template_updated_at ON leave_template(updated_at);
      `);

      console.log('[LocalDB] Database initialized at:', this.dbPath);
    } catch (error) {
      console.error('[LocalDB] Error initializing database:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Add item to sync queue
   */
  addToSyncQueue(tableName: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', recordId: string, payload: any): number {
    const db = this.getDatabase();
    const stmt = db.prepare(`
      INSERT INTO sync_queue (table_name, operation, record_id, payload)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(tableName, operation, recordId, JSON.stringify(payload));
    return result.lastInsertRowid as number;
  }

  /**
   * Get pending sync queue items (oldest first)
   */
  getSyncQueue(limit: number = 50): SyncQueueItem[] {
    const db = this.getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM sync_queue
      ORDER BY created_at ASC
      LIMIT ?
    `);
    
    return stmt.all(limit) as SyncQueueItem[];
  }

  /**
   * Remove item from sync queue
   */
  removeFromSyncQueue(id: number): void {
    const db = this.getDatabase();
    const stmt = db.prepare('DELETE FROM sync_queue WHERE id = ?');
    stmt.run(id);
  }

  /**
   * Clear all items from sync queue
   */
  clearSyncQueue(): void {
    const db = this.getDatabase();
    db.exec('DELETE FROM sync_queue');
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): string | null {
    const db = this.getDatabase();
    const stmt = db.prepare('SELECT value FROM sync_metadata WHERE key = ?');
    const result = stmt.get('last_sync_time') as { value: string } | undefined;
    return result?.value || null;
  }

  /**
   * Set last sync time
   */
  setLastSyncTime(timestamp: string): void {
    const db = this.getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run('last_sync_time', timestamp);
  }

  /**
   * Mark record as synced
   */
  markSynced(tableName: string, recordId: string): void {
    const db = this.getDatabase();
    const tableMap: Record<string, string> = {
      'StaffMember': 'staff_member',
      'LeaveRequest': 'leave_request',
      'LeaveBalance': 'leave_balance',
      'LeavePolicy': 'leave_policy',
      'Holiday': 'holiday',
      'LeaveRequestTemplate': 'leave_template',
    };
    
    const localTable = tableMap[tableName] || tableName.toLowerCase();
    const stmt = db.prepare(`
      UPDATE ${localTable}
      SET synced_at = CURRENT_TIMESTAMP, is_dirty = 0
      WHERE id = ?
    `);
    stmt.run(recordId);
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
let localDbInstance: LocalDatabase | null = null;

export function getLocalDatabase(): LocalDatabase {
  if (!localDbInstance) {
    localDbInstance = new LocalDatabase();
  }
  return localDbInstance;
}

