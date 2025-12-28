import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { validateLeaveBalance, deductLeaveBalance } from '@/lib/leave-balance-utils'

// POST bulk approve/reject leave requests
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR and admin can perform bulk operations
      if (user.role !== 'hr' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - Only HR and Admin can perform bulk operations' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const { leaveIds, action, comments } = body

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

      const results = {
        success: [] as string[],
        failed: [] as Array<{ leaveId: string; error: string }>,
      }

      // Get approver info
      const approverStaff = await prisma.staffMember.findUnique({
        where: { staffId: user.staffId || '' },
        select: { firstName: true, lastName: true },
      })
      const approverName = approverStaff
        ? `${approverStaff.firstName} ${approverStaff.lastName}`
        : user.email || 'Unknown'

      // Process each leave request
      for (const leaveId of leaveIds) {
        try {
          const leave = await prisma.leaveRequest.findUnique({
            where: { id: leaveId },
          })

          if (!leave) {
            results.failed.push({ leaveId, error: 'Leave request not found' })
            continue
          }

          if (leave.status !== 'pending') {
            results.failed.push({ leaveId, error: `Leave is already ${leave.status}` })
            continue
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

            // Deduct balance
            const deductionResult = await deductLeaveBalance(
              leave.staffId,
              leave.leaveType,
              leave.days
            )

            if (!deductionResult.success) {
              results.failed.push({
                leaveId,
                error: deductionResult.error || 'Failed to deduct balance',
              })
              continue
            }

            // Log balance deduction
            await prisma.auditLog.create({
              data: {
                action: 'LEAVE_BALANCE_DEDUCTED',
                user: user.email || 'system',
                staffId: leave.staffId,
                details: JSON.stringify({
                  leaveRequestId: leaveId,
                  leaveType: leave.leaveType,
                  daysDeducted: leave.days,
                  newBalance: deductionResult.newBalance,
                  bulkOperation: true,
                }),
              },
            })
          }

          // Update leave request
          await prisma.leaveRequest.update({
            where: { id: leaveId },
            data: {
              status: action,
              approvedBy: approverName,
              approvalDate: new Date(),
            },
          })

          // Create audit log
          await prisma.auditLog.create({
            data: {
              action: action === 'approved' ? 'leave_approved' : 'leave_rejected',
              user: user.email || 'system',
              staffId: leave.staffId,
              details: JSON.stringify({
                leaveRequestId: leaveId,
                approverName,
                comments,
                bulkOperation: true,
              }),
            },
          })

          // Create notification
          const staffMember = await prisma.staffMember.findUnique({
            where: { staffId: leave.staffId },
            include: { user: { select: { id: true } } },
          })

          if (staffMember?.user?.id) {
            await prisma.notification.create({
              data: {
                userId: staffMember.user.id,
                staffId: leave.staffId,
                type: action === 'approved' ? 'leave_approved' : 'leave_rejected',
                title: `Leave Request ${action === 'approved' ? 'Approved' : 'Rejected'}`,
                message: `Your ${leave.leaveType} leave request for ${leave.days} day(s) has been ${action}.`,
                link: `/leaves/${leaveId}`,
              },
            })
          }

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
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

