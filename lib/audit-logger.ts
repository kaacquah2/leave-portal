/**
 * Comprehensive Audit Logging System for MoFA Compliance
 * Implements immutable audit logs per IAA requirements
 */

import { prisma } from '@/lib/prisma'

export interface AuditLogData {
  action: string
  user: string
  userRole?: string
  staffId?: string
  leaveRequestId?: string
  details: string
  metadata?: Record<string, any>
  ip?: string
  userAgent?: string
}

/**
 * Create an immutable audit log entry
 * This function should never be used to update or delete logs
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        user: data.user,
        userRole: data.userRole || null,
        staffId: data.staffId || null,
        leaveRequestId: data.leaveRequestId || null,
        details: data.details,
        metadata: data.metadata ? (data.metadata as any) : undefined,
        ip: data.ip || null,
        userAgent: data.userAgent || null,
        timestamp: new Date(),
      },
    })
  } catch (error) {
    // Log error but don't throw - audit logging should not break main operations
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Create leave approval history entry (immutable)
 */
export async function createLeaveApprovalHistory(data: {
  leaveRequestId: string
  level: number
  action: 'submitted' | 'approved' | 'rejected' | 'delegated' | 'recalled'
  approverId: string
  approverName: string
  approverRole: string
  approverStaffId?: string
  comments?: string
  previousStatus?: string
  newStatus?: string
  delegatedTo?: string
  ip?: string
  userAgent?: string
}): Promise<void> {
  try {
    await prisma.leaveApprovalHistory.create({
      data: {
        leaveRequestId: data.leaveRequestId,
        level: data.level,
        action: data.action,
        approverId: data.approverId,
        approverName: data.approverName,
        approverRole: data.approverRole,
        approverStaffId: data.approverStaffId || null,
        comments: data.comments || null,
        previousStatus: data.previousStatus || null,
        newStatus: data.newStatus || null,
        delegatedTo: data.delegatedTo || null,
        ip: data.ip || null,
        userAgent: data.userAgent || null,
        timestamp: new Date(),
      },
    })
  } catch (error) {
    console.error('Failed to create leave approval history:', error)
  }
}

/**
 * Get audit logs with filtering (for Internal Auditor and authorized roles)
 */
