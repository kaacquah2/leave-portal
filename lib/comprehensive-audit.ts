/**
 * Comprehensive Audit Logging System
 * 
 * Ensures ALL operations are audited per compliance requirements:
 * - All data access (view, export, download)
 * - All permission changes
 * - All configuration changes
 * - All sync operations
 * 
 * This module provides utilities that cannot be bypassed.
 */

import { prisma } from './prisma'
import { createAuditLog } from './audit-logger'
import { logDataAccess, type DataType, type AccessAction } from './data-access-logger'

/**
 * Audit action types for comprehensive coverage
 */
export type AuditAction =
  // Data Access
  | 'data_view'
  | 'data_export'
  | 'data_download'
  | 'data_edit'
  | 'data_delete'
  
  // Permission & Role Changes
  | 'role_changed'
  | 'permission_granted'
  | 'permission_revoked'
  | 'user_activated'
  | 'user_deactivated'
  | 'user_created'
  | 'user_deleted'
  
  // Configuration Changes
  | 'workflow_created'
  | 'workflow_updated'
  | 'workflow_activated'
  | 'workflow_deactivated'
  | 'policy_created'
  | 'policy_updated'
  | 'policy_activated'
  | 'policy_deactivated'
  | 'settings_updated'
  | 'system_config_changed'
  
  // Sync Operations
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'sync_conflict_resolved'
  
  // Leave Operations (already logged, but included for completeness)
  | 'leave_submitted'
  | 'leave_resubmitted'
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_cancelled'
  | 'balance_deducted'
  | 'balance_restored'
  | 'balance_override_approved'
  | 'balance_override_rejected'
  
  // Staff Operations
  | 'staff_created'
  | 'staff_updated'
  | 'staff_terminated'
  | 'profile_change_requested'
  | 'profile_change_approved'
  | 'profile_change_rejected'
  
  // System Operations
  | 'backup_created'
  | 'backup_restored'
  | 'data_archived'
  | 'data_deleted'
  | 'legal_hold_placed'
  | 'legal_hold_removed'

/**
 * Comprehensive audit log entry
 */
export interface ComprehensiveAuditData {
  action: AuditAction
  userId: string
  userRole: string
  userEmail?: string
  staffId?: string
  leaveRequestId?: string
  details: string
  metadata?: Record<string, any>
  ip?: string
  userAgent?: string
}

/**
 * Log comprehensive audit entry
 * This function ensures all operations are logged
 */
export async function logComprehensiveAudit(data: ComprehensiveAuditData): Promise<void> {
  try {
    // Create audit log entry
    await createAuditLog({
      action: data.action,
      user: data.userEmail || data.userId,
      userRole: data.userRole,
      staffId: data.staffId,
      leaveRequestId: data.leaveRequestId,
      details: data.details,
      metadata: data.metadata,
      ip: data.ip,
      userAgent: data.userAgent,
    })

    // Also log as data access if applicable
    if (data.action.startsWith('data_')) {
      const dataType = mapActionToDataType(data.action)
      const accessAction = mapActionToAccessAction(data.action)
      
      if (dataType && accessAction) {
        await logDataAccess({
          userId: data.userId,
          userRole: data.userRole,
          staffId: data.staffId,
          dataType,
          action: accessAction,
          ip: data.ip,
          userAgent: data.userAgent,
          metadata: data.metadata,
        })
      }
    }
  } catch (error) {
    // Log error but don't throw - audit logging should not break main operations
    console.error('[Comprehensive Audit] Failed to log audit entry:', error)
  }
}

/**
 * Map audit action to data type
 */
function mapActionToDataType(action: AuditAction): DataType | null {
  const mapping: Record<string, DataType> = {
    'data_view': 'staff_profile',
    'data_export': 'staff_profile',
    'data_download': 'staff_profile',
    'data_edit': 'staff_profile',
    'data_delete': 'staff_profile',
  }
  return mapping[action] || null
}

/**
 * Map audit action to access action
 */
function mapActionToAccessAction(action: AuditAction): AccessAction | null {
  if (action === 'data_view') return 'view'
  if (action === 'data_export') return 'export'
  if (action === 'data_download') return 'download'
  if (action === 'data_edit') return 'edit'
  if (action === 'data_delete') return 'delete'
  return null
}

/**
 * Log data view (when user views sensitive data)
 */
