/**
 * MoFA Compliance Reports API
 * Provides: Leave utilization, pending approvals, payroll impacts, audit logs
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { AUDIT_ROLES, mapToMoFARole, canViewAuditLogs, isHRRole, isAdminRole } from '@/lib/roles'

// GET compliance reports

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only authorized roles can access reports
    const normalizedRole = mapToMoFARole(user.role)
    
    if (!canViewAuditLogs(normalizedRole) && !isHRRole(normalizedRole) && !isAdminRole(normalizedRole)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions for compliance reports' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'utilization'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const directorate = searchParams.get('directorate')
    const division = searchParams.get('division')
    const unit = searchParams.get('unit')

    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    let reportData: any
    switch (reportType) {
      case 'utilization':
        reportData = await getLeaveUtilizationReport({ dateFilter, directorate, division, unit })
        break
      
      case 'pending':
        reportData = await getPendingApprovalsReport({ directorate, division, unit })
        break
      
      case 'payroll':
        reportData = await getPayrollImpactsReport({ dateFilter })
        break
      
      case 'audit':
        reportData = await getAuditLogsReport({ dateFilter, startDate, endDate })
        break
      
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }
    
    return NextResponse.json(reportData)
  } catch (error) {
    console.error('Error generating compliance report:', error)
    return NextResponse.json(
      { error: 'Failed to generate compliance report' },
      { status: 500 }
    )
  }
}, { allowedRoles: AUDIT_ROLES })

/**
 * Leave Utilization Report by Directorate/Unit/Region
 */
async function getLeaveUtilizationReport(filters: {
  dateFilter: any
  directorate?: string | null
  division?: string | null
  unit?: string | null
}) {
  const where: any = {
    status: 'approved',
    ...(filters.dateFilter.gte || filters.dateFilter.lte ? { approvalDate: filters.dateFilter } : {}),
  }

  const staffWhere: any = {}
  if (filters.directorate) staffWhere.directorate = filters.directorate
  if (filters.division) staffWhere.division = filters.division
  if (filters.unit) staffWhere.unit = filters.unit

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      ...where,
      staff: staffWhere,
    },
    include: {
      staff: {
        select: {
          staffId: true,
          firstName: true,
          lastName: true,
          directorate: true,
          division: true,
          unit: true,
          dutyStation: true,
        },
      },
    },
  })

  // Group by directorate
  const byDirectorate: Record<string, any> = {}
  const byDivision: Record<string, any> = {}
  const byUnit: Record<string, any> = {}
  const byRegion: Record<string, any> = {}
  const byLeaveType: Record<string, any> = {}

  let totalDays = 0
  let totalRequests = 0

  for (const leave of leaves) {
    totalDays += leave.days
    totalRequests++

    // By Directorate
    const dir = leave.staff.directorate || 'Unassigned'
    if (!byDirectorate[dir]) {
      byDirectorate[dir] = { days: 0, requests: 0, staff: new Set() }
    }
    byDirectorate[dir].days += leave.days
    byDirectorate[dir].requests++
    byDirectorate[dir].staff.add(leave.staffId)

    // By Division
    const div = leave.staff.division || 'Unassigned'
    if (!byDivision[div]) {
      byDivision[div] = { days: 0, requests: 0, staff: new Set() }
    }
    byDivision[div].days += leave.days
    byDivision[div].requests++
    byDivision[div].staff.add(leave.staffId)

    // By Unit
    const unit = leave.staff.unit || 'Unassigned'
    if (!byUnit[unit]) {
      byUnit[unit] = { days: 0, requests: 0, staff: new Set() }
    }
    byUnit[unit].days += leave.days
    byUnit[unit].requests++
    byUnit[unit].staff.add(leave.staffId)

    // By Region
    const region = leave.staff.dutyStation || 'HQ'
    if (!byRegion[region]) {
      byRegion[region] = { days: 0, requests: 0, staff: new Set() }
    }
    byRegion[region].days += leave.days
    byRegion[region].requests++
    byRegion[region].staff.add(leave.staffId)

    // By Leave Type
    if (!byLeaveType[leave.leaveType]) {
      byLeaveType[leave.leaveType] = { days: 0, requests: 0 }
    }
    byLeaveType[leave.leaveType].days += leave.days
    byLeaveType[leave.leaveType].requests++
  }

  // Convert Sets to counts
  Object.keys(byDirectorate).forEach(key => {
    byDirectorate[key].staffCount = byDirectorate[key].staff.size
    delete byDirectorate[key].staff
  })
  Object.keys(byDivision).forEach(key => {
    byDivision[key].staffCount = byDivision[key].staff.size
    delete byDivision[key].staff
  })
  Object.keys(byUnit).forEach(key => {
    byUnit[key].staffCount = byUnit[key].staff.size
    delete byUnit[key].staff
  })
  Object.keys(byRegion).forEach(key => {
    byRegion[key].staffCount = byRegion[key].staff.size
    delete byRegion[key].staff
  })

  return {
    reportType: 'utilization',
    period: filters.dateFilter,
    summary: {
      totalDays,
      totalRequests,
      averageDaysPerRequest: totalRequests > 0 ? (totalDays / totalRequests).toFixed(2) : 0,
    },
    byDirectorate,
    byDivision,
    byUnit,
    byRegion,
    byLeaveType,
  }
}

/**
 * Pending Approvals Report
 */
