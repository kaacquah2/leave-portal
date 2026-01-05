import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isHR, isAdmin } from '@/lib/auth'
import { AUDIT_ROLES } from '@/lib/roles'

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'

// GET audit logs
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only HR, HR Assistant, and admin can view audit logs
      if (!isHR(user) && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const { searchParams } = new URL(request.url)
      const limit = parseInt(searchParams.get('limit') || '100', 10)

      const logs = await prisma.auditLog.findMany({
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
  }, { allowedRoles: AUDIT_ROLES })(request)
}

