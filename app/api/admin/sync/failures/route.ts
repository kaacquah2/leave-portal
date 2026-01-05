import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin } from '@/lib/auth'
import { ADMIN_ROLES } from '@/lib/roles'

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


// GET failed sync attempts
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only admin can access this route
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const limit = parseInt(searchParams.get('limit') || '50')

    const since = new Date()
    since.setDate(since.getDate() - days)

    const failures = await prisma.auditLog.findMany({
      where: {
        action: 'SYNC_FAILED',
        timestamp: {
          gte: since,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    })

    // Group by user/device
    const failuresByUser = failures.reduce((acc, log) => {
      const userKey = log.user || 'unknown'
      if (!acc[userKey]) {
        acc[userKey] = []
      }
      acc[userKey].push({
        id: log.id,
        timestamp: log.timestamp,
        details: log.details,
        userRole: log.userRole,
        staffId: log.staffId,
      })
      return acc
    }, {} as Record<string, any[]>)

    return NextResponse.json({
      failures,
      failuresByUser,
      total: failures.length,
      period: `${days} days`,
    })
  } catch (error) {
    console.error('Error fetching sync failures:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync failures' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

