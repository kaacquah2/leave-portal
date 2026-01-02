/**
 * Base Repository Pattern for Offline-First Data Access
 * 
 * Ministry of Foreign Affairs (MoFA), Ghana - HR Leave Portal
 * 
 * This module provides the base repository class that all data repositories extend.
 * Implements common CRUD operations, sync metadata management, and offline-first patterns.
 * 
 * Architecture:
 * - All data access goes through repositories (no direct SQL)
 * - Sync metadata automatically managed
 * - UUID generation for offline records
 * - Timestamp management (ISO 8601)
 * - Transaction support
 */

import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sync status values
 */
export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  CONFLICT = 'conflict',
  ERROR = 'error',
}

/**
 * Base entity interface with sync metadata
 */
export interface BaseEntity {
  id: string;
  sync_status: SyncStatus;
  server_id?: string;
  server_updated_at?: string;
  local_updated_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Repository options
 */
export interface RepositoryOptions {
  tableName: string;
  primaryKey?: string;
  db: Database;
}

/**
 * Query filters
 */
export interface QueryFilters {
  [key: string]: any;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * Base repository class
 * 
 * Provides common CRUD operations and sync metadata management
 */
export abstract class BaseRepository<T extends BaseEntity> {
  protected db: Database;
  protected tableName: string;
  protected primaryKey: string;

  constructor(options: RepositoryOptions) {
    this.db = options.db;
    this.tableName = options.tableName;
    this.primaryKey = options.primaryKey || 'id';
  }

  /**
   * Generate UUID for new records
   * 
   * @returns {string} UUID v4
   */
  protected generateId(): string {
    return uuidv4();
  }

  /**
   * Get current timestamp in ISO 8601 format (UTC)
   * 
   * @returns {string} ISO 8601 timestamp
   */
  protected getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Find record by ID
   * 
   * @param {string} id - Record ID
   * @returns {T | null} Record or null if not found
   */
  findById(id: string): T | null {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?`);
    const result = stmt.get(id) as T | undefined;
    return result || null;
  }

  /**
   * Find all records matching filters
   * 
   * @param {QueryFilters} filters - Query filters
   * @returns {T[]} Array of records
   */
  findAll(filters: QueryFilters = {}): T[] {
    const { limit, offset, orderBy, orderDirection, ...whereFilters } = filters;
    
    let query = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];
    
    // Build WHERE clause
    const whereConditions: string[] = [];
    Object.entries(whereFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        whereConditions.push(`${key} = ?`);
        params.push(value);
      }
    });
    
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Add ORDER BY
    if (orderBy) {
      query += ` ORDER BY ${orderBy} ${orderDirection || 'ASC'}`;
    }
    
    // Add LIMIT and OFFSET
    if (limit) {
      query += ` LIMIT ?`;
      params.push(limit);
      if (offset) {
        query += ` OFFSET ?`;
        params.push(offset);
      }
    }
    
    const stmt = this.db.prepare(query);
    return stmt.all(...params) as T[];
  }

  /**
   * Find one record matching filters
   * 
   * @param {QueryFilters} filters - Query filters
   * @returns {T | null} Record or null if not found
   */
  findOne(filters: QueryFilters): T | null {
    const results = this.findAll({ ...filters, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Create new record
   * 
   * @param {Partial<T>} data - Record data
   * @returns {T} Created record
   */
  create(data: Partial<T>): T {
    const now = this.getCurrentTimestamp();
    const id = data.id || this.generateId();
    
    const record: T = {
      ...data,
      id,
      sync_status: SyncStatus.PENDING, // New records start as pending
      local_updated_at: now,
      created_at: data.created_at || now,
      updated_at: now,
    } as T;

    // Build INSERT query
    const columns = Object.keys(record).filter(key => record[key as keyof T] !== undefined);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => {
      const value = record[col as keyof T];
      // Convert booleans to integers for SQLite
      if (typeof value === 'boolean') {
        return value ? 1 : 0;
      }
      // Convert objects to JSON strings
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return value;
    });

    const query = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    const stmt = this.db.prepare(query);
    stmt.run(...values);

    return this.findById(id)!;
  }

  /**
   * Update record
   * 
   * @param {string} id - Record ID
   * @param {Partial<T>} data - Update data
   * @returns {T | null} Updated record or null if not found
   */
  update(id: string, data: Partial<T>): T | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    const now = this.getCurrentTimestamp();
    
    // Preserve sync metadata unless explicitly updating
    const updateData: Partial<T> = {
      ...data,
      id, // Ensure ID is not changed
      local_updated_at: now,
      updated_at: now,
      // Only update sync_status if explicitly provided
      sync_status: data.sync_status !== undefined ? data.sync_status : existing.sync_status,
    };

    // Build UPDATE query
    const columns = Object.keys(updateData).filter(
      key => key !== this.primaryKey && updateData[key as keyof T] !== undefined
    );
    
    if (columns.length === 0) {
      return existing;
    }

    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = columns.map(col => {
      const value = updateData[col as keyof T];
      if (typeof value === 'boolean') {
        return value ? 1 : 0;
      }
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return value;
    });
    values.push(id);

    const query = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKey} = ?`;
    const stmt = this.db.prepare(query);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Delete record
   * 
   * @param {string} id - Record ID
   * @returns {boolean} True if deleted, false if not found
   */
  delete(id: string): boolean {
    const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
    const stmt = this.db.prepare(query);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Count records matching filters
   * 
   * @param {QueryFilters} filters - Query filters
   * @returns {number} Count of records
   */
  count(filters: QueryFilters = {}): number {
    const { limit, offset, orderBy, orderDirection, ...whereFilters } = filters;
    
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: any[] = [];
    
    const whereConditions: string[] = [];
    Object.entries(whereFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        whereConditions.push(`${key} = ?`);
        params.push(value);
      }
    });
    
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    const stmt = this.db.prepare(query);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  /**
   * Mark record as synced
   * 
   * @param {string} id - Record ID
   * @param {string} serverId - Server-assigned ID
   * @param {string} serverUpdatedAt - Server update timestamp
   */
  markAsSynced(id: string, serverId: string, serverUpdatedAt: string): void {
    this.update(id, {
      sync_status: SyncStatus.SYNCED,
      server_id: serverId,
      server_updated_at: serverUpdatedAt,
    } as Partial<T>);
  }

  /**
   * Mark record as having sync error
   * 
   * @param {string} id - Record ID
   */
  markAsSyncError(id: string): void {
    this.update(id, {
      sync_status: SyncStatus.ERROR,
    } as Partial<T>);
  }

  /**
   * Find all pending sync records
   * 
   * @returns {T[]} Array of pending records
   */
  findPendingSync(): T[] {
    return this.findAll({
      sync_status: SyncStatus.PENDING,
    });
  }

  /**
   * Execute transaction
   * 
   * @param {Function} callback - Transaction callback
   * @returns {any} Transaction result
   */
  transaction<R>(callback: () => R): R {
    const transaction = this.db.transaction(callback);
    return transaction();
  }
}

