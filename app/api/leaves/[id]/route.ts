import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushNotification } from '@/lib/send-push-notification'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { READ_ONLY_ROLES } from '@/lib/role-utils'
import { sendEmail, generateLeaveRequestApprovedEmail, generateLeaveRequestRejectedEmail } from '@/lib/email'
import { createStaffSnapshot } from '@/lib/staff-versioning'
import { calculateApprovalStatus, areParallelApprovalsComplete, getNextApprovers } from '@/lib/approval-workflow'
import { validateLeaveBalance, deductLeaveBalance, restoreLeaveBalance, getBalanceFieldName } from '@/lib/leave-balance-utils'
import { 
  calculateCivilServiceApprovalStatus, 
  validateApproverNotSelf, 
  getNextCivilServiceApprovers,
  updateApprovalStep,
  getApprovalSteps 
} from '@/lib/ghana-civil-service-approval-workflow'
import { createApprovalSteps } from '@/lib/ghana-civil-service-approval-workflow-db'
import { requiresExternalClearance } from '@/lib/ghana-civil-service-approval-workflow'
import { validateBeforeApproval } from '@/lib/ghana-civil-service-compliance'

// Force static export configuration (required for static export mode)
// Generate static params for dynamic route
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}
import { logLeaveApproval, logLeaveRejection, logBalanceDeduction, logBalanceRestoration } from '@/lib/audit-logger'
import { notifyLeaveDecision, notifyLeaveSubmission } from '@/lib/notification-service'
import { getUserRBACContext, canApproveLeaveRequest, canViewLeaveRequest } from '@/lib/mofa-rbac-middleware'

// GET single leave request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // RBAC: Check if user can view this leave request
      const rbacContext = await getUserRBACContext(user)
      if (!rbacContext) {
        return NextResponse.json(
          { error: 'Unable to verify user permissions' },
          { status: 500 }
        )
      }

      const viewPermission = await canViewLeaveRequest(rbacContext, id)
      if (!viewPermission.allowed) {
        return NextResponse.json(
          { 
            error: viewPermission.reason || 'Access denied',
            errorCode: viewPermission.errorCode 
          },
          { status: 403 }
        )
      }

      const leave = await prisma.leaveRequest.findUnique({
        where: { id },
        include: {
          staff: true,
          template: true,
          approvalSteps: {
            orderBy: { level: 'asc' },
          },
          attachments: true,
        },
      })
      
      if (!leave) {
        return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
      }
      
      return NextResponse.json(leave)
    } catch (error) {
      console.error('Error fetching leave:', error)
      return NextResponse.json({ error: 'Failed to fetch leave' }, { status: 500 })
    }
  }, { allowedRoles: READ_ONLY_ROLES })(request)
}

