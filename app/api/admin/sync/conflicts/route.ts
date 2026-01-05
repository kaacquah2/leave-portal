import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin } from '@/lib/auth'
import { ADMIN_ROLES } from '@/lib/roles'

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


// GET sync conflicts
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
    const days = parseInt(searchParams.get('days') || '30')
    const limit = parseInt(searchParams.get('limit') || '50')

    const since = new Date()
    since.setDate(since.getDate() - days)

    const conflicts = await prisma.auditLog.findMany({
      where: {
        action: 'SYNC_CONFLICT',
        timestamp: {
          gte: since,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    })

    // Parse conflict details
    const parsedConflicts = conflicts.map(conflict => {
      try {
        const details = JSON.parse(conflict.details || '{}')
        return {
          id: conflict.id,
          timestamp: conflict.timestamp,
          user: conflict.user,
          staffId: conflict.staffId,
          conflictType: details.type || 'unknown',
          localData: details.localData,
          serverData: details.serverData,
          resolution: details.resolution || 'pending',
          details: conflict.details,
        }
      } catch {
        return {
          id: conflict.id,
          timestamp: conflict.timestamp,
          user: conflict.user,
          staffId: conflict.staffId,
          details: conflict.details,
        }
      }
    })

    return NextResponse.json({
      conflicts: parsedConflicts,
      total: conflicts.length,
      unresolved: parsedConflicts.filter(c => c.resolution === 'pending').length,
      period: `${days} days`,
    })
  } catch (error) {
    console.error('Error fetching sync conflicts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync conflicts' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

