/**
 * GET /api/audit/gaps
 * Detect audit logging gaps
 * 
 * Analyzes API routes and identifies operations that may not be audited
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AUDITOR, HR_DIRECTOR, SYSTEM_ADMIN } from '@/lib/roles'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

const ALLOWED_ROLES = [
  AUDITOR,
  HR_DIRECTOR,
  SYSTEM_ADMIN,
  'AUDITOR',
  'auditor',
  'HR_DIRECTOR',
  'hr_director',
  'SYSTEM_ADMIN',
  'admin',
  'SYS_ADMIN',
]

/**
 * Expected audit actions for different route patterns
 */
const EXPECTED_AUDIT_PATTERNS = {
  'POST /api/': ['data_edit', 'staff_created', 'leave_submitted'],
  'PATCH /api/': ['data_edit', 'staff_updated', 'leave_approved', 'leave_rejected'],
  'DELETE /api/': ['data_delete', 'staff_terminated'],
  'GET /api/export': ['data_export'],
  'GET /api/employees': ['data_view'],
  'GET /api/staff': ['data_view'],
  'GET /api/leaves': ['data_view'],
}

/**
 * Detect audit gaps by analyzing recent operations
 */
async function detectAuditGaps(startDate: Date, endDate: Date) {
  const gaps: Array<{
    route: string
    method: string
    expectedActions: string[]
    missingActions: string[]
    lastAuditDate?: Date
  }> = []

  // Get all audit logs in the period
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      action: true,
      metadata: true,
      timestamp: true,
    },
  })

  // Group by action type
  const actionCounts = new Map<string, number>()
  auditLogs.forEach(log => {
    actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1)
  })

  // Check for missing expected actions
  const allExpectedActions = new Set<string>()
  Object.values(EXPECTED_AUDIT_PATTERNS).forEach(actions => {
    actions.forEach(action => allExpectedActions.add(action))
  })

  const missingActions: string[] = []
  allExpectedActions.forEach(action => {
    if (!actionCounts.has(action)) {
      missingActions.push(action)
    }
  })

  // Analyze data access logs
  const dataAccessLogs = await prisma.dataAccessLog.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      action: true,
      dataType: true,
      timestamp: true,
    },
  })

  // Check for missing data access types
  const expectedDataTypes = ['staff_profile', 'leave_request', 'salary', 'performance_review']
  const missingDataTypes: string[] = []
  const dataTypeCounts = new Map<string, number>()
  dataAccessLogs.forEach(log => {
    dataTypeCounts.set(log.dataType, (dataTypeCounts.get(log.dataType) || 0) + 1)
  })

  expectedDataTypes.forEach(dataType => {
    if (!dataTypeCounts.has(dataType)) {
      missingDataTypes.push(dataType)
    }
  })

  return {
    period: { startDate, endDate },
    auditLogSummary: {
      totalLogs: auditLogs.length,
      uniqueActions: actionCounts.size,
      actionCounts: Object.fromEntries(actionCounts),
    },
    dataAccessSummary: {
      totalLogs: dataAccessLogs.length,
      uniqueDataTypes: dataTypeCounts.size,
      dataTypeCounts: Object.fromEntries(dataTypeCounts),
    },
    gaps: {
      missingAuditActions: missingActions,
      missingDataTypes: missingDataTypes,
    },
    recommendations: generateRecommendations(missingActions, missingDataTypes),
  }
}

/**
 * Generate recommendations based on gaps
 */
function generateRecommendations(missingActions: string[], missingDataTypes: string[]): string[] {
  const recommendations: string[] = []

  if (missingActions.length > 0) {
    recommendations.push(
      `Missing audit actions detected: ${missingActions.join(', ')}. Consider adding audit logging to routes that perform these operations.`
    )
  }

  if (missingDataTypes.length > 0) {
    recommendations.push(
      `No data access logs found for: ${missingDataTypes.join(', ')}. Ensure all data access is logged using logDataAccess().`
    )
  }

  if (missingActions.length === 0 && missingDataTypes.length === 0) {
    recommendations.push('No gaps detected. All expected audit operations are being logged.')
  }

  return recommendations
}

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


export async function GET(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      if (!ALLOWED_ROLES.includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden - Only auditors, HR directors, and system admins can view audit gaps' },
          { status: 403 }
        )
      }

      const { searchParams } = new URL(req.url)
      const startDate = searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default: last 30 days
      const endDate = searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : new Date()

      const gaps = await detectAuditGaps(startDate, endDate)

      return NextResponse.json({ gaps })
    } catch (error: any) {
      console.error('Error detecting audit gaps:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to detect audit gaps' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ALLOWED_ROLES })(request)
}

