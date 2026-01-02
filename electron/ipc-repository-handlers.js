/**
 * IPC Repository Handlers
 * 
 * Secure IPC handlers for repository operations
 * NO direct network access from renderer - all goes through main process
 * 
 * Architecture:
 * - Renderer → IPC → Repository → SQLite → Sync Engine → API Client → Server
 */

const { ipcMain } = require('electron');
const { getEncryptedDatabase } = require('./database-encrypted');
const { sync, getSyncStatus, isOnline } = require('./sync-engine');
const authStorage = require('./auth-storage');
const { getBackgroundSyncStatus, triggerImmediateSync, updateConfig as updateSyncConfig } = require('./background-sync');
const { getPendingConflicts, markConflictResolved, autoResolveConflicts } = require('./conflict-resolver');
const { createOfflineApproval, getPendingOfflineApprovals, canApproveOffline } = require('./offline-approvals');
const { getIncrementalSyncStats } = require('./incremental-sync');

// Import repositories (will be compiled from TypeScript)
// For now, using direct SQL queries - repositories will be added when TypeScript is compiled
const Database = require('better-sqlite3');

/**
 * Setup repository IPC handlers
 */
function setupRepositoryHandlers(apiBaseUrl, logger) {
  /**
   * Get sync status
   */
  ipcMain.handle('repo:sync:status', async () => {
    try {
      const status = getSyncStatus();
      const online = await isOnline(apiBaseUrl);
      return {
        success: true,
        data: {
          ...status,
          online,
        },
      };
    } catch (error) {
      logger?.error(`[IPC] Error getting sync status: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Trigger manual sync
   */
  ipcMain.handle('repo:sync:trigger', async () => {
    try {
      const result = await sync(apiBaseUrl, logger);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger?.error(`[IPC] Sync error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Get employees (read-only offline)
   */
  ipcMain.handle('repo:employees:findAll', async (event, filters = {}) => {
    try {
      const db = getEncryptedDatabase();
      let query = 'SELECT * FROM employees WHERE 1=1';
      const params = [];

      if (filters.department) {
        query += ' AND department = ?';
        params.push(filters.department);
      }
      if (filters.active !== undefined) {
        query += ' AND active = ?';
        params.push(filters.active ? 1 : 0);
      }
      if (filters.managerId) {
        query += ' AND manager_id = ?';
        params.push(filters.managerId);
      }

      query += ' ORDER BY last_name, first_name';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
        if (filters.offset) {
          query += ' OFFSET ?';
          params.push(filters.offset);
        }
      }

      const stmt = db.prepare(query);
      const results = stmt.all(...params);

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      logger?.error(`[IPC] Error finding employees: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Get employee by staff ID
   */
  ipcMain.handle('repo:employees:findByStaffId', async (event, staffId) => {
    try {
      const db = getEncryptedDatabase();
      const stmt = db.prepare('SELECT * FROM employees WHERE staff_id = ?');
      const result = stmt.get(staffId);

      return {
        success: true,
        data: result || null,
      };
    } catch (error) {
      logger?.error(`[IPC] Error finding employee: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Get leave requests
   */
  ipcMain.handle('repo:leaveRequests:findAll', async (event, filters = {}) => {
    try {
      const db = getEncryptedDatabase();
      let query = 'SELECT * FROM leave_requests WHERE 1=1';
      const params = [];

      if (filters.staffId) {
        query += ' AND staff_id = ?';
        params.push(filters.staffId);
      }
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      if (filters.leaveType) {
        query += ' AND leave_type = ?';
        params.push(filters.leaveType);
      }

      query += ' ORDER BY created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
        if (filters.offset) {
          query += ' OFFSET ?';
          params.push(filters.offset);
        }
      }

      const stmt = db.prepare(query);
      const results = stmt.all(...params);

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      logger?.error(`[IPC] Error finding leave requests: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Create leave request (offline)
   */
  ipcMain.handle('repo:leaveRequests:create', async (event, data) => {
    try {
      const db = getEncryptedDatabase();
      const { v4: uuidv4 } = require('uuid');
      const now = new Date().toISOString();
      const id = uuidv4();

      // Insert leave request
      const insertStmt = db.prepare(`
        INSERT INTO leave_requests (
          id, staff_id, staff_name, leave_type, start_date, end_date,
          days, reason, status, officer_taking_over, handover_notes,
          declaration_accepted, payroll_impact_flag, locked,
          sync_status, local_updated_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        id,
        data.staffId,
        data.staffName,
        data.leaveType,
        data.startDate,
        data.endDate,
        data.days,
        data.reason,
        'pending',
        data.officerTakingOver || null,
        data.handoverNotes || null,
        data.declarationAccepted ? 1 : 0,
        data.payrollImpactFlag ? 1 : 0,
        0, // locked
        'pending', // sync_status
        now,
        now,
        now
      );

      // Add to sync queue
      const queueStmt = db.prepare(`
        INSERT INTO sync_queue (table_name, operation, record_id, payload, priority)
        VALUES (?, ?, ?, ?, ?)
      `);
      queueStmt.run(
        'leave_requests',
        'INSERT',
        id,
        JSON.stringify({ ...data, id }),
        0 // normal priority
      );

      // Create audit log
      const auditStmt = db.prepare(`
        INSERT INTO audit_logs (
          id, action, user, user_role, staff_id, leave_request_id,
          details, sync_status, local_updated_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      auditStmt.run(
        uuidv4(),
        'leave_submitted',
        data.userEmail || 'unknown',
        data.userRole || 'unknown',
        data.staffId,
        id,
        `Leave request submitted: ${data.leaveType} from ${data.startDate} to ${data.endDate}`,
        'pending',
        now,
        now
      );

      // Get created record
      const getStmt = db.prepare('SELECT * FROM leave_requests WHERE id = ?');
      const result = getStmt.get(id);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger?.error(`[IPC] Error creating leave request: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Get leave balance
   */
  ipcMain.handle('repo:leaveBalances:findByStaffId', async (event, staffId) => {
    try {
      const db = getEncryptedDatabase();
      const stmt = db.prepare('SELECT * FROM leave_balances WHERE staff_id = ?');
      const result = stmt.get(staffId);

      return {
        success: true,
        data: result || null,
      };
    } catch (error) {
      logger?.error(`[IPC] Error finding leave balance: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Get pending sync count
   */
  ipcMain.handle('repo:sync:pendingCount', async () => {
    try {
      const db = getEncryptedDatabase();
      const count = db.prepare('SELECT COUNT(*) as count FROM sync_queue').get().count;
      return {
        success: true,
        data: count,
      };
    } catch (error) {
      logger?.error(`[IPC] Error getting pending count: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Background sync status
   */
  ipcMain.handle('repo:sync:backgroundStatus', async () => {
    try {
      const status = getBackgroundSyncStatus();
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      logger?.error(`[IPC] Error getting background sync status: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Get pending conflicts
   */
  ipcMain.handle('repo:conflicts:getPending', async () => {
    try {
      const conflicts = getPendingConflicts();
      return {
        success: true,
        data: conflicts,
      };
    } catch (error) {
      logger?.error(`[IPC] Error getting conflicts: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Resolve conflict
   */
  ipcMain.handle('repo:conflicts:resolve', async (event, tableName, recordId, useServer) => {
    try {
      markConflictResolved(tableName, recordId, useServer, {});
      return {
        success: true,
        data: { resolved: true },
      };
    } catch (error) {
      logger?.error(`[IPC] Error resolving conflict: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Create offline approval
   */
  ipcMain.handle('repo:approvals:create', async (event, leaveRequestId, approverId, approverName, approverRole, action, level, comments) => {
    try {
      const approval = createOfflineApproval(leaveRequestId, approverId, approverName, approverRole, action, level, comments);
      return {
        success: true,
        data: approval,
      };
    } catch (error) {
      logger?.error(`[IPC] Error creating offline approval: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Get pending offline approvals
   */
  ipcMain.handle('repo:approvals:getPending', async (event, approverId) => {
    try {
      const approvals = getPendingOfflineApprovals(approverId);
      return {
        success: true,
        data: approvals,
      };
    } catch (error) {
      logger?.error(`[IPC] Error getting pending approvals: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Check if can approve offline
   */
  ipcMain.handle('repo:approvals:canApprove', async (event, role) => {
    try {
      const canApprove = canApproveOffline(role);
      return {
        success: true,
        data: { canApprove },
      };
    } catch (error) {
      logger?.error(`[IPC] Error checking approval permission: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Get incremental sync stats
   */
  ipcMain.handle('repo:sync:incrementalStats', async () => {
    try {
      const stats = getIncrementalSyncStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      logger?.error(`[IPC] Error getting incremental sync stats: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  });
}

module.exports = {
  setupRepositoryHandlers,
};