// PATCH update leave request (for approval/rejection)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
    const body = await request.json()
    
    // Use optimistic locking for concurrent approval handling
    const { updateLeaveRequestWithLock, detectConcurrentApproval } = await import('@/lib/optimistic-locking')
    
    // Detect potential concurrent approval conflicts
    const conflictCheck = await detectConcurrentApproval(id)
    if (conflictCheck.hasConflict) {
      return NextResponse.json({
        error: 'Concurrent approval detected',
        errorCode: 'CONCURRENT_APPROVAL_CONFLICT',
        conflictDetails: conflictCheck.conflictDetails,
        troubleshooting: [
          'Another approver may be processing this leave request',
          'Please refresh and try again',
          'If the issue persists, contact HR',
        ],
      }, { status: 409 }) // 409 Conflict
    }
    
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
    })
    
    if (!leave) {
      return NextResponse.json({ 
        error: 'Leave request not found',
        errorCode: 'LEAVE_NOT_FOUND',
        troubleshooting: [
          'The leave request may have been deleted',
          'Verify you have access to this leave request',
          'Refresh the page and try again',
          'Contact HR if you believe this is an error',
        ],
      }, { status: 404 })
    }
    
    // RBAC: Check if user can approve this leave request
    if (body.status && ['approved', 'rejected'].includes(body.status)) {
      const rbacContext = await getUserRBACContext(user)
      if (!rbacContext) {
        return NextResponse.json(
          { error: 'Unable to verify user permissions' },
          { status: 500 }
        )
      }

      const approvalPermission = await canApproveLeaveRequest(rbacContext, id, body.level)
      if (!approvalPermission.allowed) {
        return NextResponse.json(
          {
            error: approvalPermission.reason || 'Permission denied',
            errorCode: approvalPermission.errorCode,
            troubleshooting: getTroubleshootingTips(approvalPermission.errorCode),
          },
          { status: 403 }
        )
      }

      // Ghana Civil Service Compliance: Validate before approval
      if (body.status === 'approved' && user.staffId) {
        const complianceCheck = await validateBeforeApproval(id, user.staffId)
        if (!complianceCheck.valid) {
          return NextResponse.json(
            {
              error: 'Compliance validation failed',
              errorCode: 'COMPLIANCE_VALIDATION_FAILED',
              errors: complianceCheck.errors,
              troubleshooting: [
                'One or more compliance rules were not met',
                ...complianceCheck.errors,
                'Contact HR for assistance',
              ],
            },
            { status: 400 }
          )
        }
      }
    
      // Ghana Government Compliance: Check for retroactive approval
      if (body.status === 'approved' && leave.status !== 'approved') {
        const { checkRetroactiveApproval, validateRetroactiveJustification, hasRetroactiveApprovalAuthority } = await import('@/lib/workflow-safeguards')
        
        const retroactiveCheck = await checkRetroactiveApproval(id)
        
        if (retroactiveCheck.isRetroactive) {
          // Validate justification is provided
          const justificationValidation = validateRetroactiveJustification(
            body.retroactiveJustification,
            retroactiveCheck.daysPastStart
          )
          
          if (!justificationValidation.valid) {
            return NextResponse.json({
              error: justificationValidation.error || 'Justification required for retroactive approval',
              errorCode: 'RETROACTIVE_JUSTIFICATION_REQUIRED',
              isRetroactive: true,
              daysPastStart: retroactiveCheck.daysPastStart,
              requiresHigherApproval: retroactiveCheck.requiresHigherApproval,
              troubleshooting: [
                'This leave has already started',
                'Retroactive approvals require mandatory justification',
                retroactiveCheck.requiresHigherApproval
                  ? 'Approval more than 7 days past start date requires HR Director authorization'
                  : 'Provide a detailed justification for the retroactive approval',
              ],
            }, { status: 400 })
          }
          
          // Check if user has authority for this level of retroactive approval
          if (!hasRetroactiveApprovalAuthority(user.role, retroactiveCheck.requiresHigherApproval)) {
            return NextResponse.json({
              error: retroactiveCheck.errorMessage || 'Insufficient authority for retroactive approval',
              errorCode: 'RETROACTIVE_APPROVAL_AUTHORITY_REQUIRED',
              isRetroactive: true,
              daysPastStart: retroactiveCheck.daysPastStart,
              requiresHigherApproval: retroactiveCheck.requiresHigherApproval,
              requiredRole: retroactiveCheck.requiresHigherApproval ? 'HR_DIRECTOR or CHIEF_DIRECTOR' : 'HR_OFFICER, HR_DIRECTOR, or DIRECTOR',
              troubleshooting: [
                'Retroactive approvals require elevated authorization',
                retroactiveCheck.requiresHigherApproval
                  ? 'This approval requires HR Director or Chief Director authorization'
                  : 'This approval requires HR Officer, HR Director, or Director authorization',
                'Contact the appropriate authority for retroactive approval',
              ],
            }, { status: 403 })
          }
        }
        
        // CRITICAL FIX: Validate leave balance before approval
        const balanceValidation = await validateLeaveBalance(
          leave.staffId,
          leave.leaveType,
          leave.days
        )
        
        if (!balanceValidation.valid) {
          return NextResponse.json({
            error: balanceValidation.error || 'Insufficient leave balance',
            errorCode: 'INSUFFICIENT_BALANCE',
            currentBalance: balanceValidation.currentBalance,
            requestedDays: leave.days,
            troubleshooting: [
              'The staff member does not have sufficient leave balance',
              `Available: ${balanceValidation.currentBalance} days, Requested: ${leave.days} days`,
              'Contact HR if this leave should be approved despite insufficient balance',
            ],
          }, { status: 400 })
        }
      }
    }

    // Handle approval - use ApprovalSteps if available, fallback to JSON approvalLevels
    let approvalLevels = (leave.approvalLevels as any) || []
    let status = body.status || leave.status

    // Get current approver info
    const approverStaff = await prisma.staffMember.findUnique({
      where: { staffId: user.staffId || '' },
      select: { firstName: true, lastName: true },
    })
    const approverName = approverStaff
      ? `${approverStaff.firstName} ${approverStaff.lastName}`
      : body.approvedBy || user.email || 'Unknown'

    // Try to use ApprovalSteps first (preferred)
    const approvalSteps = await getApprovalSteps(id)
    if (approvalSteps.length > 0 && body.level !== undefined) {
      // Update ApprovalStep in database
      const stepStatus: 'approved' | 'rejected' | 'delegated' | 'skipped' = 
        body.status === 'approved' ? 'approved' : 
        body.status === 'rejected' ? 'rejected' : 
        'approved' // Default to approved if status is pending
      await updateApprovalStep(
        id,
        body.level,
        stepStatus,
        user.id,
        approverName,
        body.comments
      )

      // Recalculate status from ApprovalSteps
      const updatedSteps = await getApprovalSteps(id)
      const stepStatuses = updatedSteps.map((s) => s.status)
      
      // Check if this is Chief Director leave
      const leaveStaff = await prisma.staffMember.findUnique({
        where: { staffId: leave.staffId },
        select: { position: true, grade: true },
      })
      const isChiefDirectorLeave = leaveStaff && 
        (leaveStaff.position?.toLowerCase().includes('chief director') || 
         leaveStaff.grade?.toLowerCase().includes('chief director'))
      
      if (stepStatuses.some((s) => s === 'rejected')) {
        status = 'rejected'
      } else if (stepStatuses.every((s) => s === 'approved' || s === 'skipped')) {
        // For Chief Director leave, status is "recorded" not "approved"
        if (isChiefDirectorLeave) {
          status = 'recorded'
        } else {
          status = 'approved'
        }
      } else {
        status = 'pending'
      }

      // Update JSON approvalLevels for backward compatibility
      approvalLevels = updatedSteps.map((step) => ({
        level: step.level,
        approverRole: step.approverRole,
        approverStaffId: step.approverStaffId,
        status: step.status,
        approverName: step.approverName,
        approvalDate: step.approvalDate?.toISOString(),
        comments: step.comments,
      }))
    } else if (body.level !== undefined && approvalLevels && approvalLevels.length > 0) {
      // Fallback to JSON approvalLevels (legacy support)
      approvalLevels = approvalLevels.map((al: any) => {
        if (al.level === body.level) {
          if (al.status === 'pending' || (al.parallel && al.status === 'pending')) {
            return {
              ...al,
              status: body.status,
              approverName: approverName,
              approvalDate: new Date().toISOString(),
              ...(body.comments && { comments: body.comments }),
            }
          }
        }
        return al
      })

      // Use Ghana Civil Service workflow engine to calculate status
      // Check if this is Chief Director leave
      const leaveStaff = await prisma.staffMember.findUnique({
        where: { staffId: leave.staffId },
        select: { position: true, grade: true },
      })
      const isChiefDirectorLeave = leaveStaff && 
        (leaveStaff.position?.toLowerCase().includes('chief director') || 
         leaveStaff.grade?.toLowerCase().includes('chief director'))
      
      status = calculateCivilServiceApprovalStatus(approvalLevels, isChiefDirectorLeave ?? false)
    }

    // MoFA Compliance: Create comprehensive audit log and approval history
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    if (body.status === 'approved') {
      await logLeaveApproval({
        leaveRequestId: id,
        level: body.level,
        approverId: user.id,
        approverName,
        approverRole: user.role,
        approverStaffId: user.staffId || undefined,
        comments: body.comments,
        ip,
        userAgent,
      })
    } else if (body.status === 'rejected') {
      // Rejection requires comments per MoFA policy
      if (!body.comments || body.comments.trim().length < 10) {
        return NextResponse.json({
          error: 'Rejection comments are required and must be at least 10 characters',
          errorCode: 'REJECTION_COMMENTS_REQUIRED',
        }, { status: 400 })
      }

      await logLeaveRejection({
        leaveRequestId: id,
        level: body.level,
        approverId: user.id,
        approverName,
        approverRole: user.role,
        approverStaffId: user.staffId || undefined,
        comments: body.comments,
        ip,
        userAgent,
      })
    }

    // CRITICAL FIX: Deduct balance when approved, restore when rejected/cancelled
    const previousStatus = leave.status
    const isNewlyApproved = (status === 'approved' || status === 'recorded') && previousStatus !== 'approved' && previousStatus !== 'recorded'
    const isNewlyRejected = status === 'rejected' && previousStatus !== 'rejected'
    const isNewlyCancelled = status === 'cancelled' && (previousStatus === 'approved' || previousStatus === 'recorded')
    
    // Deduct balance when newly approved
    if (isNewlyApproved) {
      const deductionResult = await deductLeaveBalance(
        leave.staffId,
        leave.leaveType,
        leave.days
      )
      
      if (!deductionResult.success) {
        return NextResponse.json({
          error: deductionResult.error || 'Failed to deduct leave balance',
          errorCode: 'BALANCE_DEDUCTION_FAILED',
          troubleshooting: [
            'The leave balance could not be deducted',
            'This may indicate a system error',
            'Contact IT support immediately',
          ],
        }, { status: 500 })
      }
      
      // MoFA Compliance: Log balance deduction with audit logger
      // Get balance before deduction for logging
      const balanceFieldName = getBalanceFieldName(leave.leaveType) || 'annual'
      const balanceBefore = await prisma.leaveBalance.findUnique({
        where: { staffId: leave.staffId },
        select: { [balanceFieldName]: true } as any,
      })
      const balanceBeforeValue = balanceBefore && balanceFieldName ? 
        ((balanceBefore as any)[balanceFieldName] as number || 0) + leave.days : leave.days

      await logBalanceDeduction({
        staffId: leave.staffId,
        leaveType: leave.leaveType,
        days: leave.days,
        balanceBefore: balanceBeforeValue,
        balanceAfter: deductionResult.newBalance || 0,
        leaveRequestId: id,
        userId: user.id,
        userRole: user.role,
      })
    }
    
    // Restore balance if previously approved leave is now rejected or cancelled
    if ((isNewlyRejected || isNewlyCancelled) && previousStatus === 'approved') {
      const restorationResult = await restoreLeaveBalance(
        leave.staffId,
        leave.leaveType,
        leave.days
      )
      
      if (!restorationResult.success) {
        console.error('Failed to restore leave balance:', restorationResult.error)
        // Don't fail the request, but log the error
      } else {
        // MoFA Compliance: Log balance restoration with audit logger
        // Get balance before restoration for logging
        const balanceFieldName = getBalanceFieldName(leave.leaveType) || 'annual'
        const balanceBeforeRestore = await prisma.leaveBalance.findUnique({
          where: { staffId: leave.staffId },
          select: { [balanceFieldName]: true } as any,
        })
        const balanceBeforeValue = balanceBeforeRestore && balanceFieldName ? 
          ((balanceBeforeRestore as any)[balanceFieldName] as number || 0) : 0
        
        await logBalanceRestoration({
          staffId: leave.staffId,
          leaveType: leave.leaveType,
          days: leave.days,
          balanceBefore: balanceBeforeValue,
          balanceAfter: restorationResult.newBalance || 0,
          leaveRequestId: id,
          userId: user.id,
          userRole: user.role,
        })
      }
    }

    // MoFA Compliance: Lock record after final approval or recorded status
    const isFinalApproval = (status === 'approved' || status === 'recorded') && 
                            leave.status !== 'approved' && leave.status !== 'recorded'
    const shouldLock = isFinalApproval

    // Create staff snapshot at final approval (audit requirement)
    if (isFinalApproval && (status === 'approved' || status === 'recorded')) {
      try {
        await createStaffSnapshot(
          leave.staffId,
          new Date(),
          'leave_approval',
          id
        )
      } catch (error) {
        console.error('[LeaveApproval] Error creating staff snapshot:', error)
        // Don't fail approval if snapshot fails
      }
    }

    // Use optimistic locking to prevent concurrent modification conflicts
    const updateResult = await updateLeaveRequestWithLock(
      id,
      async (currentVersion) => {
        // Verify version hasn't changed
        const currentLeave = await prisma.leaveRequest.findUnique({
          where: { id },
          select: { version: true, status: true },
        })

        if (!currentLeave) {
          throw new Error('Leave request not found')
        }

        if (currentLeave.version !== currentVersion) {
          throw new Error(`Version conflict: expected ${currentVersion}, got ${currentLeave.version}`)
        }

        // Perform the update
        return await prisma.leaveRequest.update({
          where: { id },
          data: {
            status,
            approvedBy: body.approvedBy || leave.approvedBy,
            approvalDate: status !== 'pending' ? new Date() : leave.approvalDate,
            approvalLevels: approvalLevels || null,
            locked: shouldLock ? true : leave.locked, // Lock after final approval
            version: { increment: 1 }, // Increment version for optimistic locking
          },
          include: {
            staff: {
              include: {
                user: {
                  select: { id: true },
                },
              },
            },
          },
        })
      },
      { maxRetries: 3, retryDelay: 100, exponentialBackoff: true }
    )

    if (!updateResult.success) {
      if (updateResult.conflict) {
        return NextResponse.json({
          error: 'Concurrent modification detected',
          errorCode: 'CONCURRENT_MODIFICATION_CONFLICT',
          troubleshooting: [
            'Another user may be updating this leave request',
            'Please refresh the page and try again',
            'If the issue persists, contact HR',
          ],
        }, { status: 409 }) // 409 Conflict
      }
      return NextResponse.json({
        error: updateResult.error || 'Failed to update leave request',
        errorCode: 'UPDATE_FAILED',
      }, { status: 500 })
    }

    const updated = updateResult.data

    // MoFA Notification Service: Send multi-channel notification if status changed
    if (status !== 'pending' && status !== leave.status && (status === 'approved' || status === 'rejected' || status === 'recorded')) {
      // For "recorded" status (Chief Director leave), treat as approved for notification
      const notificationStatus = status === 'recorded' ? 'approved' : status as 'approved' | 'rejected'
      await notifyLeaveDecision({
        leaveRequestId: id,
        staffId: leave.staffId,
        staffName: leave.staffName,
        leaveType: leave.leaveType,
        days: leave.days,
        status: notificationStatus,
        approverName: approverName,
        comments: body.comments,
      })

      // If approved/recorded and there are more levels, notify next approvers
      if ((status === 'approved' || status === 'recorded') && approvalLevels && approvalLevels.length > 0) {
        const nextApprovers = getNextCivilServiceApprovers(approvalLevels)
        if (nextApprovers.length > 0) {
          const approverUserIds: string[] = []
          for (const approver of nextApprovers) {
            const approverUsers = await prisma.user.findMany({
              where: {
                role: approver.approverRole,
                active: true,
              },
              select: { id: true },
            })
            approverUserIds.push(...approverUsers.map(u => u.id))
          }

          if (approverUserIds.length > 0) {
            await notifyLeaveSubmission({
              leaveRequestId: id,
              staffId: leave.staffId,
              staffName: leave.staffName,
              leaveType: leave.leaveType,
              days: leave.days,
              approverIds: approverUserIds,
            })
          }
        }
      }
    }

    const transformed = {
      ...updated,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      approvalDate: updated.approvalDate?.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }
    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Error updating leave:', error)
    return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 })
  }
  }, { allowedRoles: READ_ONLY_ROLES })(request)
}