export async function getAuditLogs(filters: {
  action?: string
  user?: string
  staffId?: string
  leaveRequestId?: string
  userRole?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}) {
  const where: any = {}

  if (filters.action) {
    where.action = filters.action
  }
  if (filters.user) {
    where.user = { contains: filters.user, mode: 'insensitive' }
  }
  if (filters.staffId) {
    where.staffId = filters.staffId
  }
  if (filters.leaveRequestId) {
    where.leaveRequestId = filters.leaveRequestId
  }
  if (filters.userRole) {
    where.userRole = filters.userRole
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
 * Get approval history for a leave request
 */
export async function getLeaveApprovalHistory(leaveRequestId: string) {
  return await prisma.leaveApprovalHistory.findMany({
    where: { leaveRequestId },
    orderBy: [{ level: 'asc' }, { timestamp: 'asc' }],
  })
}

/**
 * Helper: Log leave request submission
 */
export async function logLeaveSubmission(data: {
  leaveRequestId: string
  staffId: string
  staffName: string
  leaveType: string
  days: number
  userId: string
  userRole: string
  ip?: string
  userAgent?: string
}) {
  await createAuditLog({
    action: 'leave_submitted',
    user: data.userId,
    userRole: data.userRole,
    staffId: data.staffId,
    leaveRequestId: data.leaveRequestId,
    details: `Leave request submitted: ${data.leaveType} for ${data.days} days by ${data.staffName}`,
    metadata: {
      leaveType: data.leaveType,
      days: data.days,
      staffName: data.staffName,
    },
    ip: data.ip,
    userAgent: data.userAgent,
  })
}

/**
 * Helper: Log leave approval
 */
export async function logLeaveApproval(data: {
  leaveRequestId: string
  level: number
  approverId: string
  approverName: string
  approverRole: string
  approverStaffId?: string
  comments?: string
  ip?: string
  userAgent?: string
}) {
  await createAuditLog({
    action: 'leave_approved',
    user: data.approverId,
    userRole: data.approverRole,
    staffId: data.approverStaffId,
    leaveRequestId: data.leaveRequestId,
    details: `Leave approved at level ${data.level} by ${data.approverName} (${data.approverRole})`,
    metadata: {
      level: data.level,
      approverName: data.approverName,
      comments: data.comments,
    },
    ip: data.ip,
    userAgent: data.userAgent,
  })

  await createLeaveApprovalHistory({
    leaveRequestId: data.leaveRequestId,
    level: data.level,
    action: 'approved',
    approverId: data.approverId,
    approverName: data.approverName,
    approverRole: data.approverRole,
    approverStaffId: data.approverStaffId,
    comments: data.comments,
    newStatus: 'approved',
    ip: data.ip,
    userAgent: data.userAgent,
  })
}

/**
 * Helper: Log leave rejection
 */
export async function logLeaveRejection(data: {
  leaveRequestId: string
  level: number
  approverId: string
  approverName: string
  approverRole: string
  approverStaffId?: string
  comments: string // Required for rejection
  ip?: string
  userAgent?: string
}) {
  await createAuditLog({
    action: 'leave_rejected',
    user: data.approverId,
    userRole: data.approverRole,
    staffId: data.approverStaffId,
    leaveRequestId: data.leaveRequestId,
    details: `Leave rejected at level ${data.level} by ${data.approverName} (${data.approverRole}): ${data.comments}`,
    metadata: {
      level: data.level,
      approverName: data.approverName,
      comments: data.comments,
    },
    ip: data.ip,
    userAgent: data.userAgent,
  })

  await createLeaveApprovalHistory({
    leaveRequestId: data.leaveRequestId,
    level: data.level,
    action: 'rejected',
    approverId: data.approverId,
    approverName: data.approverName,
    approverRole: data.approverRole,
    approverStaffId: data.approverStaffId,
    comments: data.comments,
    newStatus: 'rejected',
    ip: data.ip,
    userAgent: data.userAgent,
  })
}

/**
 * Helper: Log balance deduction
 */
export async function logBalanceDeduction(data: {
  staffId: string
  leaveType: string
  days: number
  balanceBefore: number
  balanceAfter: number
  leaveRequestId: string
  userId: string
  userRole: string
}) {
  await createAuditLog({
    action: 'balance_deducted',
    user: data.userId,
    userRole: data.userRole,
    staffId: data.staffId,
    leaveRequestId: data.leaveRequestId,
    details: `Leave balance deducted: ${data.leaveType} - ${data.days} days (${data.balanceBefore} → ${data.balanceAfter})`,
    metadata: {
      leaveType: data.leaveType,
      days: data.days,
      balanceBefore: data.balanceBefore,
      balanceAfter: data.balanceAfter,
    },
  })
}

/**
 * Helper: Log balance restoration (on rejection)
 */
export async function logBalanceRestoration(data: {
  staffId: string
  leaveType: string
  days: number
  balanceBefore: number
  balanceAfter: number
  leaveRequestId: string
  userId: string
  userRole: string
}) {
  await createAuditLog({
    action: 'balance_restored',
    user: data.userId,
    userRole: data.userRole,
    staffId: data.staffId,
    leaveRequestId: data.leaveRequestId,
    details: `Leave balance restored: ${data.leaveType} - ${data.days} days (${data.balanceBefore} → ${data.balanceAfter})`,
    metadata: {
      leaveType: data.leaveType,
      days: data.days,
      balanceBefore: data.balanceBefore,
      balanceAfter: data.balanceAfter,
    },
  })
}