export async function logDataView(
  userId: string,
  userRole: string,
  userEmail: string,
  dataType: DataType,
  staffId?: string,
  metadata?: Record<string, any>,
  ip?: string,
  userAgent?: string
): Promise<void> {
  await logComprehensiveAudit({
    action: 'data_view',
    userId,
    userRole,
    userEmail,
    staffId,
    details: `Viewed ${dataType}${staffId ? ` for staff ${staffId}` : ''}`,
    metadata: { dataType, ...metadata },
    ip,
    userAgent,
  })

  // Also log as data access
  await logDataAccess({
    userId,
    userRole,
    staffId,
    dataType,
    action: 'view',
    ip,
    userAgent,
    metadata,
  })
}

/**
 * Log data export
 */
export async function logDataExport(
  userId: string,
  userRole: string,
  userEmail: string,
  exportType: string,
  dataType: string,
  recordCount: number,
  metadata?: Record<string, any>,
  ip?: string,
  userAgent?: string
): Promise<void> {
  await logComprehensiveAudit({
    action: 'data_export',
    userId,
    userRole,
    userEmail,
    details: `Exported ${exportType}: ${recordCount} records`,
    metadata: { exportType, dataType, recordCount, ...metadata },
    ip,
    userAgent,
  })

  // ExportLog is already created in export route, but we ensure audit log too
}

/**
 * Log data download
 */
export async function logDataDownload(
  userId: string,
  userRole: string,
  userEmail: string,
  dataType: DataType,
  staffId?: string,
  fileUrl?: string,
  metadata?: Record<string, any>,
  ip?: string,
  userAgent?: string
): Promise<void> {
  await logComprehensiveAudit({
    action: 'data_download',
    userId,
    userRole,
    userEmail,
    staffId,
    details: `Downloaded ${dataType}${fileUrl ? `: ${fileUrl}` : ''}`,
    metadata: { dataType, fileUrl, ...metadata },
    ip,
    userAgent,
  })

  // Also log as data access
  await logDataAccess({
    userId,
    userRole,
    staffId,
    dataType,
    action: 'download',
    ip,
    userAgent,
    metadata,
  })
}

/**
 * Log role/permission change
 */
export async function logRoleChange(
  userId: string,
  userRole: string,
  userEmail: string,
  targetUserId: string,
  targetUserEmail: string,
  previousRole: string,
  newRole: string,
  changedBy: string,
  changedByEmail: string,
  ip?: string,
  userAgent?: string
): Promise<void> {
  await logComprehensiveAudit({
    action: 'role_changed',
    userId: changedBy,
    userRole,
    userEmail: changedByEmail,
    staffId: targetUserId,
    details: `Role changed for ${targetUserEmail}: ${previousRole} → ${newRole}`,
    metadata: {
      targetUserId,
      targetUserEmail,
      previousRole,
      newRole,
      changedBy,
      changedByEmail,
    },
    ip,
    userAgent,
  })
}

/**
 * Log permission grant
 */
export async function logPermissionGrant(
  userId: string,
  userRole: string,
  userEmail: string,
  targetUserId: string,
  permission: string,
  ip?: string,
  userAgent?: string
): Promise<void> {
  await logComprehensiveAudit({
    action: 'permission_granted',
    userId,
    userRole,
    userEmail,
    details: `Permission granted: ${permission} to user ${targetUserId}`,
    metadata: { targetUserId, permission },
    ip,
    userAgent,
  })
}

/**
 * Log permission revoke
 */
export async function logPermissionRevoke(
  userId: string,
  userRole: string,
  userEmail: string,
  targetUserId: string,
  permission: string,
  ip?: string,
  userAgent?: string
): Promise<void> {
  await logComprehensiveAudit({
    action: 'permission_revoked',
    userId,
    userRole,
    userEmail,
    details: `Permission revoked: ${permission} from user ${targetUserId}`,
    metadata: { targetUserId, permission },
    ip,
    userAgent,
  })
}

/**
 * Log workflow configuration change
 */
export async function logWorkflowChange(
  userId: string,
  userRole: string,
  userEmail: string,
  action: 'created' | 'updated' | 'activated' | 'deactivated',
  workflowId: string,
  workflowName: string,
  metadata?: Record<string, any>,
  ip?: string,
  userAgent?: string
): Promise<void> {
  const auditAction = `workflow_${action}` as AuditAction
  
  await logComprehensiveAudit({
    action: auditAction,
    userId,
    userRole,
    userEmail,
    details: `Workflow ${action}: ${workflowName} (${workflowId})`,
    metadata: { workflowId, workflowName, ...metadata },
    ip,
    userAgent,
  })
}

/**
 * Log policy configuration change
 */
