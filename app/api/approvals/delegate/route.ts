import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { sendPushNotification } from '@/lib/send-push-notification'


// POST delegate approval
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const body = await request.json()
    const { leaveRequestId, level, delegateToUserId, delegateToStaffId, reason } = body

    if (!leaveRequestId || level === undefined) {
      return NextResponse.json({ error: 'leaveRequestId and level are required' }, { status: 400 })
    }

    if (!delegateToUserId && !delegateToStaffId) {
      return NextResponse.json({ error: 'delegateToUserId or delegateToStaffId is required' }, { status: 400 })
    }

    // Get leave request
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        staff: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
      },
    })

    if (!leave) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    // Get current approver info
    const currentApprover = await prisma.staffMember.findUnique({
      where: { staffId: user.staffId || '' },
      select: { firstName: true, lastName: true },
    })

    const currentApproverName = currentApprover
      ? `${currentApprover.firstName} ${currentApprover.lastName}`
      : user.email || 'Unknown'

    // Get delegate info
    let delegateUser
    let delegateStaff
    let delegateName = ''

    if (delegateToUserId) {
      delegateUser = await prisma.user.findUnique({
        where: { id: delegateToUserId },
        include: {
          staff: {
            select: { firstName: true, lastName: true, staffId: true },
          },
        },
      })
      if (delegateUser?.staff) {
        delegateStaff = delegateUser.staff
        delegateName = `${delegateUser.staff.firstName} ${delegateUser.staff.lastName}`
      }
    } else if (delegateToStaffId) {
      delegateStaff = await prisma.staffMember.findUnique({
        where: { staffId: delegateToStaffId },
        include: {
          user: {
            select: { id: true, email: true },
          },
        },
      })
      if (delegateStaff) {
        delegateName = `${delegateStaff.firstName} ${delegateStaff.lastName}`
        delegateUser = delegateStaff.user
      }
    }

    if (!delegateUser || !delegateStaff) {
      return NextResponse.json({ error: 'Delegate user not found' }, { status: 404 })
    }

    // Update approval levels
    let approvalLevels = (leave.approvalLevels as any) || []
    
    approvalLevels = approvalLevels.map((al: any) => {
      if (al.level === level && al.status === 'pending') {
        return {
          ...al,
          status: 'delegated',
          delegatedTo: delegateUser.id,
          delegatedToName: delegateName,
          delegationDate: new Date().toISOString(),
          delegationReason: reason,
        }
      }
      return al
    })

    // Update leave request
    const updated = await prisma.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        approvalLevels,
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'leave_delegated',
        user: user.email || 'system',
        staffId: user.staffId || undefined,
        details: JSON.stringify({
          leaveRequestId,
          level,
          from: currentApproverName,
          to: delegateName,
          reason,
        }),
      },
    })

    // Create notification for delegate
    if (delegateUser.id) {
      await prisma.notification.create({
        data: {
          userId: delegateUser.id,
          staffId: delegateStaff.staffId,
          type: 'leave_delegated',
          title: 'Approval Delegated to You',
          message: `${currentApproverName} has delegated approval of ${leave.staffName}'s ${leave.leaveType} leave request to you.`,
          link: `/leaves/${leaveRequestId}`,
        },
      })

      // Send push notification
      sendPushNotification(delegateUser.id, {
        title: 'Approval Delegated to You',
        message: `You have been delegated to approve a leave request.`,
        link: `/leaves/${leaveRequestId}`,
        id: leaveRequestId,
        type: 'leave_delegated',
        important: true,
      }).catch(console.error)
    }

    // Create notification for staff member
    if (leave.staff.user?.id) {
      await prisma.notification.create({
        data: {
          userId: leave.staff.user.id,
          staffId: leave.staffId,
          type: 'system',
          title: 'Approval Delegated',
          message: `Your leave request approval has been delegated to ${delegateName}.`,
          link: `/leaves/${leaveRequestId}`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      leaveRequest: {
        ...updated,
        startDate: updated.startDate.toISOString(),
        endDate: updated.endDate.toISOString(),
        approvalDate: updated.approvalDate?.toISOString(),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error delegating approval:', error)
    return NextResponse.json({ error: 'Failed to delegate approval' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin', 'manager'] })

