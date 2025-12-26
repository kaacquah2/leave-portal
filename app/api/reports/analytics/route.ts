import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET analytics data
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const department = searchParams.get('department')
    const metric = searchParams.get('metric') || 'all'

    // Build date filter
    const dateFilter: any = {}
    if (startDate || endDate) {
      dateFilter.startDate = {}
      if (startDate) dateFilter.startDate.gte = new Date(startDate)
      if (endDate) dateFilter.startDate.lte = new Date(endDate)
    }

    // Build department filter
    const staffFilter: any = {}
    if (department && department !== 'all') {
      staffFilter.department = department
    }

    // Role-based access control
    let where: any = {
      ...dateFilter,
    }

    if (user.role === 'employee' && user.staffId) {
      where.staffId = user.staffId
    } else if (user.role === 'manager' && user.staffId) {
      const managerStaff = await prisma.staffMember.findUnique({
        where: { staffId: user.staffId },
        select: { department: true },
      })
      if (managerStaff) {
        staffFilter.department = managerStaff.department
      }
    }

    if (Object.keys(staffFilter).length > 0) {
      where.staff = staffFilter
    }

    // Fetch all leave requests
    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        staff: {
          select: {
            department: true,
            position: true,
            grade: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    })

    // Fetch staff data for calculations
    const staffWhere: any = { active: true }
    if (department && department !== 'all') {
      staffWhere.department = department
    }
    if (user.role === 'manager' && user.staffId) {
      const managerStaff = await prisma.staffMember.findUnique({
        where: { staffId: user.staffId },
        select: { department: true },
      })
      if (managerStaff) {
        staffWhere.department = managerStaff.department
      }
    }

    const staff = await prisma.staffMember.findMany({
      where: staffWhere,
      select: {
        staffId: true,
        department: true,
        position: true,
        grade: true,
      },
    })

    // Calculate analytics based on requested metric
    const analytics: any = {}

    if (metric === 'all' || metric === 'utilization') {
      // Leave utilization trends (monthly)
      const monthlyUtilization: Record<string, { month: string; days: number; count: number }> = {}
      
      leaves.forEach((leave) => {
        if (leave.status === 'approved') {
          const monthKey = `${leave.startDate.getFullYear()}-${String(leave.startDate.getMonth() + 1).padStart(2, '0')}`
          if (!monthlyUtilization[monthKey]) {
            monthlyUtilization[monthKey] = { month: monthKey, days: 0, count: 0 }
          }
          monthlyUtilization[monthKey].days += leave.days
          monthlyUtilization[monthKey].count += 1
        }
      })

      analytics.utilizationTrends = Object.values(monthlyUtilization).sort((a, b) => 
        a.month.localeCompare(b.month)
      )
    }

    if (metric === 'all' || metric === 'department') {
      // Department-wise comparisons
      const departmentStats: Record<string, { 
        department: string
        totalLeaves: number
        totalDays: number
        approvedLeaves: number
        approvedDays: number
        pendingLeaves: number
        staffCount: number
        avgDaysPerStaff: number
      }> = {}

      staff.forEach((s) => {
        if (!departmentStats[s.department]) {
          departmentStats[s.department] = {
            department: s.department,
            totalLeaves: 0,
            totalDays: 0,
            approvedLeaves: 0,
            approvedDays: 0,
            pendingLeaves: 0,
            staffCount: 0,
            avgDaysPerStaff: 0,
          }
        }
        departmentStats[s.department].staffCount += 1
      })

      leaves.forEach((leave) => {
        const dept = leave.staff.department
        if (!departmentStats[dept]) {
          departmentStats[dept] = {
            department: dept,
            totalLeaves: 0,
            totalDays: 0,
            approvedLeaves: 0,
            approvedDays: 0,
            pendingLeaves: 0,
            staffCount: 0,
            avgDaysPerStaff: 0,
          }
        }
        departmentStats[dept].totalLeaves += 1
        departmentStats[dept].totalDays += leave.days
        if (leave.status === 'approved') {
          departmentStats[dept].approvedLeaves += 1
          departmentStats[dept].approvedDays += leave.days
        } else if (leave.status === 'pending') {
          departmentStats[dept].pendingLeaves += 1
        }
      })

      // Calculate averages
      Object.values(departmentStats).forEach((stat) => {
        stat.avgDaysPerStaff = stat.staffCount > 0 
          ? stat.approvedDays / stat.staffCount 
          : 0
      })

      analytics.departmentComparison = Object.values(departmentStats)
    }

    if (metric === 'all' || metric === 'cost') {
      // Cost analysis (assuming average daily salary cost)
      // This is a simplified calculation - in production, you'd fetch actual salary data
      const avgDailyCost = 100 // Placeholder - should be calculated from actual salary data
      
      const costByDepartment: Record<string, { department: string; totalCost: number; days: number }> = {}
      const costByLeaveType: Record<string, { leaveType: string; totalCost: number; days: number }> = {}

      leaves.forEach((leave) => {
        if (leave.status === 'approved') {
          const cost = leave.days * avgDailyCost
          
          // By department
          const dept = leave.staff.department
          if (!costByDepartment[dept]) {
            costByDepartment[dept] = { department: dept, totalCost: 0, days: 0 }
          }
          costByDepartment[dept].totalCost += cost
          costByDepartment[dept].days += leave.days

          // By leave type
          if (!costByLeaveType[leave.leaveType]) {
            costByLeaveType[leave.leaveType] = { leaveType: leave.leaveType, totalCost: 0, days: 0 }
          }
          costByLeaveType[leave.leaveType].totalCost += cost
          costByLeaveType[leave.leaveType].days += leave.days
        }
      })

      analytics.costAnalysis = {
        totalCost: Object.values(costByDepartment).reduce((sum, d) => sum + d.totalCost, 0),
        totalDays: Object.values(costByDepartment).reduce((sum, d) => sum + d.days, 0),
        byDepartment: Object.values(costByDepartment),
        byLeaveType: Object.values(costByLeaveType),
        avgDailyCost,
      }
    }

    if (metric === 'all' || metric === 'predictive') {
      // Predictive analytics - identify peak leave periods
      const monthlyPattern: Record<string, number> = {}
      const dayOfWeekPattern: Record<string, number> = {}
      const leaveTypePattern: Record<string, number> = {}

      leaves.forEach((leave) => {
        if (leave.status === 'approved') {
          // Monthly pattern
          const month = leave.startDate.getMonth() + 1
          monthlyPattern[month] = (monthlyPattern[month] || 0) + leave.days

          // Day of week pattern (for start dates)
          const dayOfWeek = leave.startDate.getDay()
          dayOfWeekPattern[dayOfWeek] = (dayOfWeekPattern[dayOfWeek] || 0) + 1

          // Leave type pattern
          leaveTypePattern[leave.leaveType] = (leaveTypePattern[leave.leaveType] || 0) + leave.days
        }
      })

      // Find peak months
      const peakMonths = Object.entries(monthlyPattern)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([month, days]) => ({
          month: parseInt(month),
          monthName: new Date(2024, parseInt(month) - 1).toLocaleString('default', { month: 'long' }),
          days,
        }))

      analytics.predictive = {
        peakMonths,
        monthlyPattern: Object.entries(monthlyPattern).map(([month, days]) => ({
          month: parseInt(month),
          monthName: new Date(2024, parseInt(month) - 1).toLocaleString('default', { month: 'short' }),
          days,
        })),
        dayOfWeekPattern: Object.entries(dayOfWeekPattern).map(([day, count]) => ({
          day: parseInt(day),
          dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseInt(day)],
          count,
        })),
        leaveTypePattern: Object.entries(leaveTypePattern).map(([type, days]) => ({
          type,
          days,
        })),
      }
    }

    if (metric === 'all' || metric === 'summary') {
      // Overall summary statistics
      const approvedLeaves = leaves.filter((l) => l.status === 'approved')
      const pendingLeaves = leaves.filter((l) => l.status === 'pending')
      const rejectedLeaves = leaves.filter((l) => l.status === 'rejected')

      analytics.summary = {
        totalLeaves: leaves.length,
        approvedLeaves: approvedLeaves.length,
        pendingLeaves: pendingLeaves.length,
        rejectedLeaves: rejectedLeaves.length,
        totalApprovedDays: approvedLeaves.reduce((sum, l) => sum + l.days, 0),
        totalPendingDays: pendingLeaves.reduce((sum, l) => sum + l.days, 0),
        avgLeaveDuration: approvedLeaves.length > 0
          ? approvedLeaves.reduce((sum, l) => sum + l.days, 0) / approvedLeaves.length
          : 0,
        approvalRate: leaves.length > 0 ? (approvedLeaves.length / leaves.length) * 100 : 0,
        totalStaff: staff.length,
        activeStaff: staff.filter((s) => s).length,
      }
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin', 'manager'] })

