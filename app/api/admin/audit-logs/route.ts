import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'


// GET audit logs
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {

    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100
    const action = searchParams.get('action')
    const staffId = searchParams.get('staffId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    if (action) where.action = action
    if (staffId) where.staffId = staffId
    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      take: limit,
      orderBy: { timestamp: 'desc' },
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin'] })