async function getPendingApprovalsReport(filters: {
  directorate?: string | null
  division?: string | null
  unit?: string | null
}) {
  const staffWhere: any = {}
  if (filters.directorate) staffWhere.directorate = filters.directorate
  if (filters.division) staffWhere.division = filters.division
  if (filters.unit) staffWhere.unit = filters.unit

  const pendingLeaves = await prisma.leaveRequest.findMany({
    where: {
      status: 'pending',
      staff: staffWhere,
    },
    include: {
      staff: {
        select: {
          staffId: true,
          firstName: true,
          lastName: true,
          directorate: true,
          division: true,
          unit: true,
          dutyStation: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Group by approval level
  const byLevel: Record<number, any[]> = {}
  const byRole: Record<string, any[]> = {}
  const overdue: any[] = []

  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

  for (const leave of pendingLeaves) {
    const approvalLevels = (leave.approvalLevels as any[]) || []
    const pendingLevel = approvalLevels.find((level: any) => level.status === 'pending')

    if (pendingLevel) {
      const level = pendingLevel.level
      const role = pendingLevel.approverRole

      if (!byLevel[level]) byLevel[level] = []
      if (!byRole[role]) byRole[role] = []

      const leaveData = {
        id: leave.id,
        staffId: leave.staffId,
        staffName: leave.staffName,
        leaveType: leave.leaveType,
        days: leave.days,
        createdAt: leave.createdAt,
        daysPending: Math.floor((now.getTime() - leave.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        currentLevel: level,
        approverRole: role,
      }

      byLevel[level].push(leaveData)
      byRole[role].push(leaveData)

      if (leave.createdAt < threeDaysAgo) {
        overdue.push(leaveData)
      }
    }
  }

  return {
    reportType: 'pending',
    summary: {
      totalPending: pendingLeaves.length,
      overdue: overdue.length,
      byLevelCount: Object.keys(byLevel).length,
      byRoleCount: Object.keys(byRole).length,
    },
    byLevel,
    byRole,
    overdue,
  }
}

/**
 * Payroll Impacts Report
 */
async function getPayrollImpactsReport(filters: { dateFilter: any }) {
  const where: any = {
    payrollImpactFlag: true,
    ...(filters.dateFilter.gte || filters.dateFilter.lte ? { approvalDate: filters.dateFilter } : {}),
  }

  const payrollLeaves = await prisma.leaveRequest.findMany({
    where,
    include: {
      staff: {
        select: {
          staffId: true,
          firstName: true,
          lastName: true,
          directorate: true,
          grade: true,
        },
      },
    },
  })

  const byLeaveType: Record<string, any> = {}
  const byGrade: Record<string, any> = {}
  let totalUnpaidDays = 0

  for (const leave of payrollLeaves) {
    if (leave.leaveType === 'Unpaid') {
      totalUnpaidDays += leave.days
    }

    // By Leave Type
    if (!byLeaveType[leave.leaveType]) {
      byLeaveType[leave.leaveType] = { count: 0, totalDays: 0, staff: new Set() }
    }
    byLeaveType[leave.leaveType].count++
    byLeaveType[leave.leaveType].totalDays += leave.days
    byLeaveType[leave.leaveType].staff.add(leave.staffId)

    // By Grade
    const grade = leave.staff.grade || 'Unassigned'
    if (!byGrade[grade]) {
      byGrade[grade] = { count: 0, totalDays: 0, staff: new Set() }
    }
    byGrade[grade].count++
    byGrade[grade].totalDays += leave.days
    byGrade[grade].staff.add(leave.staffId)
  }

  // Convert Sets to counts
  Object.keys(byLeaveType).forEach(key => {
    byLeaveType[key].staffCount = byLeaveType[key].staff.size
    delete byLeaveType[key].staff
  })
  Object.keys(byGrade).forEach(key => {
    byGrade[key].staffCount = byGrade[key].staff.size
    delete byGrade[key].staff
  })

  return {
    reportType: 'payroll',
    period: filters.dateFilter,
    summary: {
      totalPayrollImpacts: payrollLeaves.length,
      totalUnpaidDays,
      affectedStaff: new Set(payrollLeaves.map(l => l.staffId)).size,
    },
    byLeaveType,
    byGrade,
    details: payrollLeaves.map(l => ({
      id: l.id,
      staffId: l.staffId,
      staffName: l.staffName,
      leaveType: l.leaveType,
      days: l.days,
      startDate: l.startDate,
      endDate: l.endDate,
      approvalDate: l.approvalDate,
    })),
  }
}

/**
 * Audit Logs Report
 */
async function getAuditLogsReport(filters: { dateFilter: any; startDate?: string | null; endDate?: string | null }) {
  const where: any = {}
  if (filters.dateFilter.gte || filters.dateFilter.lte) {
    where.timestamp = filters.dateFilter
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: 1000, // Limit for performance
  })

  // Group by action type
  const byAction: Record<string, number> = {}
  const byRole: Record<string, number> = {}
  const byUser: Record<string, number> = {}

  for (const log of logs) {
    byAction[log.action] = (byAction[log.action] || 0) + 1
    if (log.userRole) {
      byRole[log.userRole] = (byRole[log.userRole] || 0) + 1
    }
    byUser[log.user] = (byUser[log.user] || 0) + 1
  }

  return {
    reportType: 'audit',
    period: filters.dateFilter,
    summary: {
      totalLogs: logs.length,
      uniqueUsers: Object.keys(byUser).length,
      dateRange: {
        start: filters.startDate || logs[logs.length - 1]?.timestamp,
        end: filters.endDate || logs[0]?.timestamp,
      },
    },
    byAction,
    byRole,
    topUsers: Object.entries(byUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([user, count]) => ({ user, count })),
    recentLogs: logs.slice(0, 100).map(log => ({
      id: log.id,
      action: log.action,
      user: log.user,
      userRole: log.userRole,
      staffId: log.staffId,
      timestamp: log.timestamp,
      details: log.details,
    })),
  }
}

