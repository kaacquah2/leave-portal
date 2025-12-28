import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'


// GET all audit logs
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR and admin can view audit logs
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100
    
    const logs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
    })
    return NextResponse.json(logs)
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin'] })

// POST create audit log
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const body = await request.json()
    const log = await prisma.auditLog.create({
      data: {
        action: body.action,
        user: body.user || user.email,
        staffId: body.staffId,
        details: body.details,
        ip: body.ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      },
    })
    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('Error creating audit log:', error)
    return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

