import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isHR, isAdmin } from '@/lib/auth'
import { validateLeaveBalance, deductLeaveBalance, restoreLeaveBalance, getBalanceFieldName } from '@/lib/leave-balance-utils'
import { ADMIN_ROLES, HR_ROLES } from '@/lib/roles'
import { getUserRBACContext, canApproveLeaveRequest } from '@/lib/roles'
import { updateApprovalStep, getApprovalSteps } from '@/lib/ghana-civil-service-approval-workflow-db'
import { logLeaveApproval, logLeaveRejection, logBalanceDeduction, logBalanceRestoration } from '@/lib/audit-logger'
import { notifyLeaveDecision } from '@/lib/notification-service'
import { validateBeforeApproval } from '@/lib/ghana-civil-service-compliance'

// POST bulk approve/reject leave requests

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR and admin can perform bulk operations
      if (!isHR(user) && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'Forbidden - Only HR and Admin can perform bulk operations' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const { leaveIds, action, comments, level } = body

      if (!Array.isArray(leaveIds) || leaveIds.length === 0) {
        return NextResponse.json(
          { error: 'leaveIds must be a non-empty array' },
          { status: 400 }
        )
      }

      if (!['approved', 'rejected'].includes(action)) {
        return NextResponse.json(
          { error: 'action must be "approved" or "rejected"' },
          { status: 400 }
        )
      }

      // Validate rejection comments
      if (action === 'rejected' && (!comments || comments.trim().length < 10)) {
        return NextResponse.json(
          { error: 'Rejection comments are required and must be at least 10 characters' },
          { status: 400 }
        )
      }

      const results = {
        success: [] as string[],
        failed: [] as Array<{ leaveId: string; error: string }>,
      }

      // Get RBAC context once
      const rbacContext = await getUserRBACContext(user)
      if (!rbacContext) {
        return NextResponse.json(
          { error: 'Unable to verify user permissions' },
          { status: 500 }
        )
      }

      // Get approver info
      const approverStaff = await prisma.staffMember.findUnique({
        where: { staffId: user.staffId || '' },
        select: { firstName: true, lastName: true },
      })
      const approverName = approverStaff
        ? `${approverStaff.firstName} ${approverStaff.lastName}`
        : user.email || 'Unknown'

      const ip = request.headers.get('x-forwarded-for') || undefined
      const userAgent = request.headers.get('user-agent') || undefined

      // Process each leave request with full validation
      for (const leaveId of leaveIds) {
        try {
          // Get leave request with approval steps
          const leave = await prisma.leaveRequest.findUnique({
            where: { id: leaveId },
            include: {
              staff: true,
              approvalSteps: {
                orderBy: { level: 'asc' },
              },
            },
          })

          if (!leave) {
            results.failed.push({ leaveId, error: 'Leave request not found' })
            continue
          }

          // Validate approval permission (same as individual approval)
          const approvalPermission = await canApproveLeaveRequest(
            rbacContext,
            leaveId,
            level
          )

          if (!approvalPermission.allowed) {
            results.failed.push({
              leaveId,
              error: approvalPermission.reason || 'Permission denied',
            })
            continue
          }

          // Ghana Civil Service Compliance: Validate before approval
          if (action === 'approved' && user.staffId) {
            const complianceCheck = await validateBeforeApproval(leaveId, user.staffId)
            if (!complianceCheck.valid) {
              results.failed.push({
                leaveId,
                error: `Compliance validation failed: ${complianceCheck.errors.join(', ')}`,
              })
              continue
            }
          }

          // Validate balance if approving
          if (action === 'approved') {
            const balanceValidation = await validateLeaveBalance(
              leave.staffId,
              leave.leaveType,
              leave.days
            )

            if (!balanceValidation.valid) {
              results.failed.push({
                leaveId,
                error: balanceValidation.error || 'Insufficient balance',
              })
              continue
            }
          }

          // Use same approval logic as individual route
          let newStatus = leave.status
          const approvalLevels = (leave.approvalLevels as any) || []

          // Update approval step if using ApprovalSteps
          if (leave.approvalSteps && leave.approvalSteps.length > 0 && level !== undefined) {
            const stepStatus: 'approved' | 'rejected' =
              action === 'approved' ? 'approved' : 'rejected'
            
            await updateApprovalStep(
              leaveId,
              level,
              stepStatus,
              user.id,
              approverName,
              comments
            )

            // Recalculate status
            const updatedSteps = await getApprovalSteps(leaveId)
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
              newStatus = 'rejected'
            } else if (stepStatuses.every((s) => s === 'approved' || s === 'skipped')) {
              // For Chief Director leave, status is "recorded" not "approved"
              if (isChiefDirectorLeave) {
                newStatus = 'recorded'
              } else {
                newStatus = 'approved'
              }
            } else {
              newStatus = 'pending'
            }
          } else if (level !== undefined && approvalLevels.length > 0) {
            // Fallback to JSON approvalLevels (legacy support)
            const updatedLevels = approvalLevels.map((al: any) => {
              if (al.level === level) {
                return {
                  ...al,
                  status: action,
                  approverName: approverName,
                  approvalDate: new Date().toISOString(),
                  ...(comments && { comments }),
                }
              }
              return al
            })

            // Calculate status from levels
            const { calculateCivilServiceApprovalStatus } = await import('@/lib/ghana-civil-service-approval-workflow')
            const leaveStaff = await prisma.staffMember.findUnique({
              where: { staffId: leave.staffId },
              select: { position: true, grade: true },
            })
            const isChiefDirectorLeave = leaveStaff && 
              (leaveStaff.position?.toLowerCase().includes('chief director') || 
               leaveStaff.grade?.toLowerCase().includes('chief director'))
            
            newStatus = calculateCivilServiceApprovalStatus(updatedLevels, isChiefDirectorLeave ?? false)

            // Update approvalLevels
            await prisma.leaveRequest.update({
              where: { id: leaveId },
              data: {
                approvalLevels: updatedLevels,
              },
            })
          } else {
            results.failed.push({
              leaveId,
              error: 'Approval steps not found, cannot process bulk approval',
            })
            continue
          }

          // Handle balance deduction/restoration
          const previousStatus = leave.status
          const isNewlyApproved = (newStatus === 'approved' || newStatus === 'recorded') && previousStatus !== 'approved' && previousStatus !== 'recorded'
          const isNewlyRejected = newStatus === 'rejected' && previousStatus !== 'rejected'

          // Deduct balance when newly approved
          if (isNewlyApproved) {
            const deductionResult = await deductLeaveBalance(
              leave.staffId,
              leave.leaveType,
              leave.days
            )
            
            if (!deductionResult.success) {
              results.failed.push({
                leaveId,
                error: deductionResult.error || 'Failed to deduct leave balance',
              })
              continue
            }

            // Log balance deduction
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
              leaveRequestId: leaveId,
              userId: user.id,
              userRole: user.role,
            })
          }

          // Restore balance if previously approved leave is now rejected
          if (isNewlyRejected && previousStatus === 'approved') {
            const restorationResult = await restoreLeaveBalance(
              leave.staffId,
              leave.leaveType,
              leave.days
            )
            
            if (restorationResult.success) {
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
                leaveRequestId: leaveId,
                userId: user.id,
                userRole: user.role,
              })
            }
          }

          // Lock record after final approval
          const isFinalApproval = (newStatus === 'approved' || newStatus === 'recorded') && 
                                  previousStatus !== 'approved' && previousStatus !== 'recorded'
          const shouldLock = isFinalApproval

          // Update leave request
          await prisma.leaveRequest.update({
            where: { id: leaveId },
            data: {
              status: newStatus,
              approvedBy: action === 'approved' ? approverName : leave.approvedBy,
              approvalDate: newStatus !== 'pending' ? new Date() : leave.approvalDate,
              locked: shouldLock ? true : leave.locked,
            },
          })

          // Audit log
          if (action === 'approved') {
            await logLeaveApproval({
              leaveRequestId: leaveId,
              level: level || 1,
              approverId: user.id,
              approverName,
              approverRole: user.role,
              approverStaffId: user.staffId || undefined,
              comments,
              ip,
              userAgent,
            })
          } else {
            await logLeaveRejection({
              leaveRequestId: leaveId,
              level: level || 1,
              approverId: user.id,
              approverName,
              approverRole: user.role,
              approverStaffId: user.staffId || undefined,
              comments: comments || '',
              ip,
              userAgent,
            })
          }

          // Notify employee
          await notifyLeaveDecision({
            leaveRequestId: leaveId,
            staffId: leave.staffId,
            staffName: leave.staffName,
            leaveType: leave.leaveType,
            days: leave.days,
            status: action as 'approved' | 'rejected',
            approverName,
            comments,
          })

          results.success.push(leaveId)
        } catch (error: any) {
          results.failed.push({ leaveId, error: error.message || 'Unknown error' })
        }
      }

      return NextResponse.json({
        success: true,
        processed: results.success.length,
        failed: results.failed.length,
        results,
      })
    } catch (error: any) {
      console.error('Error performing bulk operation:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to perform bulk operation' },
        { status: 500 }
      )
    }
  }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES] })(request)
}

