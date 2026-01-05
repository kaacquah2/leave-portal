import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { HR_ROLES, ADMIN_ROLES } from '@/lib/roles'

// Force static export configuration (required for static export mode)
// Generate static params for dynamic route
export function generateStaticParams() {
  return [{ staffId: 'dummy' }]
}

// GET leave balance for specific staff
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  const { staffId } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Employees can only view their own balance
      if (user.role === 'employee' && staffId !== user.staffId) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const balance = await prisma.leaveBalance.findUnique({
        where: { staffId },
        include: {
          staff: true,
        },
      })
      if (!balance) {
        return NextResponse.json({ error: 'Balance not found' }, { status: 404 })
      }
      return NextResponse.json(balance)
    } catch (error) {
      console.error('Error fetching balance:', error)
      return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 })
    }
  }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES, 'employee', 'EMPLOYEE', 'manager', 'deputy_director', 'SUPERVISOR', 'supervisor'] })(request)
}

