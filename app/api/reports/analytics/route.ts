/**
 * GET /api/reports/analytics
 * 
 * Get analytics data for dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'

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

      return NextResponse.json({
        success: true,
        summary: {
          total: totalLeaves,
          pending: pendingLeaves,
          approved: approvedLeaves,
          rejected: rejectedLeaves,
          approvalRate: Math.round(approvalRate * 100) / 100,
          avgProcessingTimeHours: Math.round((avgProcessingTime / (1000 * 60 * 60)) * 100) / 100,
        },
        byType: typeStats,
        byStatus: statusStats,
        byDepartment: departmentStats,
        recent: recentLeaves.map((leave) => ({
          id: leave.id,
          staffId: leave.staffId,
          staffName: `${leave.staff?.firstName || ''} ${leave.staff?.lastName || ''}`.trim(),
          department: leave.staff?.department,
          leaveType: leave.leaveType,
          startDate: leave.startDate,
          endDate: leave.endDate,
          days: leave.days,
          status: leave.status,
          createdAt: leave.createdAt,
        })),
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

