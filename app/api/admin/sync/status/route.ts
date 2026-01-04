import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin } from '@/lib/auth-proxy'
import { ADMIN_ROLES } from '@/lib/role-utils'

// Force static export configuration
export const dynamic = 'force-static'

// GET sync status across all users/devices
export const GET = withAuth(async ({ user }: AuthContext) => {
  try {
    // Only admin can access this route
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get sync-related audit logs
    const syncLogs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['SYNC_STARTED', 'SYNC_COMPLETED', 'SYNC_FAILED', 'OFFLINE_ACTIVITY', 'SYNC_CONFLICT'],
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 100,
    })

    // Get failed sync attempts (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const failedSyncs = await prisma.auditLog.findMany({
      where: {
        action: 'SYNC_FAILED',
        timestamp: {
          gte: yesterday,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    })

    // Get offline activity logs
    const offlineActivity = await prisma.auditLog.findMany({
      where: {
        action: 'OFFLINE_ACTIVITY',
        timestamp: {
          gte: yesterday,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    })

    // Get sync conflicts
    const conflicts = await prisma.auditLog.findMany({
      where: {
        action: 'SYNC_CONFLICT',
        timestamp: {
          gte: yesterday,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    })

    // Calculate statistics
    const stats = {
      totalSyncs: syncLogs.filter(l => l.action === 'SYNC_COMPLETED').length,
      failedSyncs: failedSyncs.length,
      offlineActivities: offlineActivity.length,
      conflicts: conflicts.length,
      lastSync: syncLogs.find(l => l.action === 'SYNC_COMPLETED')?.timestamp || null,
      lastFailure: failedSyncs[0]?.timestamp || null,
    }

    return NextResponse.json({
      stats,
      recentSyncs: syncLogs.slice(0, 20),
      failedSyncs: failedSyncs.slice(0, 10),
      offlineActivity: offlineActivity.slice(0, 20),
      conflicts: conflicts.slice(0, 10),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

