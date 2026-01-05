import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { mapToMoFARole } from '@/lib/roles'
import { hasPermission } from '@/lib/roles'
import { format, startOfDay, endOfDay, parseISO } from 'date-fns'
import { buildStaffWhereClause } from '@/lib/data-scoping-utils'

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'

// GET who is on leave today
export const GET = withAuth(async ({ user, request }: AuthContext): Promise<NextResponse<any>> => {
  try {
    const normalizedRole = mapToMoFARole(user.role)
    
    // Check permissions
    const canViewOwn = hasPermission(normalizedRole, 'availability:view:own')
    const canViewTeam = hasPermission(normalizedRole, 'availability:view:team')
    const canViewAll = hasPermission(normalizedRole, 'availability:view:all')
    
    if (!canViewOwn && !canViewTeam && !canViewAll) {
      return NextResponse.json(
        { error: 'Forbidden - No availability access permission' },
        { status: 403 }
      )
    }
    
    const searchParams = request.nextUrl.searchParams
    const dateStr = searchParams.get('date')
    const department = searchParams.get('department')
    const unit = searchParams.get('unit')
    
    const today = dateStr ? parseISO(dateStr) : new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)
    
    // Build staff filter based on role with proper data scoping
    const additionalFilters: Record<string, any> = {}
    if (department) {
      additionalFilters.department = department
    }
    if (unit) {
      additionalFilters.unit = unit
    }
    
    const { where: staffWhere, hasAccess } = await buildStaffWhereClause({
      id: user.id,
      role: user.role,
      staffId: user.staffId,
    }, additionalFilters)
    
    if (!hasAccess) {
      return NextResponse.json({
        date: format(today, 'yyyy-MM-dd'),
        totalStaff: 0,
        staffOnLeaveCount: 0,
        staffAvailable: 0,
        availabilityRate: 0,
        staffOnLeave: [],
        byDepartment: [],
        byUnit: [],
      })
    }
    
    // Get total staff count
    const totalStaff = await prisma.staffMember.count({ where: staffWhere })
    
    // Get staff IDs
    const staffInScope = await prisma.staffMember.findMany({
      where: staffWhere,
      select: { staffId: true, department: true, unit: true },
    })
    const staffIds = staffInScope.map(s => s.staffId)
    
    if (staffIds.length === 0) {
      return NextResponse.json({
        date: format(today, 'yyyy-MM-dd'),
        totalStaff: 0,
        staffOnLeaveCount: 0,
        staffAvailable: 0,
        availabilityRate: 0,
        staffOnLeave: [],
        byDepartment: [],
        byUnit: [],
      })
    }
    
    // Get leaves for today
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        staffId: { in: staffIds },
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
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
    
    const staffOnLeave = leaves.map(leave => ({
      staffId: leave.staffId,
      staffName: `${leave.staff.firstName} ${leave.staff.lastName}`,
      department: leave.staff.department,
      unit: leave.staff.unit,
      position: leave.staff.position,
      leaveType: leave.leaveType,
      startDate: format(leave.startDate, 'yyyy-MM-dd'),
      endDate: format(leave.endDate, 'yyyy-MM-dd'),
      days: leave.days,
    }))
    
    const staffOnLeaveCount = staffOnLeave.length
    const staffAvailable = totalStaff - staffOnLeaveCount
    const availabilityRate = totalStaff > 0 ? (staffAvailable / totalStaff) * 100 : 0
    
    // Group by department
    const byDepartment = new Map<string, { department: string; totalStaff: number; staffOnLeave: number }>()
    for (const staff of staffInScope) {
      const dept = staff.department || 'Unknown'
      const current = byDepartment.get(dept) || { department: dept, totalStaff: 0, staffOnLeave: 0 }
      current.totalStaff++
      byDepartment.set(dept, current)
    }
    for (const leave of leaves) {
      const dept = leave.staff.department || 'Unknown'
      const current = byDepartment.get(dept)
      if (current) {
        current.staffOnLeave++
      }
    }
    
    // Group by unit
    const byUnit = new Map<string, { unit: string; totalStaff: number; staffOnLeave: number }>()
    for (const staff of staffInScope) {
      const unit = staff.unit || 'Unknown'
      const current = byUnit.get(unit) || { unit, totalStaff: 0, staffOnLeave: 0 }
      current.totalStaff++
      byUnit.set(unit, current)
    }
    for (const leave of leaves) {
      const unit = leave.staff.unit || 'Unknown'
      const current = byUnit.get(unit)
      if (current) {
        current.staffOnLeave++
      }
    }
    
    return NextResponse.json({
      date: format(today, 'yyyy-MM-dd'),
      totalStaff,
      staffOnLeaveCount,
      staffAvailable,
      availabilityRate: Math.round(availabilityRate * 100) / 100,
      staffOnLeave,
      byDepartment: Array.from(byDepartment.values()).map(d => ({
        ...d,
        availabilityRate: d.totalStaff > 0 ? Math.round((d.totalStaff - d.staffOnLeave) / d.totalStaff * 100 * 100) / 100 : 0,
      })),
      byUnit: Array.from(byUnit.values()).map(u => ({
        ...u,
        availabilityRate: u.totalStaff > 0 ? Math.round((u.totalStaff - u.staffOnLeave) / u.totalStaff * 100 * 100) / 100 : 0,
      })),
    })
  } catch (error) {
    console.error('Error fetching today availability:', error)
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
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

