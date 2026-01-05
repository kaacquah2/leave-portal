import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { mapToMoFARole } from '@/lib/roles'
import { hasPermission } from '@/lib/roles'
import { format, addDays, startOfDay, parseISO } from 'date-fns'
import { buildStaffWhereClause } from '@/lib/data-scoping-utils'

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'

// GET upcoming critical absences
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const normalizedRole = mapToMoFARole(user.role)
    
    // Check permissions
    const canViewTeam = hasPermission(normalizedRole, 'availability:view:team')
    const canViewAll = hasPermission(normalizedRole, 'availability:view:all')
    
    if (!canViewTeam && !canViewAll) {
      return NextResponse.json(
        { error: 'Forbidden - No availability access permission' },
        { status: 403 }
      )
    }
    
    const searchParams = request.nextUrl.searchParams
    const daysStr = searchParams.get('days')
    const department = searchParams.get('department')
    const unit = searchParams.get('unit')
    const criticalOnly = searchParams.get('criticalOnly') === 'true'
    
    const days = daysStr ? parseInt(daysStr, 10) : 30
    const today = startOfDay(new Date())
    const endDate = addDays(today, days)
    
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
      return NextResponse.json({ upcoming: [], criticalAbsences: [] })
    }
    
    // Get staff IDs
    const staffInScope = await prisma.staffMember.findMany({
      where: staffWhere,
      select: { staffId: true, department: true, unit: true, position: true },
    })
    const staffIds = staffInScope.map(s => s.staffId)
    
    if (staffIds.length === 0) {
      return NextResponse.json({ upcoming: [], criticalAbsences: [] })
    }
    
    // Get upcoming leaves
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        staffId: { in: staffIds },
        startDate: { gte: today, lte: endDate },
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
      orderBy: { startDate: 'asc' },
    })
    
    // Define critical roles (can be configured)
    const criticalRoles = ['Director', 'Manager', 'Head', 'Chief', 'Principal']
    
    const upcoming = leaves.map(leave => {
      const isCritical = criticalRoles.some(role => 
        leave.staff.position.toLowerCase().includes(role.toLowerCase())
      )
      
      return {
        date: format(leave.startDate, 'yyyy-MM-dd'),
        staffId: leave.staffId,
        staffName: `${leave.staff.firstName} ${leave.staff.lastName}`,
        position: leave.staff.position,
        department: leave.staff.department,
        unit: leave.staff.unit,
        leaveType: leave.leaveType,
        startDate: format(leave.startDate, 'yyyy-MM-dd'),
        endDate: format(leave.endDate, 'yyyy-MM-dd'),
        days: leave.days,
        isCritical,
        coverageAvailable: false, // TODO: Check if coverage is assigned
      }
    })
    
    // Filter critical only if requested
    const filteredUpcoming = criticalOnly ? upcoming.filter(u => u.isCritical) : upcoming
    
    // Group critical absences by date and role
    const criticalAbsencesMap = new Map<string, Array<{
      date: string
      department: string
      unit: string
      criticalRole: string
      staffOnLeave: Array<{ staffId: string; staffName: string }>
      coverageStaff: Array<{ staffId: string; staffName: string }>
    }>>()
    
    for (const item of upcoming.filter(u => u.isCritical)) {
      const key = `${item.date}-${item.unit || item.department}`
      const existing = criticalAbsencesMap.get(key) || []
      
      const existingItem = existing.find(e => e.date === item.date && e.unit === item.unit)
      if (existingItem) {
        existingItem.staffOnLeave.push({
          staffId: item.staffId,
          staffName: item.staffName,
        })
      } else {
        existing.push({
          date: item.date,
          department: item.department,
          unit: item.unit || 'Unknown',
          criticalRole: item.position,
          staffOnLeave: [{
            staffId: item.staffId,
            staffName: item.staffName,
          }],
          coverageStaff: [], // TODO: Get coverage staff
        })
      }
      
      criticalAbsencesMap.set(key, existing)
    }
    
    return NextResponse.json({
      upcoming: filteredUpcoming,
      criticalAbsences: Array.from(criticalAbsencesMap.values()),
    })
  } catch (error) {
    console.error('Error fetching upcoming availability:', error)
    return NextResponse.json(
      { error: 'Failed to fetch upcoming availability' },
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

