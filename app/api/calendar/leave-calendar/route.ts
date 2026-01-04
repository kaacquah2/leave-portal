import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { mapToMoFARole } from '@/lib/role-mapping'
import { hasPermission } from '@/lib/permissions'
import { getWeekendDates, formatCalendarDate } from '@/lib/calendar-utils'
import { parseISO, startOfDay, endOfDay } from 'date-fns'

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
    
    // Get user's staff record for organizational filtering
    let userStaff = null
    if (user.staffId) {
      userStaff = await prisma.staffMember.findUnique({
        where: { staffId: user.staffId },
        select: {
          unit: true,
          directorate: true,
          dutyStation: true,
          staffId: true,
          immediateSupervisorId: true,
          managerId: true,
        },
      })
    }
    
    // Build where clause based on role and permissions
    let where: any = {
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      status: { in: ['pending', 'approved'] }, // Only show pending and approved leaves
    }
    
    // Apply role-based filtering
    if (canViewOrg) {
      // HR roles see all - no additional filter needed
    } else if (canViewTeam) {
      // Team-level access
      if (normalizedRole === 'SUPERVISOR' || normalizedRole === 'supervisor' || normalizedRole === 'manager') {
        // Direct reports only
        if (user.staffId) {
          const directReports = await prisma.staffMember.findMany({
            where: {
              OR: [
                { managerId: user.staffId },
                { immediateSupervisorId: user.staffId },
              ],
            },
            select: { staffId: true },
          })
          const staffIds = directReports.map(s => s.staffId)
          if (staffIds.length > 0) {
            where.staffId = { in: staffIds }
          } else {
            where.staffId = { in: [] } // No direct reports
          }
        }
      } else if (normalizedRole === 'UNIT_HEAD' || normalizedRole === 'unit_head') {
        // Unit staff
        // Note: division_head is mapped to UNIT_HEAD during normalization
        if (userStaff?.unit) {
          const unitStaff = await prisma.staffMember.findMany({
            where: { unit: userStaff.unit },
            select: { staffId: true },
          })
          where.staffId = { in: unitStaff.map(s => s.staffId) }
        }
      } else if (normalizedRole === 'DIRECTOR' || normalizedRole === 'directorate_head' || normalizedRole === 'deputy_director') {
        // Note: regional_manager is mapped to DIRECTOR during normalization
        if (userStaff?.directorate) {
          const directorateStaff = await prisma.staffMember.findMany({
            where: { directorate: userStaff.directorate },
            select: { staffId: true },
          })
          where.staffId = { in: directorateStaff.map(s => s.staffId) }
        }
      }
    } else if (canViewOwn) {
      // Own leave only
      if (user.staffId) {
        where.staffId = user.staffId
      } else {
        return NextResponse.json({ leaves: [], holidays: [], conflicts: [], weekends: [] })
      }
    }
    
    // Apply additional filters
    if (department) {
      const deptStaff = await prisma.staffMember.findMany({
        where: { department },
        select: { staffId: true },
      })
      const deptStaffIds = deptStaff.map(s => s.staffId)
      if (where.staffId) {
        where.staffId = { in: Array.isArray(where.staffId.in) ? where.staffId.in.filter((id: string) => deptStaffIds.includes(id)) : [] }
      } else {
        where.staffId = { in: deptStaffIds }
      }
    }
    
    if (unit) {
      const unitStaff = await prisma.staffMember.findMany({
        where: { unit },
        select: { staffId: true },
      })
      const unitStaffIds = unitStaff.map(s => s.staffId)
      if (where.staffId) {
        where.staffId = { in: Array.isArray(where.staffId.in) ? where.staffId.in.filter((id: string) => unitStaffIds.includes(id)) : [] }
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

