import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// PATCH revoke delegation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request }: AuthContext) => {
    try {
    const body = await request.json()
    const { action } = body // 'revoke'

    if (action !== 'revoke') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "revoke"' },
        { status: 400 }
      )
    }

    // Find delegation
    const delegation = await prisma.approvalDelegation.findUnique({
      where: { id },
    })

    if (!delegation) {
      return NextResponse.json(
        { error: 'Delegation not found' },
        { status: 404 }
      )
    }

    // Only delegator or HR/Admin can revoke
    if (user.role !== 'hr' && user.role !== 'admin' && delegation.delegatorId !== user.staffId) {
      return NextResponse.json(
        { error: 'You can only revoke your own delegations' },
        { status: 403 }
      )
    }

    if (delegation.status !== 'active') {
      return NextResponse.json(
        { error: 'Delegation is not active' },
        { status: 400 }
      )
    }

    // Revoke delegation
    const updated = await prisma.approvalDelegation.update({
      where: { id },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy: user.email || 'system',
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'APPROVAL_DELEGATION_REVOKED',
        user: user.email || 'system',
        staffId: delegation.delegatorId,
        details: `Delegation revoked: ${delegation.delegatorId} to ${delegation.delegateeId}`,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error revoking delegation:', error)
    return NextResponse.json(
      { error: 'Failed to revoke delegation' },
      { status: 500 }
    )
  }
  }, { allowedRoles: ['manager', 'hr', 'admin'] })(request)
}

