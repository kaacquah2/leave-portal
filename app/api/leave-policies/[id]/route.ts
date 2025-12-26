import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// PATCH update leave policy
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request }: AuthContext) => {
    try {
      const body = await request.json()
      const policy = await prisma.leavePolicy.update({
        where: { id },
        data: {
          ...(body.maxDays !== undefined && { maxDays: body.maxDays }),
          ...(body.accrualRate !== undefined && { accrualRate: body.accrualRate }),
          ...(body.carryoverAllowed !== undefined && { carryoverAllowed: body.carryoverAllowed }),
          ...(body.maxCarryover !== undefined && { maxCarryover: body.maxCarryover }),
          ...(body.requiresApproval !== undefined && { requiresApproval: body.requiresApproval }),
          ...(body.approvalLevels !== undefined && { approvalLevels: body.approvalLevels }),
          ...(body.active !== undefined && { active: body.active }),
        },
      })
      return NextResponse.json(policy)
    } catch (error) {
      console.error('Error updating leave policy:', error)
      return NextResponse.json({ error: 'Failed to update leave policy' }, { status: 500 })
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

