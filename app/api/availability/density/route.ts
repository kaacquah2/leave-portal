import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { mapToMoFARole } from '@/lib/role-mapping'
import { hasPermission } from '@/lib/permissions'
import { format, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns'

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'

// GET leave density analytics
export async function GET(request: NextRequest) {
  // During static export build, return early without accessing cookies
  const isBuild = typeof process !== 'undefined' && 
                  process.env.ELECTRON === '1' && 
                  (process.env.NEXT_PHASE === 'phase-production-build' || !globalThis.window)
  
  if (isBuild) {
    return NextResponse.json({
      density: [],
      peakPeriods: [],
      trends: { overall: 'stable', byDepartment: [] },
      note: 'Static export build - density analytics requires runtime',
    })
  }

  // At runtime, dynamically import withAuth to avoid static analysis detection
  const runtimeHandler = async () => {
    const { withAuth } = await import('@/lib/auth-proxy')
    return withAuth(async ({ user, request }: AuthContext): Promise<NextResponse<any>> => {
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
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const department = searchParams.get('department')
    const unit = searchParams.get('unit')
    const granularity = searchParams.get('granularity') || 'day'
    
    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate, endDate' },
        { status: 400 }
      )
    }
    
    const startDate = parseISO(startDateStr)
    const endDate = parseISO(endDateStr)
    
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
    
    // Build staff filter (similar to other endpoints)
    let staffWhere: any = { active: true }
    
    if (canViewAll) {
      // All staff
    } else if (canViewTeam) {
      if (normalizedRole === 'SUPERVISOR' || normalizedRole === 'supervisor' || normalizedRole === 'manager') {
        if (user.staffId) {
          staffWhere.OR = [
            { managerId: user.staffId },
            { immediateSupervisorId: user.staffId },
          ]
        }
      } else if (normalizedRole === 'UNIT_HEAD' || normalizedRole === 'unit_head') {
        // Note: division_head is mapped to UNIT_HEAD during normalization
        if (userStaff?.unit) {
          staffWhere.unit = userStaff.unit
        }
      } else if (normalizedRole === 'DIRECTOR' || normalizedRole === 'directorate_head' || normalizedRole === 'deputy_director') {
        // Note: regional_manager is mapped to DIRECTOR during normalization
        if (userStaff?.directorate) {
          staffWhere.directorate = userStaff.directorate
        }
      }
    }
    
    if (department) {
      staffWhere.department = department
    }
    if (unit) {
      staffWhere.unit = unit
    }
    
    // Get total staff count
    const totalStaff = await prisma.staffMember.count({ where: staffWhere })
    
    // Get staff IDs
    const staffInScope = await prisma.staffMember.findMany({
      where: staffWhere,
      select: { staffId: true, department: true },
    })
    const staffIds = staffInScope.map(s => s.staffId)
    
    if (staffIds.length === 0) {
      return NextResponse.json({
        density: [],
        peakPeriods: [],
        trends: { overall: 'stable', byDepartment: [] },
      })
    }
    
    // Get leaves in date range
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
            department: true,
          },
        },
      },
    })
    
    // Build density data based on granularity
    const density: Array<{
      period: string
      totalStaff: number
      avgStaffOnLeave: number
      peakDays: number
      peakDate?: string
      availabilityRate: number
      trend: 'increasing' | 'decreasing' | 'stable'
    }> = []
    
    const peakPeriods: Array<{
      period: string
      date: string
      staffOnLeave: number
      percentage: number
    }> = []
    
    if (granularity === 'day') {
      const dates = eachDayOfInterval({ start: startDate, end: endDate })
      const dateMap = new Map<string, number>()
      
      for (const leave of leaves) {
        const leaveDates = eachDayOfInterval({ start: leave.startDate, end: leave.endDate })
        for (const date of leaveDates) {
          if (date >= startDate && date <= endDate) {
            const dateStr = format(date, 'yyyy-MM-dd')
            dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1)
          }
        }
      }
      
      for (const date of dates) {
        const dateStr = format(date, 'yyyy-MM-dd')
        const staffOnLeave = dateMap.get(dateStr) || 0
        const availabilityRate = totalStaff > 0 ? ((totalStaff - staffOnLeave) / totalStaff) * 100 : 100
        
        density.push({
          period: dateStr,
          totalStaff,
          avgStaffOnLeave: staffOnLeave,
          peakDays: staffOnLeave,
          peakDate: dateStr,
          availabilityRate: Math.round(availabilityRate * 100) / 100,
          trend: 'stable', // TODO: Calculate trend
        })
      }
    } else if (granularity === 'week') {
      // Group by week
      const weeks = new Map<string, number[]>()
      
      for (const leave of leaves) {
        const leaveDates = eachDayOfInterval({ start: leave.startDate, end: leave.endDate })
        for (const date of leaveDates) {
          if (date >= startDate && date <= endDate) {
            const weekStart = startOfWeek(date, { weekStartsOn: 1 })
            const weekKey = format(weekStart, 'yyyy-MM-dd')
            const existing = weeks.get(weekKey) || []
            existing.push(1)
            weeks.set(weekKey, existing)
          }
        }
      }
      
      for (const [weekKey, counts] of weeks.entries()) {
        const avgStaffOnLeave = counts.length
        const availabilityRate = totalStaff > 0 ? ((totalStaff - avgStaffOnLeave) / totalStaff) * 100 : 100
        
        density.push({
          period: weekKey,
          totalStaff,
          avgStaffOnLeave,
          peakDays: Math.max(...counts),
          availabilityRate: Math.round(availabilityRate * 100) / 100,
          trend: 'stable',
        })
      }
    } else if (granularity === 'month') {
      // Group by month
      const months = new Map<string, number[]>()
      
      for (const leave of leaves) {
        const leaveDates = eachDayOfInterval({ start: leave.startDate, end: leave.endDate })
        for (const date of leaveDates) {
          if (date >= startDate && date <= endDate) {
            const monthStart = startOfMonth(date)
            const monthKey = format(monthStart, 'yyyy-MM')
            const existing = months.get(monthKey) || []
            existing.push(1)
            months.set(monthKey, existing)
          }
        }
      }
      
      for (const [monthKey, counts] of months.entries()) {
        const avgStaffOnLeave = counts.length
        const availabilityRate = totalStaff > 0 ? ((totalStaff - avgStaffOnLeave) / totalStaff) * 100 : 100
        
        density.push({
          period: monthKey,
          totalStaff,
          avgStaffOnLeave,
          peakDays: Math.max(...counts),
          availabilityRate: Math.round(availabilityRate * 100) / 100,
          trend: 'stable',
        })
      }
    }
    
    // Find peak periods
    const sortedDensity = [...density].sort((a, b) => b.avgStaffOnLeave - a.avgStaffOnLeave)
    const topPeaks = sortedDensity.slice(0, 10)
    
    for (const peak of topPeaks) {
      peakPeriods.push({
        period: peak.period,
        date: peak.peakDate || peak.period,
        staffOnLeave: peak.avgStaffOnLeave,
        percentage: Math.round((peak.avgStaffOnLeave / totalStaff) * 100 * 100) / 100,
      })
    }
    
    // Calculate trends (simplified - compare first half vs second half)
    const midPoint = Math.floor(density.length / 2)
    const firstHalf = density.slice(0, midPoint)
    const secondHalf = density.slice(midPoint)
    
    const firstHalfAvg = firstHalf.length > 0
      ? firstHalf.reduce((sum, d) => sum + d.avgStaffOnLeave, 0) / firstHalf.length
      : 0
    const secondHalfAvg = secondHalf.length > 0
      ? secondHalf.reduce((sum, d) => sum + d.avgStaffOnLeave, 0) / secondHalf.length
      : 0
    
    let overallTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (secondHalfAvg > firstHalfAvg * 1.1) {
      overallTrend = 'increasing'
    } else if (secondHalfAvg < firstHalfAvg * 0.9) {
      overallTrend = 'decreasing'
    }
    
    // Group by department for trends
    const byDepartment = new Map<string, number[]>()
    for (const staff of staffInScope) {
      const dept = staff.department || 'Unknown'
      if (!byDepartment.has(dept)) {
        byDepartment.set(dept, [])
      }
    }
    
    for (const leave of leaves) {
      const dept = leave.staff.department || 'Unknown'
      const existing = byDepartment.get(dept) || []
      existing.push(1)
      byDepartment.set(dept, existing)
    }
    
    const byDepartmentTrends = Array.from(byDepartment.entries()).map(([dept, counts]) => {
      // Simplified trend calculation
      return {
        department: dept,
        trend: 'stable' as const,
      }
    })
    
    return NextResponse.json({
      density: density.sort((a, b) => a.period.localeCompare(b.period)),
      peakPeriods,
      trends: {
        overall: overallTrend,
        byDepartment: byDepartmentTrends,
      },
    })
  } catch (error) {
    console.error('Error fetching density analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch density analytics' },
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
    })(request)
  }
  
  return runtimeHandler()
}

