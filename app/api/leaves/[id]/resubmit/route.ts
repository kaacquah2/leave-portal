import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { createApprovalSteps } from '@/lib/ghana-civil-service-approval-workflow-db'
import { determineCivilServiceApprovalWorkflow } from '@/lib/ghana-civil-service-approval-workflow'
import { logComprehensiveAudit } from '@/lib/comprehensive-audit'
import { notifyLeaveSubmission } from '@/lib/notification-service'

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Get original rejected leave request
      const originalLeave = await prisma.leaveRequest.findUnique({
        where: { id },
        include: {
          staff: true,
          approvalSteps: {
            orderBy: { level: 'asc' },
          },
        },
      })

      if (!originalLeave) {
        return NextResponse.json(
          { error: 'Leave request not found' },
          { status: 404 }
        )
      }

      // Verify it's rejected
      if (originalLeave.status !== 'rejected') {
        return NextResponse.json(
          { error: 'Only rejected leave requests can be resubmitted' },
          { status: 400 }
        )
      }

      // Verify user owns this leave request
      if (user.staffId !== originalLeave.staffId) {
        return NextResponse.json(
          { error: 'You can only resubmit your own leave requests' },
          { status: 403 }
        )
      }

      // Check resubmission limit (max 3 attempts)
      const resubmissionCount = originalLeave.resubmissionCount || 0
      if (resubmissionCount >= 3) {
        return NextResponse.json(
          { error: 'Maximum resubmission attempts (3) reached. Please create a new leave request.' },
          { status: 400 }
        )
      }

      // Get staff info for workflow determination
      const staffInfo = {
        staffId: originalLeave.staff.staffId,
        dutyStation: originalLeave.staff.dutyStation as 'HQ' | 'Region' | 'District' | 'Agency' | null,
        directorate: originalLeave.staff.directorate,
        division: originalLeave.staff.division,
        unit: originalLeave.staff.unit,
        immediateSupervisorId: originalLeave.staff.immediateSupervisorId,
        managerId: originalLeave.staff.managerId,
        grade: originalLeave.staff.grade || '',
        position: originalLeave.staff.position || '',
      }

      // Determine approval workflow
      const approvalLevels = await determineCivilServiceApprovalWorkflow(
        staffInfo,
        originalLeave.leaveType,
        originalLeave.days
      )

      // Create new leave request (resubmission)
      const resubmittedLeave = await prisma.leaveRequest.create({
        data: {
          staffId: originalLeave.staffId,
          staffName: originalLeave.staffName,
          leaveType: originalLeave.leaveType,
          startDate: originalLeave.startDate,
          endDate: originalLeave.endDate,
          days: originalLeave.days,
          reason: originalLeave.reason,
          status: 'pending',
          resubmittedFromId: id,
          resubmissionCount: resubmissionCount + 1,
          officerTakingOver: originalLeave.officerTakingOver,
          handoverNotes: originalLeave.handoverNotes,
          declarationAccepted: originalLeave.declarationAccepted,
          requiresExternalClearance: originalLeave.requiresExternalClearance,
          externalClearanceStatus: originalLeave.externalClearanceStatus,
          pscReferenceNumber: originalLeave.pscReferenceNumber,
          ohcsReferenceNumber: originalLeave.ohcsReferenceNumber,
          externalClearanceDate: originalLeave.externalClearanceDate,
          payrollImpactFlag: originalLeave.payrollImpactFlag,
        },
      })

      // Create approval steps
      await createApprovalSteps(resubmittedLeave.id, approvalLevels)

      // Update approvalLevels JSON for backward compatibility
      await prisma.leaveRequest.update({
        where: { id: resubmittedLeave.id },
        data: {
          approvalLevels: approvalLevels as any,
        },
      })

      // Get rejection comments from original request's approval steps
      const rejectedStep = originalLeave.approvalSteps.find(
        (step) => step.status === 'rejected'
      )
      const rejectionComments = rejectedStep?.comments || 'No comments provided'

      // Audit log
      await logComprehensiveAudit({
        action: 'leave_resubmitted',
        userId: user.id,
        userRole: user.role,
        userEmail: user.email,
        staffId: originalLeave.staffId,
        leaveRequestId: resubmittedLeave.id,
        details: `Leave request resubmitted from rejected request ${id}. Resubmission count: ${resubmissionCount + 1}. Original rejection reason: ${rejectionComments}`,
        metadata: {
          originalLeaveId: id,
          resubmissionCount: resubmissionCount + 1,
          rejectionComments,
        },
        ip: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      })

      // Notify first approver
      if (approvalLevels.length > 0) {
        const firstLevel = approvalLevels[0]
        // Resolve approver for first level
        const { resolveApprover } = await import('@/lib/acting-appointment-resolver')
        const approver = await resolveApprover(
          firstLevel.approverRole,
          originalLeave.staffId,
          originalLeave.staff.unit || undefined
        )

        if (approver?.userId) {
          await notifyLeaveSubmission({
            leaveRequestId: resubmittedLeave.id,
            staffId: originalLeave.staffId,
            staffName: originalLeave.staffName,
            leaveType: originalLeave.leaveType,
            days: originalLeave.days,
            approverIds: [approver.userId],
          })
        }
      }

      return NextResponse.json({
        success: true,
        leaveRequest: resubmittedLeave,
        message: 'Leave request resubmitted successfully',
        resubmissionCount: resubmissionCount + 1,
      })
    } catch (error: any) {
      console.error('Error resubmitting leave:', error)
      return NextResponse.json(
        { error: 'Failed to resubmit leave request', details: error.message },
        { status: 500 }
      )
    }
  })(request)
}

