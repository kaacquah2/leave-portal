/**
 * Data Access Logger
 * 
 * Implements Data Protection Act 843 compliance by logging ALL access
 * to sensitive personal data.
 * 
 * Legal Reference: Data Protection Act, 2012 (Act 843), Section 24
 * 
 * @module data-access-logger
 */

import { prisma } from './prisma'

export type DataType = 
  | 'staff_profile'
  | 'leave_request'
  | 'medical_attachment'
  | 'dob'
  | 'salary'
  | 'performance_review'
  | 'payslip'
  | 'disciplinary_action'

export type AccessAction = 'view' | 'export' | 'download' | 'edit' | 'delete'

export interface DataAccessLogData {
  userId: string
  userRole: string
  staffId?: string
  dataType: DataType
  action: AccessAction
  ip?: string
  userAgent?: string
  metadata?: Record<string, any>
}

/**
 * Log access to sensitive personal data
 * 
 * This function MUST be called whenever sensitive data is accessed.
 * Per Data Protection Act 843, all access to personal data must be logged.
 */
export async function logDataAccess(data: DataAccessLogData): Promise<void> {
  try {
    await prisma.dataAccessLog.create({
      data: {
        userId: data.userId,
        userRole: data.userRole,
        staffId: data.staffId || null,
        dataType: data.dataType,
        action: data.action,
        ip: data.ip || null,
        userAgent: data.userAgent || null,
        metadata: data.metadata ? (data.metadata as any) : undefined,
        timestamp: new Date(),
      },
    })
  } catch (error) {
    // Log error but don't throw - data access logging should not break main operations
    console.error('Failed to log data access:', error)
  }
}

/**
 * Get data access logs (for AUDITOR role and authorized users)
 * 
 * Per Data Protection Act 843, auditors must be able to review data access history
 */
export async function getDataAccessLogs(filters: {
  userId?: string
  staffId?: string
  dataType?: DataType
  action?: AccessAction
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}) {
  const where: any = {}

  if (filters.userId) {
    where.userId = filters.userId
  }
  if (filters.staffId) {
    where.staffId = filters.staffId
  }
  if (filters.dataType) {
    where.dataType = filters.dataType
  }
  if (filters.action) {
    where.action = filters.action
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

  const logs = await prisma.dataAccessLog.findMany({
    where,
    take: filters.limit || 100,
    skip: filters.offset || 0,
    orderBy: { timestamp: 'desc' },
  })

  const total = await prisma.dataAccessLog.count({ where })

  return { logs, total }
}

/**
 * Mask sensitive fields based on role
 * 
 * Per Data Protection Act 843, sensitive fields should be masked
 * for users who don't have explicit access rights
 */
export function maskSensitiveFields(
  data: Record<string, any>,
  userRole: string,
  fieldsToMask: string[] = ['dob', 'phone', 'email', 'salary']
): Record<string, any> {
  const masked = { ...data }
  const normalizedRole = userRole?.toUpperCase()
  
  // Roles that can see all data
  const fullAccessRoles = [
    'HR_OFFICER',
    'HR_DIRECTOR',
    'CHIEF_DIRECTOR',
    'AUDITOR',
    'SYS_ADMIN',
    'hr',
    'hr_director',
    'chief_director',
    'auditor',
    'admin',
  ]
  
  // If user has full access, don't mask
  if (fullAccessRoles.includes(normalizedRole)) {
    return masked
  }
  
  // Mask sensitive fields for other roles
  for (const field of fieldsToMask) {
    if (field in masked) {
      if (field === 'dob' || field === 'phone') {
        masked[field] = '***-***-****'
      } else if (field === 'email') {
        const email = masked[field] as string
        const [local, domain] = email.split('@')
        masked[field] = `${local.substring(0, 2)}***@${domain}`
      } else if (field === 'salary') {
        masked[field] = '***'
      } else {
        masked[field] = '***'
      }
    }
  }
  
  return masked
}

