import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { mapToMoFARole } from '@/lib/roles'
import { hasPermission } from '@/lib/roles'
import { calculateConflicts, DEFAULT_THRESHOLDS } from '@/lib/conflict-detection'
import { eachDayOfInterval, format, parseISO } from 'date-fns'

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'

// GET conflict detection data
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const normalizedRole = mapToMoFARole(user.role)
    
    // Check permissions
    const canViewTeam = hasPermission(normalizedRole, 'calendar:view:team')
    const canViewOrg = hasPermission(normalizedRole, 'calendar:view:organization')
    
    if (!canViewTeam && !canViewOrg) {
      return NextResponse.json(
        { error: 'Forbidden - No calendar access permission' },
        { status: 403 }
      )
    }
    
    const searchParams = request.nextUrl.searchParams
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const department = searchParams.get('department')
    const unit = searchParams.get('unit')
    const thresholdStr = searchParams.get('threshold')
    
    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate, endDate' },
        { status: 400 }
      )
    }
    
    const startDate = parseISO(startDateStr)
    const endDate = parseISO(endDateStr)
    const threshold = thresholdStr ? parseFloat(thresholdStr) : DEFAULT_THRESHOLDS.medium
    
    // Get date range
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate })
    const dateStrings = dateRange.map(d => format(d, 'yyyy-MM-dd'))
    
    // Get user's staff record
    let userStaff = null
    if (user.staffId) {
      userStaff = await prisma.staffMember.findUnique({
        where: { staffId: user.staffId },
        select: {
          unit: true,
          directorate: true,
          dutyStation: true,
        },
      })
    }
    
    // Determine scope
    const scope = {
      department: department || undefined,
      unit: unit || (canViewOrg ? undefined : userStaff?.unit || undefined),
    }
    
    // Build staff filter based on scope
    let staffWhere: any = { active: true }
    if (scope.unit) {
      staffWhere.unit = scope.unit
    } else if (scope.department) {
      staffWhere.department = scope.department
    } else if (canViewOrg) {
      // All staff
    } else {
      // Apply role-based filtering (similar to calendar endpoint)
      if (normalizedRole === 'SUPERVISOR' || normalizedRole === 'supervisor' || normalizedRole === 'manager') {
        if (user.staffId) {
          staffWhere.OR = [
            { managerId: user.staffId },
            { immediateSupervisorId: user.staffId },
          ]
        }
      } else if (normalizedRole === 'UNIT_HEAD' || normalizedRole === 'unit_head') {
        if (userStaff?.unit) {
          staffWhere.unit = userStaff.unit
        }
      } else if (normalizedRole === 'DIRECTOR' || normalizedRole === 'directorate_head' || normalizedRole === 'deputy_director') {
        if (userStaff?.directorate) {
          staffWhere.directorate = userStaff.directorate
        }
      }
    }
    
    // Get total staff count
    const totalStaff = await prisma.staffMember.count({ where: staffWhere })
    
    if (totalStaff === 0) {
      return NextResponse.json({ conflicts: [] })
    }
    
    // Get staff IDs in scope
    const staffInScope = await prisma.staffMember.findMany({
      where: staffWhere,
      select: { staffId: true, department: true, unit: true },
    })
    const staffIds = staffInScope.map(s => s.staffId)
    
    // Get all leaves in date range for staff in scope
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        staffId: { in: staffIds },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        status: { in: ['pending', 'approved'] },
      },
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            department: true,
            unit: true,
            position: true,
          },
        },
      },
    })
    
    // Build map of staff on leave by date
    const staffOnLeaveByDate = new Map<string, Array<{
      staffId: string
      staffName: string
      position: string
      leaveType: string
      department?: string
      unit?: string
    }>>()
    
    for (const leave of leaves) {
      const leaveStart = parseISO(format(leave.startDate, 'yyyy-MM-dd'))
      const leaveEnd = parseISO(format(leave.endDate, 'yyyy-MM-dd'))
      const leaveDates = eachDayOfInterval({ start: leaveStart, end: leaveEnd })
      
      for (const date of leaveDates) {
        const dateStr = format(date, 'yyyy-MM-dd')
        if (dateStrings.includes(dateStr)) {
          const existing = staffOnLeaveByDate.get(dateStr) || []
          existing.push({
            staffId: leave.staffId,
            staffName: `${leave.staff.firstName} ${leave.staff.lastName}`,
            position: leave.staff.position,
            leaveType: leave.leaveType,
            department: leave.staff.department,
            unit: leave.staff.unit || undefined,
          })
          staffOnLeaveByDate.set(dateStr, existing)
        }
      }
    }
    
    // Calculate conflicts
    const totalStaffByScope = new Map<string, number>()
    const scopeKey = scope.unit ? `unit:${scope.unit}` : scope.department ? `department:${scope.department}` : 'all'
    totalStaffByScope.set(scopeKey, totalStaff)
    
    const conflicts = calculateConflicts(
      dateStrings,
      staffOnLeaveByDate,
      totalStaffByScope,
      scope,
      { ...DEFAULT_THRESHOLDS, medium: threshold }
    )
    
    return NextResponse.json({ conflicts })
  } catch (error) {
    console.error('Error calculating conflicts:', error)
    return NextResponse.json(
      { error: 'Failed to calculate conflicts' },
      { status: 500 }
    )
  }
}, {
  allowedRoles: [
    'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR',
    'REGIONAL_MANAGER', 'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR',
    'AUDITOR', 'supervisor', 'unit_head', 'division_head',
    'directorate_head', 'regional_manager', 'hr_officer', 'hr_director',
    'chief_director', 'hr', 'manager', 'deputy_director',
  ],
})

