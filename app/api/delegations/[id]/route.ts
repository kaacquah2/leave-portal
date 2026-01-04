/**
 * PATCH /api/delegations/[id]
 * 
 * Revoke an approval delegation
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'
import { hasPermission, type UserRole } from '@/lib/permissions'

// Force static export configuration (required for static export mode)
// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Check permission
      if (!hasPermission(user.role as UserRole, 'leave:approve:team') && 
          !hasPermission(user.role as UserRole, 'leave:approve:all')) {
        return NextResponse.json(
          { error: 'You do not have permission to revoke delegations' },
          { status: 403 }
        )
      }

      // Get current user's staff record
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { staff: true },
      })

      if (!currentUser || !currentUser.staff) {
        return NextResponse.json(
          { error: 'User staff record not found' },
          { status: 404 }
        )
      }

      const delegatorId = currentUser.staff.staffId

      // Find the delegation
      const delegation = await prisma.approvalDelegation.findUnique({
        where: { id },
        include: {
          delegator: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
            },
          },
          delegatee: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      if (!delegation) {
        return NextResponse.json(
          { error: 'Delegation not found' },
          { status: 404 }
        )
      }

      // Check if user is the delegator (only delegator can revoke)
      if (delegation.delegatorId !== delegatorId) {
        return NextResponse.json(
          { error: 'You can only revoke your own delegations' },
          { status: 403 }
        )
      }

      // Check if already revoked
      if (delegation.status === 'revoked') {
        return NextResponse.json(
          { error: 'Delegation is already revoked' },
          { status: 400 }
        )
      }

      // Revoke the delegation
      const revoked = await prisma.approvalDelegation.update({
        where: { id },
        data: {
          status: 'revoked',
          revokedAt: new Date(),
          revokedBy: delegatorId,
        },
        include: {
          delegator: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          delegatee: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'APPROVAL_DELEGATION_REVOKED',
          user: user.email,
          userRole: user.role,
          details: JSON.stringify({
            delegationId: id,
            delegatorId: delegation.delegatorId,
            delegateeId: delegation.delegateeId,
            revokedAt: new Date().toISOString(),
          }),
        },
      })

      return NextResponse.json({
        success: true,
        delegation: revoked,
        message: 'Delegation revoked successfully',
      })
    } catch (error: any) {
      console.error('Error revoking delegation:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to revoke delegation' },
        { status: 500 }
      )
    }
  })(request)
}

