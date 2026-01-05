import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin } from '@/lib/auth'
import { ADMIN_ROLES } from '@/lib/roles'

// Force static export configuration
export const dynamic = 'force-static'

// GET system statistics
export const GET = withAuth(async ({ user }: AuthContext) => {
  try {
    // Only admin can access this route
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get comprehensive system statistics
    const [
      totalUsers,
      activeUsers,
      totalStaff,
      activeStaff,
      totalLeaveRequests,
      pendingLeaveRequests,
      totalAuditLogs,
      totalNotifications,
      totalDocuments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.staffMember.count(),
      prisma.staffMember.count({ 
        where: { 
          active: true, 
          employmentStatus: 'active' 
        } 
      }),
      prisma.leaveRequest.count(),
      prisma.leaveRequest.count({ where: { status: 'pending' } }),
      prisma.auditLog.count(),
      prisma.notification.count(),
      prisma.document.count(),
    ])

    // Get role distribution
    const roleDistribution = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true,
      },
      where: {
        active: true,
      },
    })

    // Get recent activity (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const recentActivity = await prisma.auditLog.count({
      where: {
        timestamp: {
          gte: yesterday,
        },
      },
    })

    // Get leave requests by status
    const leaveByStatus = await prisma.leaveRequest.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    })

    return NextResponse.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        roleDistribution: roleDistribution.map(r => ({
          role: r.role,
          count: r._count.role,
        })),
      },
      staff: {
        total: totalStaff,
        active: activeStaff,
        inactive: totalStaff - activeStaff,
      },
      leaveRequests: {
        total: totalLeaveRequests,
        pending: pendingLeaveRequests,
        byStatus: leaveByStatus.map(s => ({
          status: s.status,
          count: s._count.status,
        })),
      },
      system: {
        totalAuditLogs,
        totalNotifications,
        totalDocuments,
        recentActivity24h: recentActivity,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching system statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system statistics' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