/**
 * Get troubleshooting tips for error codes
 */
function getTroubleshootingTips(errorCode?: string): string[] {
  const tips: Record<string, string[]> = {
    SELF_APPROVAL_NOT_ALLOWED: [
      'Approvers cannot approve their own leave requests per MoFA policy',
      'Contact your supervisor or HR for approval',
    ],
    PERMISSION_DENIED: [
      'Only authorized approvers can approve leave requests',
      'Verify you have the correct role assigned',
      'Contact IT support if you believe this is an error',
    ],
    NOT_ASSIGNED_APPROVER: [
      'Check if you are the assigned approver for this leave request',
      'Verify the approval level you are trying to approve',
      'Refresh the page to see current approval status',
      'Contact HR if you believe you should be able to approve this',
    ],
    SEQUENTIAL_APPROVAL_REQUIRED: [
      'Previous approval levels must be completed before this level',
      'Wait for the previous approver to complete their review',
      'Check the approval workflow status',
    ],
    ROLE_MISMATCH: [
      'Your role does not match the required role for this approval step',
      'Verify you have the correct role assigned',
      'Contact HR if you believe this is an error',
    ],
    LEAVE_LOCKED: [
      'This leave request has been finalized and cannot be modified',
      'Contact HR if changes are needed',
    ],
  }

  return tips[errorCode || ''] || ['Contact HR or IT support for assistance']
}

