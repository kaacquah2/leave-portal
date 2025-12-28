import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushNotification } from '@/lib/send-push-notification'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { sendEmail, generateLeaveRequestApprovedEmail, generateLeaveRequestRejectedEmail } from '@/lib/email'
import { calculateApprovalStatus, areParallelApprovalsComplete, getNextApprovers } from '@/lib/approval-workflow'
import { validateLeaveBalance, deductLeaveBalance, restoreLeaveBalance } from '@/lib/leave-balance-utils'

// GET single leave request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const leave = await prisma.leaveRequest.findUnique({
        where: { id },
        include: {
          staff: true,
          template: true,
        },
      })
      if (!leave) {
        return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
      }
      
      // Employees can only view their own leaves
      if (user.role === 'employee' && leave.staffId !== user.staffId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      
      return NextResponse.json(leave)
    } catch (error) {
      console.error('Error fetching leave:', error)
      return NextResponse.json({ error: 'Failed to fetch leave' }, { status: 500 })
    }
  }, { allowedRoles: ['hr', 'hr_assistant', 'admin', 'employee', 'manager', 'deputy_director'] })(request)
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
    
    // Check if user has permission to approve this leave
    if (body.status && ['approved', 'rejected'].includes(body.status)) {
      // Verify user role for approval
      if (user.role !== 'hr' && user.role !== 'hr_assistant' && user.role !== 'admin' && 
          user.role !== 'manager' && user.role !== 'deputy_director') {
        return NextResponse.json({
          error: 'You do not have permission to approve leave requests',
          errorCode: 'PERMISSION_DENIED',
          troubleshooting: [
            'Only managers, deputy directors, HR, and admins can approve leave requests',
            'Verify you have the correct role assigned',
            'Contact IT support if you believe this is an error',
          ],
        }, { status: 403 })
      }
      
      // For managers and deputy directors, verify they're the assigned approver (if applicable)
      if ((user.role === 'manager' || user.role === 'deputy_director') && leave.approvalLevels) {
        const approvalLevels = leave.approvalLevels as any[]
        const approverRole = user.role === 'deputy_director' ? 'deputy_director' : 'manager'
        const pendingLevel = approvalLevels.find((al: any) => 
          al.status === 'pending' && 
          (al.approverRole === 'manager' || al.approverRole === 'deputy_director')
        )
        if (pendingLevel && body.level !== pendingLevel.level) {
          return NextResponse.json({
            error: 'You are not the assigned approver for this level',
            errorCode: 'NOT_ASSIGNED_APPROVER',
            troubleshooting: [
              'Check if you are the assigned approver for this leave request',
              'Verify the approval level you are trying to approve',
              'Refresh the page to see current approval status',
              'Contact HR if you believe you should be able to approve this',
            ],
          }, { status: 403 })
        }
      }
      
      // CRITICAL FIX: Validate leave balance before approval
      if (body.status === 'approved' && leave.status !== 'approved') {
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

    // Handle approval levels with enhanced workflow support
    let approvalLevels = (leave.approvalLevels as any) || []
    let status = body.status || leave.status

    if (body.level !== undefined && approvalLevels && approvalLevels.length > 0) {
      // Get current approver info
      const approverStaff = await prisma.staffMember.findUnique({
        where: { staffId: user.staffId || '' },
        select: { firstName: true, lastName: true },
      })
      const approverName = approverStaff
        ? `${approverStaff.firstName} ${approverStaff.lastName}`
        : body.approvedBy || user.email || 'Unknown'

      // Update the specific level
      approvalLevels = approvalLevels.map((al: any) => {
        if (al.level === body.level) {
          // Check if this is a delegated approval
          if (al.status === 'delegated' && al.delegatedTo === user.id) {
            // Approver is the delegate
            return {
              ...al,
              status: body.status,
              approverName: approverName,
              approvalDate: new Date().toISOString(),
              ...(body.comments && { comments: body.comments }),
              delegatedApproved: true,
            }
          } else if (al.status === 'pending' || (al.parallel && al.status === 'pending')) {
            // Regular approval or parallel approval
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

      // Use enhanced workflow engine to calculate status
      status = calculateApprovalStatus(approvalLevels)

      // Create approval history entry
      await prisma.auditLog.create({
        data: {
          action: body.status === 'approved' ? 'leave_approved' : 'leave_rejected',
          user: user.email || 'system',
          staffId: user.staffId || undefined,
          details: JSON.stringify({
            leaveRequestId: id,
            level: body.level,
            approverName,
            comments: body.comments,
            previousStatus: 'pending',
            newStatus: body.status,
          }),
        },
      })
    }

    // CRITICAL FIX: Deduct balance when approved, restore when rejected/cancelled
    const previousStatus = leave.status
    const isNewlyApproved = status === 'approved' && previousStatus !== 'approved'
    const isNewlyRejected = status === 'rejected' && previousStatus !== 'rejected'
    const isNewlyCancelled = status === 'cancelled' && previousStatus === 'approved'
    
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
      
      // Log balance deduction
      await prisma.auditLog.create({
        data: {
          action: 'LEAVE_BALANCE_DEDUCTED',
          user: user.email || 'system',
          staffId: leave.staffId,
          details: JSON.stringify({
            leaveRequestId: id,
            leaveType: leave.leaveType,
            daysDeducted: leave.days,
            newBalance: deductionResult.newBalance,
          }),
        },
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
        // Log balance restoration
        await prisma.auditLog.create({
          data: {
            action: 'LEAVE_BALANCE_RESTORED',
            user: user.email || 'system',
            staffId: leave.staffId,
            details: JSON.stringify({
              leaveRequestId: id,
              leaveType: leave.leaveType,
              daysRestored: leave.days,
              newBalance: restorationResult.newBalance,
              reason: isNewlyRejected ? 'rejected' : 'cancelled',
            }),
          },
        })
      }
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        approvedBy: body.approvedBy || leave.approvedBy,
        approvalDate: status !== 'pending' ? new Date() : leave.approvalDate,
        approvalLevels: approvalLevels || null,
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

    // Create notification and send push/email if status changed to approved/rejected
    if (status !== 'pending' && status !== leave.status) {
      // Get staff member details for email
      const staffMember = await prisma.staffMember.findUnique({
        where: { staffId: leave.staffId },
        include: {
          user: {
            select: { id: true },
          },
        },
      })
      
      const userId = staffMember?.user?.id
      const staffEmail = staffMember?.email
      const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      
      if (userId) {
        // Create in-app notification
        const notification = await prisma.notification.create({
          data: {
            userId,
            staffId: leave.staffId,
            type: status === 'approved' ? 'leave_approved' : 'leave_rejected',
            title: `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
            message: `Your ${leave.leaveType} leave request for ${leave.days} day(s) has been ${status}.`,
            link: `/leaves/${id}`,
          },
        })

        // Send push notification (non-blocking)
        sendPushNotification(userId, {
          title: `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          message: `Your ${leave.leaveType} leave request has been ${status}.`,
          link: `/leaves/${id}`,
          id: notification.id,
          type: status === 'approved' ? 'leave_approved' : 'leave_rejected',
          important: true,
        }).catch((error) => {
          console.error('Failed to send push notification:', error)
          // Don't fail the request if push fails
        })
      }
      
      // Send email notification (non-blocking)
      if (staffEmail && staffMember) {
        const approverName = body.approvedBy || updated.approvedBy || 'Manager'
        const comments = body.comments || undefined
        
        if (status === 'approved') {
          const html = generateLeaveRequestApprovedEmail(
            updated.staffName || leave.staffName,
            updated.leaveType || leave.leaveType,
            updated.startDate.toISOString(),
            updated.endDate.toISOString(),
            updated.days || leave.days,
            approverName,
            id,
            portalUrl
          )
          
          sendEmail({
            to: staffEmail,
            subject: `Leave Request Approved - ${updated.leaveType || leave.leaveType}`,
            html,
          }).catch((error) => {
            console.error('Failed to send leave approval email:', error)
            // Don't fail the request if email fails
          })
        } else if (status === 'rejected') {
          const html = generateLeaveRequestRejectedEmail(
            updated.staffName || leave.staffName,
            updated.leaveType || leave.leaveType,
            updated.startDate.toISOString(),
            updated.endDate.toISOString(),
            updated.days || leave.days,
            approverName,
            comments,
            id,
            portalUrl
          )
          
          sendEmail({
            to: staffEmail,
            subject: `Leave Request Rejected - ${updated.leaveType || leave.leaveType}`,
            html,
          }).catch((error) => {
            console.error('Failed to send leave rejection email:', error)
            // Don't fail the request if email fails
          })
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
  }, { allowedRoles: ['hr', 'hr_assistant', 'admin', 'manager', 'deputy_director'] })(request)
}

