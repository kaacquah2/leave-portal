import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { mapToMoFARole } from '@/lib/roles'
import { hasPermission } from '@/lib/roles'
import { getWeekendDates, formatCalendarDate } from '@/lib/calendar-utils'
import { parseISO, startOfDay, endOfDay } from 'date-fns'
import { buildLeaveWhereClause } from '@/lib/data-scoping-utils'

// GET leave calendar data

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const normalizedRole = mapToMoFARole(user.role)
    
    // Check permissions
    const canViewOwn = hasPermission(normalizedRole, 'calendar:view:own')
    const canViewTeam = hasPermission(normalizedRole, 'calendar:view:team')
    const canViewOrg = hasPermission(normalizedRole, 'calendar:view:organization')
    
    if (!canViewOwn && !canViewTeam && !canViewOrg) {
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
    const leaveType = searchParams.get('leaveType')
    
    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate, endDate' },
        { status: 400 }
      )
    }
    
    const startDate = parseISO(startDateStr)
    const endDate = parseISO(endDateStr)
    
    // Build where clause based on user role with proper data scoping
    const { where: scopedWhere, hasAccess } = await buildLeaveWhereClause({
      id: user.id,
      role: user.role,
      staffId: user.staffId,
    })
    
    if (!hasAccess) {
      return NextResponse.json({ leaves: [], holidays: [], conflicts: [], weekends: [] })
    }
    
    // Build where clause with date range and status filters
    let where: any = {
      ...scopedWhere,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      status: { in: ['pending', 'approved'] }, // Only show pending and approved leaves
    }
    
    // Apply additional filters (must respect scoping)
    if (department) {
      const deptStaff = await prisma.staffMember.findMany({
        where: { department, active: true },
        select: { staffId: true },
      })
      const deptStaffIds = deptStaff.map(s => s.staffId)
      if (where.staffId) {
        // Intersect with existing scope
        const existingIds = Array.isArray(where.staffId.in) ? where.staffId.in : (where.staffId ? [where.staffId] : [])
        where.staffId = { in: existingIds.filter((id: string) => deptStaffIds.includes(id)) }
      } else {
        where.staffId = { in: deptStaffIds }
      }
    }
    
    if (unit) {
      const unitStaff = await prisma.staffMember.findMany({
        where: { unit, active: true },
        select: { staffId: true },
      })
      const unitStaffIds = unitStaff.map(s => s.staffId)
      if (where.staffId) {
        // Intersect with existing scope
        const existingIds = Array.isArray(where.staffId.in) ? where.staffId.in : (where.staffId ? [where.staffId] : [])
        where.staffId = { in: existingIds.filter((id: string) => unitStaffIds.includes(id)) }
      } else {
        where.staffId = { in: unitStaffIds }
      }
    }
    
    if (leaveType) {
      where.leaveType = leaveType
    }
    
    // Fetch leaves
    const leaves = await prisma.leaveRequest.findMany({
      where,
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
      orderBy: { startDate: 'asc' },
    })
    
    // Fetch holidays in date range
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate),
        },
      },
      orderBy: { date: 'asc' },
    })
    
    // Get weekends
    const weekends = getWeekendDates(startDate, endDate)
    
    // Format response
    const formattedLeaves = leaves.map(leave => ({
      id: leave.id,
      staffId: leave.staffId,
      staffName: `${leave.staff.firstName} ${leave.staff.lastName}`,
      leaveType: leave.leaveType,
      startDate: formatCalendarDate(leave.startDate),
      endDate: formatCalendarDate(leave.endDate),
      days: leave.days,
      status: leave.status,
      department: leave.staff.department,
      unit: leave.staff.unit,
      position: leave.staff.position,
    }))
    
    const formattedHolidays = holidays.map(holiday => ({
      id: holiday.id,
      name: holiday.name,
      date: formatCalendarDate(holiday.date),
      type: holiday.type,
    }))
    
    return NextResponse.json({
      leaves: formattedLeaves,
      holidays: formattedHolidays,
      weekends,
      conflicts: [], // Conflicts calculated separately via /api/calendar/conflicts
    })
  } catch (error) {
    console.error('Error fetching leave calendar:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leave calendar' },
      { status: 500 }
    )
  }
}, {
  allowedRoles: [
    'EMPLOYEE', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR',
    'REGIONAL_MANAGER', 'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR',
    'AUDITOR', 'employee', 'supervisor', 'unit_head', 'division_head',
    'directorate_head', 'regional_manager', 'hr_officer', 'hr_director',
    'chief_director', 'hr', 'manager', 'deputy_director',
  ],
})

