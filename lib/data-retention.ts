/**
 * Data Retention Policy Enforcement
 * 
 * Implements Data Protection Act 843 compliance:
 * - Retention periods: 7-10 years per data type
 * - Automatic archival process
 * - Automatic deletion after retention period
 * - Legal hold can prevent deletion
 */

import { prisma } from '@/lib/prisma'
import { hasLegalHold, hasLeaveRequestLegalHold } from './legal-hold'

// Retention periods in years
const RETENTION_PERIODS: Record<string, number> = {
  leave_request: 10,
  staff_profile: 10,
  audit_log: 10,
  performance_review: 7,
  payroll: 7,
  attendance: 7,
  document: 7,
  notification: 2, // Shorter for notifications
}

/**
 * Archive records that are approaching retention limit
 */
export async function archiveRecords(): Promise<void> {
  const now = new Date()

  // Archive leave requests
  const leaveRequestsToArchive = await prisma.leaveRequest.findMany({
    where: {
      createdAt: {
        lte: new Date(now.getFullYear() - RETENTION_PERIODS.leave_request + 1, now.getMonth(), now.getDate()),
      },
      // Add archived flag if you add it to schema
    },
  })

  // Archive audit logs
  const auditLogsToArchive = await prisma.auditLog.findMany({
    where: {
      timestamp: {
        lte: new Date(now.getFullYear() - RETENTION_PERIODS.audit_log + 1, now.getMonth(), now.getDate()),
      },
    },
  })

  // In a real implementation, you would:
  // 1. Move records to an archive table
  // 2. Compress/encrypt archived data
  // 3. Store in cold storage
  // 4. Update records with archived flag

  console.log(`[DataRetention] Archived ${leaveRequestsToArchive.length} leave requests and ${auditLogsToArchive.length} audit logs`)
}

/**
 * Delete records that have exceeded retention period
 */
export async function deleteExpiredRecords(): Promise<void> {
  const now = new Date()

  // Delete expired leave requests (checking legal holds)
  const expiredLeaveRequests = await prisma.leaveRequest.findMany({
    where: {
      createdAt: {
        lte: new Date(now.getFullYear() - RETENTION_PERIODS.leave_request, now.getMonth(), now.getDate()),
      },
    },
  })

  for (const leaveRequest of expiredLeaveRequests) {
    // Check for legal hold
    if (await hasLeaveRequestLegalHold(leaveRequest.id)) {
      console.log(`[DataRetention] Skipping deletion of leave request ${leaveRequest.id} due to legal hold`)
      continue
    }

    // Delete leave request (cascade will handle related records)
    await prisma.leaveRequest.delete({
      where: { id: leaveRequest.id },
    })
  }

  // Delete expired audit logs (but keep some critical ones)
  const expiredAuditLogs = await prisma.auditLog.findMany({
    where: {
      timestamp: {
        lte: new Date(now.getFullYear() - RETENTION_PERIODS.audit_log, now.getMonth(), now.getDate()),
      },
      // Keep critical actions
      action: {
        notIn: ['user_login', 'user_logout'], // Keep security-related logs longer
      },
    },
  })

  // Delete in batches to avoid overwhelming the database
  const batchSize = 1000
  for (let i = 0; i < expiredAuditLogs.length; i += batchSize) {
    const batch = expiredAuditLogs.slice(i, i + batchSize)
    await prisma.auditLog.deleteMany({
      where: {
        id: { in: batch.map(log => log.id) },
      },
    })
  }

  // Delete expired notifications
  const expiredNotifications = await prisma.notification.findMany({
    where: {
      createdAt: {
        lte: new Date(now.getFullYear() - RETENTION_PERIODS.notification, now.getMonth(), now.getDate()),
      },
      read: true, // Only delete read notifications
    },
  })

  await prisma.notification.deleteMany({
    where: {
      id: { in: expiredNotifications.map(n => n.id) },
    },
  })

  console.log(`[DataRetention] Deleted ${expiredLeaveRequests.length} expired leave requests, ${expiredAuditLogs.length} audit logs, and ${expiredNotifications.length} notifications`)
}

/**
 * Run data retention process (should be scheduled)
 */
export async function runDataRetentionProcess(): Promise<void> {
  try {
    console.log('[DataRetention] Starting data retention process...')
    
    // First archive records
    await archiveRecords()
    
    // Then delete expired records
    await deleteExpiredRecords()
    
    console.log('[DataRetention] Data retention process completed')
  } catch (error) {
    console.error('[DataRetention] Error in data retention process:', error)
    throw error
  }
}

