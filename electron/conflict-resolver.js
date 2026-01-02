/**
 * Conflict Resolution Engine
 * 
 * Handles conflicts between local and server data
 * Provides conflict detection and resolution strategies
 * 
 * Conflict Types:
 * - Leave Request: Server approved while client modified
 * - Leave Balance: Server updated while client viewing
 * - Employee Data: Server updated while client viewing
 */

const { getEncryptedDatabase } = require('./database-encrypted');

/**
 * Conflict types
 */
const ConflictType = {
  LEAVE_REQUEST_APPROVED: 'leave_request_approved',
  LEAVE_REQUEST_REJECTED: 'leave_request_rejected',
  LEAVE_BALANCE_UPDATED: 'leave_balance_updated',
  EMPLOYEE_UPDATED: 'employee_updated',
  DUPLICATE_SUBMISSION: 'duplicate_submission',
};

/**
 * Resolution strategies
 */
const ResolutionStrategy = {
  SERVER_WINS: 'server_wins', // Always use server version
  CLIENT_WINS: 'client_wins', // Always use client version
  MERGE: 'merge', // Merge both versions
  MANUAL: 'manual', // Require user intervention
};

/**
 * Detect conflicts in leave request
 */
function detectLeaveRequestConflict(localRequest, serverRequest) {
  const conflicts = [];

  // Check if server approved/rejected while client modified
  if (serverRequest.status !== localRequest.status) {
    if (serverRequest.status === 'approved' || serverRequest.status === 'rejected') {
      conflicts.push({
        type: serverRequest.status === 'approved' 
          ? ConflictType.LEAVE_REQUEST_APPROVED 
          : ConflictType.LEAVE_REQUEST_REJECTED,
        field: 'status',
        localValue: localRequest.status,
        serverValue: serverRequest.status,
        resolution: ResolutionStrategy.SERVER_WINS, // Server decision is final
        message: `Leave request was ${serverRequest.status} on server while you had it as ${localRequest.status}`,
      });
    }
  }

  // Check for duplicate submission (same dates, same staff)
  if (localRequest.id !== serverRequest.id &&
      localRequest.staff_id === serverRequest.staff_id &&
      localRequest.start_date === serverRequest.start_date &&
      localRequest.end_date === serverRequest.end_date) {
    conflicts.push({
      type: ConflictType.DUPLICATE_SUBMISSION,
      field: 'id',
      localValue: localRequest.id,
      serverValue: serverRequest.id,
      resolution: ResolutionStrategy.SERVER_WINS, // Use server ID
      message: 'Duplicate leave request detected - server version will be used',
    });
  }

  return conflicts;
}

/**
 * Detect conflicts in leave balance
 */
function detectLeaveBalanceConflict(localBalance, serverBalance) {
  const conflicts = [];

  // Leave balances are always server-authoritative
  // Any difference means server has updated
  if (localBalance.server_updated_at && 
      serverBalance.updatedAt > localBalance.server_updated_at) {
    conflicts.push({
      type: ConflictType.LEAVE_BALANCE_UPDATED,
      field: 'balance',
      localValue: localBalance,
      serverValue: serverBalance,
      resolution: ResolutionStrategy.SERVER_WINS, // Always server wins
      message: 'Leave balance was updated on server',
    });
  }

  return conflicts;
}

/**
 * Detect conflicts in employee data
 */
function detectEmployeeConflict(localEmployee, serverEmployee) {
  const conflicts = [];

  // Employee data is server-authoritative
  // Check if server has more recent update
  if (localEmployee.server_updated_at && 
      serverEmployee.updatedAt > localEmployee.server_updated_at) {
    conflicts.push({
      type: ConflictType.EMPLOYEE_UPDATED,
      field: 'employee_data',
      localValue: localEmployee,
      serverValue: serverEmployee,
      resolution: ResolutionStrategy.SERVER_WINS, // Always server wins
      message: 'Employee data was updated on server',
    });
  }

  return conflicts;
}

/**
 * Resolve conflict automatically based on strategy
 */
