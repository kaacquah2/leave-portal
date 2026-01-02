/**
 * Offline Approval Workflow
 * 
 * Limited approval workflow for offline scenarios
 * 
 * Restrictions:
 * - Only supervisors/managers can approve offline
 * - Approvals are queued and synced when online
 * - Server validates all approvals on sync
 * - Cannot approve if leave request was modified on server
 */

const { getEncryptedDatabase } = require('./database-encrypted');
const { canUpdate } = require('./offline-permissions');
const { v4: uuidv4 } = require('uuid');

/**
 * Check if user can approve offline
 * 
 * CRITICAL: Per specification, ALL approvers CANNOT approve offline.
 * This function now always returns false to comply with government-safe rules.
 * Offline approvals are disabled to prevent:
 * - Conflicting approvals
 * - Balance corruption
 * - Audit trail gaps
 */
function canApproveOffline(role) {
  // SPECIFICATION COMPLIANCE: All approvers cannot approve offline
  // This violates government-safe rule and creates data integrity risk
  return false;
}

/**
 * Create offline approval
 * 
 * @param {string} leaveRequestId - Leave request ID
 * @param {string} approverId - User ID of approver
 * @param {string} approverName - Name of approver
 * @param {string} approverRole - Role of approver
 * @param {string} action - 'approved' | 'rejected'
 * @param {number} level - Approval level (1, 2, 3, etc.)
 * @param {string} comments - Optional comments
 * @returns {Object} Approval record
 */
function createOfflineApproval(leaveRequestId, approverId, approverName, approverRole, action, level, comments = '') {
  // SPECIFICATION COMPLIANCE: Offline approvals are disabled
  // All approvals require online connection per government-safe rules
  throw new Error('Offline approvals are not allowed. Please connect to the internet to approve leave requests.');

  const db = getEncryptedDatabase();
  const now = new Date().toISOString();

  // Get leave request
  const leaveRequest = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(leaveRequestId);
  if (!leaveRequest) {
    throw new Error('Leave request not found');
  }

  // Check if already approved/rejected
  if (leaveRequest.status === 'approved' || leaveRequest.status === 'rejected') {
    throw new Error(`Leave request is already ${leaveRequest.status}`);
  }

  // Check if request was modified on server (conflict)
  if (leaveRequest.sync_status === 'conflict') {
    throw new Error('Cannot approve: leave request has conflicts with server. Please sync first.');
  }

  // Create approval history entry
  const approvalId = uuidv4();
  const approvalStmt = db.prepare(`
    INSERT INTO approval_history (
      id, leave_request_id, approver_id, approver_name, approver_role,
      action, level, comments, sync_status, local_updated_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  approvalStmt.run(
    approvalId,
    leaveRequestId,
    approverId,
    approverName,
    approverRole,
    action,
    level,
    comments,
    'pending', // Must sync
    now,
    now
  );

  // Update leave request status (if this is final approval)
  // Note: In a full workflow, we'd check if this completes all approval levels
  // For now, we'll update status if action is approved/rejected
  if (action === 'approved' || action === 'rejected') {
    const updateStmt = db.prepare(`
      UPDATE leave_requests SET
        status = ?,
        approved_by = ?,
        approval_date = ?,
        sync_status = 'pending',
        local_updated_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `);
    updateStmt.run(action, approverId, now, leaveRequestId);
  }

  // Add to sync queue
  const queueStmt = db.prepare(`
    INSERT INTO sync_queue (table_name, operation, record_id, payload, priority)
    VALUES (?, ?, ?, ?, ?)
  `);
  queueStmt.run(
    'approval_history',
    'INSERT',
    approvalId,
    JSON.stringify({
      id: approvalId,
      leaveRequestId,
      approverId,
      approverName,
      approverRole,
      action,
      level,
      comments,
    }),
    1 // High priority for approvals
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
    `leave_${action}`,
    approverId,
    approverRole,
    leaveRequest.staff_id,
    leaveRequestId,
    `Leave request ${action} offline by ${approverName} (${approverRole})`,
    'pending',
    now,
    now
  );

  return {
    id: approvalId,
    leaveRequestId,
    action,
    level,
    status: 'pending_sync',
    message: 'Approval created offline and queued for sync',
  };
}

/**
 * Get pending offline approvals
 */
function getPendingOfflineApprovals(approverId = null) {
  const db = getEncryptedDatabase();
  
  let query = `
    SELECT ah.*, lr.staff_id, lr.staff_name, lr.leave_type, lr.start_date, lr.end_date
    FROM approval_history ah
    JOIN leave_requests lr ON ah.leave_request_id = lr.id
    WHERE ah.sync_status = 'pending'
  `;
  
  const params = [];
  if (approverId) {
    query += ' AND ah.approver_id = ?';
    params.push(approverId);
  }
  
  query += ' ORDER BY ah.created_at DESC';
  
  const stmt = db.prepare(query);
  return stmt.all(...params);
}

/**
 * Validate offline approval before sync
 */
function validateOfflineApproval(approvalId) {
  const db = getEncryptedDatabase();
  
  const approval = db.prepare('SELECT * FROM approval_history WHERE id = ?').get(approvalId);
  if (!approval) {
    return { valid: false, error: 'Approval not found' };
  }

  const leaveRequest = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(approval.leave_request_id);
  if (!leaveRequest) {
    return { valid: false, error: 'Leave request not found' };
  }

  // Check if leave request was modified on server
  if (leaveRequest.sync_status === 'conflict') {
    return { valid: false, error: 'Leave request has conflicts with server' };
  }

  // Check if already processed on server
  if (leaveRequest.status === 'approved' && approval.action !== 'approved') {
    return { valid: false, error: 'Leave request already approved on server' };
  }

  return { valid: true };
}

module.exports = {
  canApproveOffline,
  createOfflineApproval,
  getPendingOfflineApprovals,
  validateOfflineApproval,
};

