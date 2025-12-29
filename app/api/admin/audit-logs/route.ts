import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET audit logs (admin only)
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only admin can access this route
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const action = searchParams.get('action')
    const userFilter = searchParams.get('user')

    // Build where clause
    const where: any = {}
    if (action) {
      where.action = action
    }
    if (userFilter) {
      where.user = {
        contains: userFilter,
        mode: 'insensitive',
      }
    }

    // Get total count
    const total = await prisma.auditLog.count({ where })

    // Get logs
    const logs = await prisma.auditLog.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { timestamp: 'desc' },
    })

    // Format response to match what the frontend expects
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      user: log.user,
      staffId: log.staffId,
      details: log.details,
      timestamp: log.timestamp,
      ip: log.ip,
    }))

    return NextResponse.json({
      logs: formattedLogs,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['admin'] })