function resolveConflict(conflict) {
  switch (conflict.resolution) {
    case ResolutionStrategy.SERVER_WINS:
      return {
        resolved: true,
        useServer: true,
        data: conflict.serverValue,
        message: conflict.message,
      };

    case ResolutionStrategy.CLIENT_WINS:
      return {
        resolved: true,
        useServer: false,
        data: conflict.localValue,
        message: 'Client version preserved',
      };

    case ResolutionStrategy.MERGE:
      // Merge logic (implement based on specific conflict type)
      return {
        resolved: true,
        useServer: false,
        data: mergeData(conflict.localValue, conflict.serverValue),
        message: 'Data merged',
      };

    case ResolutionStrategy.MANUAL:
      return {
        resolved: false,
        requiresManualResolution: true,
        conflict,
        message: 'Manual resolution required',
      };

    default:
      return {
        resolved: false,
        error: 'Unknown resolution strategy',
      };
  }
}

/**
 * Merge data (basic implementation)
 */
function mergeData(local, server) {
  // For most cases, server wins with local metadata preserved
  return {
    ...server,
    local_updated_at: local.local_updated_at,
    sync_status: 'synced',
  };
}

/**
 * Get all pending conflicts
 */
function getPendingConflicts() {
  const db = getEncryptedDatabase();
  
  // Find records with conflict status
  const conflicts = db.prepare(`
    SELECT 
      'leave_requests' as table_name,
      id,
      staff_id,
      sync_status,
      server_updated_at,
      local_updated_at
    FROM leave_requests
    WHERE sync_status = 'conflict'
    
    UNION ALL
    
    SELECT 
      'leave_balances' as table_name,
      staff_id as id,
      staff_id,
      sync_status,
      server_updated_at,
      local_updated_at
    FROM leave_balances
    WHERE sync_status = 'conflict'
    
    UNION ALL
    
    SELECT 
      'employees' as table_name,
      staff_id as id,
      staff_id,
      sync_status,
      server_updated_at,
      local_updated_at
    FROM employees
    WHERE sync_status = 'conflict'
  `).all();

  return conflicts;
}

/**
 * Mark conflict as resolved
 */
function markConflictResolved(tableName, recordId, useServer, resolvedData) {
  const db = getEncryptedDatabase();
  const now = new Date().toISOString();

  if (useServer) {
    // Update with server data
    const stmt = db.prepare(`
      UPDATE ${tableName} SET
        sync_status = 'synced',
        server_updated_at = ?,
        local_updated_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ? OR staff_id = ?
    `);
    stmt.run(resolvedData.server_updated_at || now, recordId, recordId);
  } else {
    // Keep client data, mark for re-sync
    const stmt = db.prepare(`
      UPDATE ${tableName} SET
        sync_status = 'pending',
        local_updated_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ? OR staff_id = ?
    `);
    stmt.run(recordId, recordId);
  }
}

/**
 * Auto-resolve conflicts based on strategy
 */
function autoResolveConflicts(logger) {
  const db = getEncryptedDatabase();
  const conflicts = getPendingConflicts();
  let resolved = 0;

  for (const conflict of conflicts) {
    try {
      // Get full record
      let localRecord;
      if (conflict.table_name === 'leave_requests') {
        localRecord = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(conflict.id);
      } else if (conflict.table_name === 'leave_balances') {
        localRecord = db.prepare('SELECT * FROM leave_balances WHERE staff_id = ?').get(conflict.id);
      } else if (conflict.table_name === 'employees') {
        localRecord = db.prepare('SELECT * FROM employees WHERE staff_id = ?').get(conflict.id);
      }

      if (!localRecord) continue;

      // For most conflicts, server wins (by design)
      const resolution = {
        resolved: true,
        useServer: true,
        data: localRecord,
      };

      markConflictResolved(conflict.table_name, conflict.id, true, resolution.data);
      resolved++;
      logger?.info(`[Conflict Resolver] Auto-resolved conflict for ${conflict.table_name}:${conflict.id}`);
    } catch (error) {
      logger?.error(`[Conflict Resolver] Error resolving conflict: ${error.message}`);
    }
  }

  return { resolved, total: conflicts.length };
}

module.exports = {
  ConflictType,
  ResolutionStrategy,
  detectLeaveRequestConflict,
  detectLeaveBalanceConflict,
  detectEmployeeConflict,
  resolveConflict,
  getPendingConflicts,
  markConflictResolved,
  autoResolveConflicts,
};

