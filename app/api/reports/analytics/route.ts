/**
 * GET /api/reports/analytics
 * 
 * Get analytics data for dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')
      const department = searchParams.get('department')

      const where: any = {}

      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) {
          where.createdAt.gte = new Date(startDate)
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate)
        }
      }

      // Department filter
      if (department && department !== 'all') {
        where.staff = {
          department,
        }
      }

      // Get leave statistics
      const [
        totalLeaves,
        pendingLeaves,
        approvedLeaves,
        rejectedLeaves,
        leavesByType,
        leavesByStatus,
        leavesByDepartment,
        recentLeaves,
      ] = await Promise.all([
        // Total leaves
        prisma.leaveRequest.count({ where }),

        // Pending leaves
        prisma.leaveRequest.count({
          where: { ...where, status: 'pending' },
        }),

        // Approved leaves
        prisma.leaveRequest.count({
          where: { ...where, status: 'approved' },
        }),

        // Rejected leaves
        prisma.leaveRequest.count({
          where: { ...where, status: 'rejected' },
        }),

        // Leaves by type
        prisma.leaveRequest.groupBy({
          by: ['leaveType'],
          where,
          _count: true,
        }),

        // Leaves by status
        prisma.leaveRequest.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),

        // Leaves by department
        prisma.leaveRequest.findMany({
          where,
          include: {
            staff: {
              select: {
                department: true,
              },
            },
          },
        }),

        // Recent leaves (last 10)
        prisma.leaveRequest.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            staff: {
              select: {
                staffId: true,
                firstName: true,
                lastName: true,
                department: true,
              },
            },
          },
        }),
      ])

      // Process department data
      const departmentStats: Record<string, number> = {}
      leavesByDepartment.forEach((leave) => {
        const dept = leave.staff?.department || 'Unknown'
        departmentStats[dept] = (departmentStats[dept] || 0) + 1
      })

      // Process leaves by type
      const typeStats: Record<string, number> = {}
      leavesByType.forEach((item) => {
        typeStats[item.leaveType] = item._count
      })

      // Process leaves by status
      const statusStats: Record<string, number> = {}
      leavesByStatus.forEach((item) => {
        statusStats[item.status] = item._count
      })

      // Calculate approval rate
      const totalProcessed = approvedLeaves + rejectedLeaves
      const approvalRate = totalProcessed > 0 
        ? (approvedLeaves / totalProcessed) * 100 
        : 0

      // Get average processing time (for approved/rejected leaves)
      const processedLeaves = await prisma.leaveRequest.findMany({
        where: {
          ...where,
          status: { in: ['approved', 'rejected'] },
          approvalDate: { not: null },
        },
        select: {
          createdAt: true,
          approvalDate: true,
        },
      })

      const processingTimes = processedLeaves
        .map((leave) => {
          if (!leave.approvalDate) return null
          return new Date(leave.approvalDate).getTime() - new Date(leave.createdAt).getTime()
        })
        .filter((time): time is number => time !== null)

      const avgProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0

      // Get approved leaves with days for calculations
      const approvedLeavesData = await prisma.leaveRequest.findMany({
        where: {
          ...where,
          status: 'approved',
        },
        select: {
          days: true,
        },
      })

      const totalApprovedDays = approvedLeavesData.reduce((sum, leave) => sum + leave.days, 0)
      const avgLeaveDuration = approvedLeavesData.length > 0
        ? totalApprovedDays / approvedLeavesData.length
        : 0

      // Get total staff count
      const staffWhere: any = {}
      if (department && department !== 'all') {
        staffWhere.department = department
      }
      const [totalStaff, activeStaff] = await Promise.all([
        prisma.staffMember.count({ where: staffWhere }),
        prisma.staffMember.count({ where: { ...staffWhere, active: true, employmentStatus: 'active' } }),
      ])

      // Generate utilization trends (monthly)
      const utilizationTrends: Array<{ month: string; days: number; count: number }> = []
      if (startDate && endDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)
        const months: Record<string, { days: number; count: number }> = {}

        const approvedLeavesForTrend = await prisma.leaveRequest.findMany({
          where: {
            ...where,
            status: 'approved',
          },
          select: {
            startDate: true,
            days: true,
          },
        })

        approvedLeavesForTrend.forEach((leave) => {
          const monthKey = new Date(leave.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
          if (!months[monthKey]) {
            months[monthKey] = { days: 0, count: 0 }
          }
          months[monthKey].days += leave.days
          months[monthKey].count += 1
        })

        Object.entries(months).forEach(([month, data]) => {
          utilizationTrends.push({ month, ...data })
        })
        utilizationTrends.sort((a, b) => {
          const dateA = new Date(a.month + ' 1')
          const dateB = new Date(b.month + ' 1')
          return dateA.getTime() - dateB.getTime()
        })
      }

      // Generate department comparison
      const departmentComparison: Array<{
        department: string
        totalLeaves: number
        totalDays: number
        approvedLeaves: number
        approvedDays: number
        pendingLeaves: number
        staffCount: number
        avgDaysPerStaff: number
      }> = []

      const deptLeaves = await prisma.leaveRequest.findMany({
        where,
        include: {
          staff: {
            select: {
              department: true,
            },
          },
        },
      })

      const deptStats: Record<string, any> = {}
      deptLeaves.forEach((leave) => {
        const dept = leave.staff?.department || 'Unknown'
        if (!deptStats[dept]) {
          deptStats[dept] = {
            totalLeaves: 0,
            totalDays: 0,
            approvedLeaves: 0,
            approvedDays: 0,
            pendingLeaves: 0,
            staffIds: new Set<string>(),
          }
        }
        deptStats[dept].totalLeaves++
        deptStats[dept].totalDays += leave.days
        deptStats[dept].staffIds.add(leave.staffId)
        if (leave.status === 'approved') {
          deptStats[dept].approvedLeaves++
          deptStats[dept].approvedDays += leave.days
        } else if (leave.status === 'pending') {
          deptStats[dept].pendingLeaves++
        }
      })

      // Get staff counts per department
      for (const [dept, stats] of Object.entries(deptStats)) {
        const staffCount = await prisma.staffMember.count({
          where: { department: dept },
        })
        departmentComparison.push({
          department: dept,
          totalLeaves: stats.totalLeaves,
          totalDays: stats.totalDays,
          approvedLeaves: stats.approvedLeaves,
          approvedDays: stats.approvedDays,
          pendingLeaves: stats.pendingLeaves,
          staffCount,
          avgDaysPerStaff: staffCount > 0 ? stats.approvedDays / staffCount : 0,
        })
      }

      // Generate predictive data (monthly patterns)
      const predictive = {
        peakMonths: [] as Array<{ month: number; monthName: string; days: number }>,
        monthlyPattern: [] as Array<{ month: number; monthName: string; days: number }>,
        dayOfWeekPattern: [] as Array<{ day: number; dayName: string; count: number }>,
        leaveTypePattern: [] as Array<{ type: string; days: number }>,
      }

      if (startDate && endDate) {
        const approvedLeavesForPattern = await prisma.leaveRequest.findMany({
          where: {
            ...where,
            status: 'approved',
          },
          select: {
            startDate: true,
            days: true,
            leaveType: true,
          },
        })

        // Monthly pattern
        const monthlyData: Record<number, number> = {}
        approvedLeavesForPattern.forEach((leave) => {
          const month = new Date(leave.startDate).getMonth() + 1
          monthlyData[month] = (monthlyData[month] || 0) + leave.days
        })

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        Object.entries(monthlyData).forEach(([month, days]) => {
          predictive.monthlyPattern.push({
            month: parseInt(month),
            monthName: monthNames[parseInt(month) - 1],
            days,
          })
        })

        // Leave type pattern
        const typeData: Record<string, number> = {}
        approvedLeavesForPattern.forEach((leave) => {
          typeData[leave.leaveType] = (typeData[leave.leaveType] || 0) + leave.days
        })
        Object.entries(typeData).forEach(([type, days]) => {
          predictive.leaveTypePattern.push({ type, days })
        })
      }

      return NextResponse.json({
        summary: {
          totalLeaves,
          approvedLeaves,
          pendingLeaves,
          rejectedLeaves,
          totalApprovedDays,
          avgLeaveDuration: Math.round(avgLeaveDuration * 100) / 100,
          approvalRate: Math.round(approvalRate * 100) / 100,
          totalStaff,
          activeStaff,
        },
        utilizationTrends,
        departmentComparison,
        costAnalysis: {
          totalCost: 0, // Cost calculation would require salary data
          totalDays: totalApprovedDays,
          byDepartment: departmentComparison.map((dept) => ({
            department: dept.department,
            totalCost: 0,
            days: dept.approvedDays,
          })),
          byLeaveType: Object.entries(typeStats).map(([leaveType, count]) => ({
            leaveType,
            totalCost: 0,
            days: 0, // Would need to calculate from actual leaves
          })),
          avgDailyCost: 0,
        },
        predictive,
      })
    } catch (error: any) {
      console.error('Error fetching analytics:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch analytics' },
        { status: 500 }
      )
    }
  })(request)
}

