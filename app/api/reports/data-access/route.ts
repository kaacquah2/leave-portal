/**
 * Data Access Report API
 * 
 * Data Protection Act 843 Compliance: Report on all data access
 * Per requirement: Data Access Report for auditors
 * 
 * Legal Reference: Data Protection Act, 2012 (Act 843), Section 24
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAuditor, isHRDirector, isAdmin } from '@/lib/auth-proxy'
import { getDataAccessLogs } from '@/lib/data-access-logger'
import { AUDIT_ROLES } from '@/lib/role-utils'

/**
 * GET /api/reports/data-access
 * Generate data access report (Data Protection Act 843)
 */
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only AUDITOR, HR Director, and Security Admin can view data access reports
    if (!isAuditor(user) && !isHRDirector(user) && !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions to view data access reports' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default: last 30 days
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date()
    const staffId = searchParams.get('staffId') || undefined
    const dataType = searchParams.get('dataType') || undefined
    const userId = searchParams.get('userId') || undefined
    const limit = parseInt(searchParams.get('limit') || '1000')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get data access logs
    const { logs, total } = await getDataAccessLogs({
      userId,
      staffId,
      dataType: dataType as any,
      startDate,
      endDate,
      limit,
      offset,
    })

    // Generate summary statistics
    const summary = {
      totalAccessEvents: total,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      accessByDataType: {} as Record<string, number>,
      accessByUser: {} as Record<string, number>,
      accessByAction: {} as Record<string, number>,
      generatedAt: new Date().toISOString(),
      generatedBy: user.id,
      generatedByRole: user.role,
    }

    // Calculate statistics
    for (const log of logs) {
      // By data type
      summary.accessByDataType[log.dataType] = 
        (summary.accessByDataType[log.dataType] || 0) + 1
      
      // By user
      summary.accessByUser[log.userId] = 
        (summary.accessByUser[log.userId] || 0) + 1
      
      // By action
      summary.accessByAction[log.action] = 
        (summary.accessByAction[log.action] || 0) + 1
    }

    return NextResponse.json({
      summary,
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      legalReference: 'Data Protection Act, 2012 (Act 843), Section 24',
    })
  } catch (error) {
    console.error('Error generating data access report:', error)
    return NextResponse.json(
      { error: 'Failed to generate data access report' },
      { status: 500 }
    )
  }
}, { allowedRoles: AUDIT_ROLES })