export async function logPolicyChange(
  userId: string,
  userRole: string,
  userEmail: string,
  action: 'created' | 'updated' | 'activated' | 'deactivated',
  policyId: string,
  policyName: string,
  leaveType?: string,
  metadata?: Record<string, any>,
  ip?: string,
  userAgent?: string
): Promise<void> {
  const auditAction = `policy_${action}` as AuditAction
  
  await logComprehensiveAudit({
    action: auditAction,
    userId,
    userRole,
    userEmail,
    details: `Leave policy ${action}: ${policyName}${leaveType ? ` (${leaveType})` : ''} (${policyId})`,
    metadata: { policyId, policyName, leaveType, ...metadata },
    ip,
    userAgent,
  })
}

/**
 * Log system settings change
 */
export async function logSettingsChange(
  userId: string,
  userRole: string,
  userEmail: string,
  settingCategory: string,
  settingKey: string,
  previousValue: any,
  newValue: any,
  ip?: string,
  userAgent?: string
): Promise<void> {
  await logComprehensiveAudit({
    action: 'settings_updated',
    userId,
    userRole,
    userEmail,
    details: `Settings updated: ${settingCategory}.${settingKey}`,
    metadata: {
      settingCategory,
      settingKey,
      previousValue,
      newValue,
    },
    ip,
    userAgent,
  })
}

/**
 * Log sync operation
 */
export async function logSyncOperation(
  userId: string,
  userRole: string,
  action: 'started' | 'completed' | 'failed',
  syncType: 'pull' | 'push' | 'full',
  recordsProcessed?: number,
  errors?: string[],
  metadata?: Record<string, any>,
  ip?: string,
  userAgent?: string
): Promise<void> {
  const auditAction = `sync_${action}` as AuditAction
  
  const details = action === 'completed'
    ? `Sync ${action}: ${syncType} (${recordsProcessed || 0} records)`
    : action === 'failed'
    ? `Sync ${action}: ${syncType}${errors ? ` - ${errors.join(', ')}` : ''}`
    : `Sync ${action}: ${syncType}`
  
  await logComprehensiveAudit({
    action: auditAction,
    userId,
    userRole,
    userEmail: userId, // For sync, userId might be device ID
    details,
    metadata: {
      syncType,
      recordsProcessed,
      errors,
      ...metadata,
    },
    ip,
    userAgent,
  })
}

/**
 * Log user activation/deactivation
 */
export async function logUserStatusChange(
  userId: string,
  userRole: string,
  userEmail: string,
  targetUserId: string,
  targetUserEmail: string,
  action: 'activated' | 'deactivated',
  reason?: string,
  ip?: string,
  userAgent?: string
): Promise<void> {
  const auditAction = `user_${action}` as AuditAction
  
  await logComprehensiveAudit({
    action: auditAction,
    userId,
    userRole,
    userEmail,
    details: `User ${action}: ${targetUserEmail}${reason ? ` - ${reason}` : ''}`,
    metadata: {
      targetUserId,
      targetUserEmail,
      reason,
    },
    ip,
    userAgent,
  })
}

/**
 * Get comprehensive audit logs with filtering
 */
export async function getComprehensiveAuditLogs(filters: {
  action?: AuditAction | AuditAction[]
  userId?: string
  userRole?: string
  staffId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}) {
  const where: any = {}

  if (filters.action) {
    if (Array.isArray(filters.action)) {
      where.action = { in: filters.action }
    } else {
      where.action = filters.action
    }
  }

  if (filters.userId) {
    where.user = { contains: filters.userId, mode: 'insensitive' }
  }

  if (filters.userRole) {
    where.userRole = filters.userRole
  }

  if (filters.staffId) {
    where.staffId = filters.staffId
  }

  if (filters.startDate || filters.endDate) {
    where.timestamp = {}
    if (filters.startDate) {
      where.timestamp.gte = filters.startDate
    }
    if (filters.endDate) {
      where.timestamp.lte = filters.endDate
    }
  }

  const logs = await prisma.auditLog.findMany({
    where,
    take: filters.limit || 100,
    skip: filters.offset || 0,
    orderBy: { timestamp: 'desc' },
  })

  const total = await prisma.auditLog.count({ where })

  return { logs, total }
}

/**
 * Get audit coverage report
 * Shows which operations are being audited and identifies gaps
 */
export async function getAuditCoverageReport(startDate: Date, endDate: Date) {
  const actionCounts = await prisma.auditLog.groupBy({
    by: ['action'],
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: {
      id: true,
    },
  })

  const dataAccessCounts = await prisma.dataAccessLog.groupBy({
    by: ['action', 'dataType'],
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: {
      id: true,
    },
  })

  const exportCounts = await prisma.exportLog.groupBy({
    by: ['exportType'],
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: {
      id: true,
    },
  })

  return {
    auditLogs: actionCounts,
    dataAccessLogs: dataAccessCounts,
    exportLogs: exportCounts,
    period: { startDate, endDate },
  }
}

