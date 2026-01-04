/**
 * HR Validation API
 * Allows HR Officer to validate leave eligibility before final approval
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { getUserRBACContext, canApproveLeaveRequest } from '@/lib/mofa-rbac-middleware'
import { updateApprovalStep, getApprovalSteps } from '@/lib/ghana-civil-service-approval-workflow-db'
import { validateBeforeApproval } from '@/lib/ghana-civil-service-compliance'

// Force static export configuration
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const body = await request.json()
      const { validated, comments } = body

      // Check permissions
      const rbacContext = await getUserRBACContext(user)
      if (!rbacContext) {
        return NextResponse.json({ error: 'Unable to verify user permissions' }, { status: 500 })
      }

      const approvalPermission = await canApproveLeaveRequest(rbacContext, id)
      if (!approvalPermission.allowed) {
        return NextResponse.json(
          { error: approvalPermission.reason || 'Permission denied', errorCode: approvalPermission.errorCode },
          { status: 403 }
        )
      }

      // Get leave request
      const leave = await prisma.leaveRequest.findUnique({
        where: { id },
        include: {
          staff: true,
          approvalSteps: {
            orderBy: { level: 'asc' },
          },
        },
      })

      if (!leave) {
        return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
      }

      // Find HR Officer approval step
      const hrStep = leave.approvalSteps.find(s => s.approverRole === 'HR_OFFICER' && s.status === 'pending')
      if (!hrStep) {
        return NextResponse.json(
          { error: 'HR validation step not found or already completed' },
          { status: 400 }
        )
      }

      // Validate before approval
      if (validated && user.staffId) {
        const complianceCheck = await validateBeforeApproval(id, user.staffId)
        if (!complianceCheck.valid) {
          return NextResponse.json(
            {
              error: 'Compliance validation failed',
              errorCode: 'COMPLIANCE_VALIDATION_FAILED',
              errors: complianceCheck.errors,
            },
            { status: 400 }
          )
        }
      }

      // Update HR validation step
      const stepStatus = validated ? 'approved' : 'rejected'
      await updateApprovalStep(
        id,
        hrStep.level,
        stepStatus,
        user.id,
        user.email || 'HR Officer',
        comments
      )

      // Update leave request HR validation fields
      await prisma.leaveRequest.update({
        where: { id },
        data: {
          hrValidated: validated,
          hrValidatedBy: validated ? user.staffId || user.id : null,
          hrValidatedAt: validated ? new Date() : null,
        },
      })

      return NextResponse.json({
        success: true,
        message: validated ? 'Leave validated by HR Officer' : 'Leave validation rejected by HR Officer',
        hrValidated: validated,
      })
    } catch (error) {
      console.error('Error validating leave:', error)
      return NextResponse.json(
        { error: 'Failed to validate leave' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['HR_OFFICER', 'hr_officer', 'hr', 'hr_assistant'] })(request)
}

