/**
 * Approve/Reject Balance Override API
 * 
 * Ghana Government Compliance: Only HR Director can approve balance overrides
 * Per requirement: Require HR Director approval for manual balance adjustments
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isHRDirector } from '@/lib/auth-proxy'
import { createAuditLog } from '@/lib/audit-logger'

// Force static export configuration (required for static export mode)
// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

/**
 * POST /api/balances/override/[id]/approve
 * Approve a balance override request (HR Director only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request }: AuthContext) => {
    try {
      // Only HR Director can approve overrides
      if (!isHRDirector(user)) {
        return NextResponse.json(
          { error: 'Forbidden - HR Director access required to approve balance overrides' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const { approved, rejectionReason } = body

      if (approved === undefined) {
        return NextResponse.json(
          { error: 'Missing required field: approved (boolean)' },
          { status: 400 }
        )
      }

      // Get override request
      const override = await prisma.leaveBalanceOverride.findUnique({
        where: { id },
        include: {
          staff: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      if (!override) {
        return NextResponse.json(
          { error: 'Balance override request not found' },
          { status: 404 }
        )
      }

      if (override.status !== 'pending') {
        return NextResponse.json(
          { error: `Override request is already ${override.status}` },
          { status: 400 }
        )
      }

      if (approved) {
        // Approve: Update balance
        const balanceFieldMap: Record<string, string> = {
          'Annual': 'annual',
          'Sick': 'sick',
          'Unpaid': 'unpaid',
          'Special Service': 'specialService',
          'Training': 'training',
          'Study': 'study',
          'Maternity': 'maternity',
          'Paternity': 'paternity',
          'Compassionate': 'compassionate',
        }

        const balanceField = balanceFieldMap[override.leaveType]
        if (!balanceField) {
          return NextResponse.json(
            { error: `Invalid leave type: ${override.leaveType}` },
            { status: 400 }
          )
        }

        // Update balance
        await prisma.leaveBalance.update({
          where: { staffId: override.staffId },
          data: {
            [balanceField]: override.newBalance,
          },
        })

        // Update override status
        await prisma.leaveBalanceOverride.update({
          where: { id },
          data: {
            status: 'approved',
            approvedBy: user.id,
            approvedAt: new Date(),
          },
        })

        // Log approval for audit
        await createAuditLog({
          action: 'balance_override_approved',
          user: user.id,
          userRole: user.role,
          staffId: override.staffId,
          details: `Balance override approved: ${override.leaveType} adjusted from ${override.previousBalance} to ${override.newBalance} days. Reason: ${override.reason}`,
          metadata: {
            overrideId: id,
            leaveType: override.leaveType,
            previousBalance: override.previousBalance,
            newBalance: override.newBalance,
            adjustment: override.adjustment,
            reason: override.reason,
          },
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        })

        return NextResponse.json({
          message: 'Balance override approved and balance updated',
          override: {
            ...override,
            status: 'approved',
            approvedBy: user.id,
            approvedAt: new Date(),
          },
        })
      } else {
        // Reject: Require rejection reason
        if (!rejectionReason || rejectionReason.trim().length < 10) {
          return NextResponse.json(
            { error: 'Rejection reason is required (minimum 10 characters)' },
            { status: 400 }
          )
        }

        // Update override status
        await prisma.leaveBalanceOverride.update({
          where: { id },
          data: {
            status: 'rejected',
            approvedBy: user.id,
            approvedAt: new Date(),
            rejectionReason,
          },
        })

        // Log rejection for audit
        await createAuditLog({
          action: 'balance_override_rejected',
          user: user.id,
          userRole: user.role,
          staffId: override.staffId,
          details: `Balance override rejected: ${override.leaveType} adjustment request. Reason: ${rejectionReason}`,
          metadata: {
            overrideId: id,
            leaveType: override.leaveType,
            previousBalance: override.previousBalance,
            requestedBalance: override.newBalance,
            rejectionReason,
          },
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        })

        return NextResponse.json({
          message: 'Balance override rejected',
          override: {
            ...override,
            status: 'rejected',
            approvedBy: user.id,
            approvedAt: new Date(),
            rejectionReason,
          },
        })
      }
    } catch (error) {
      console.error('Error processing balance override:', error)
      return NextResponse.json(
        { error: 'Failed to process balance override' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['HR_DIRECTOR', 'hr_director'] })(request)
}

