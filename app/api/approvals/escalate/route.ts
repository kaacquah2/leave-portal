import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { checkEscalation } from '@/lib/approval-workflow'
import { sendPushNotification } from '@/lib/send-push-notification'


// POST escalate approval
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const body = await request.json()
    const { leaveRequestId, level, escalateToUserId, escalateToRole, autoApprove } = body

    if (!leaveRequestId || level === undefined) {
      return NextResponse.json({ error: 'leaveRequestId and level are required' }, { status: 400 })
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

    const approvalLevels = (leave.approvalLevels as any) || []
    const targetLevel = approvalLevels.find((al: any) => al.level === level)

    if (!targetLevel || targetLevel.status !== 'pending') {
      return NextResponse.json({ error: 'Level not found or already processed' }, { status: 400 })
    }

    // Check if escalation should happen
    const escalationCheck = checkEscalation(targetLevel, leave.createdAt)
    if (!escalationCheck.shouldEscalate && !escalateToUserId && !escalateToRole) {
      return NextResponse.json({ error: 'Escalation conditions not met' }, { status: 400 })
    }

    // Determine escalate to
    let escalateToUser
    let escalateToName = ''

    if (escalateToUserId) {
      escalateToUser = await prisma.user.findUnique({
        where: { id: escalateToUserId },
        include: {
          staff: {
            select: { firstName: true, lastName: true, staffId: true },
          },
        },
      })
      if (escalateToUser?.staff) {
        escalateToName = `${escalateToUser.staff.firstName} ${escalateToUser.staff.lastName}`
      }
    } else if (escalateToRole) {
      // Find user with the role (typically HR or Admin for escalation)
      escalateToUser = await prisma.user.findFirst({
        where: { role: escalateToRole, active: true },
        include: {
          staff: {
            select: { firstName: true, lastName: true, staffId: true },
          },
        },
      })
      if (escalateToUser?.staff) {
        escalateToName = `${escalateToUser.staff.firstName} ${escalateToUser.staff.lastName}`
      }
    } else if (escalationCheck.escalateTo) {
      // Use escalation rule target
      escalateToUser = await prisma.user.findFirst({
        where: { 
          OR: [
            { id: escalationCheck.escalateTo },
            { role: escalationCheck.escalateTo as any },
          ],
          active: true,
        },
        include: {
          staff: {
            select: { firstName: true, lastName: true, staffId: true },
          },
        },
      })
      if (escalateToUser?.staff) {
        escalateToName = `${escalateToUser.staff.firstName} ${escalateToUser.staff.lastName}`
      }
    }

    if (!escalateToUser) {
      return NextResponse.json({ error: 'Escalation target not found' }, { status: 404 })
    }

    // Handle auto-approval if configured
    if (autoApprove || escalationCheck.autoApprove) {
      // Auto-approve at this level
      const updatedLevels = approvalLevels.map((al: any) => {
        if (al.level === level) {
          return {
            ...al,
            status: 'approved',
            approverName: escalateToName || 'System (Auto-approved)',
            approvalDate: new Date().toISOString(),
            comments: 'Auto-approved due to escalation',
            escalated: true,
          }
        }
        return al
      })

      // Check if all levels are approved
      const allApproved = updatedLevels.every((al: any) => al.status === 'approved')
      const anyRejected = updatedLevels.some((al: any) => al.status === 'rejected')

      const finalStatus = allApproved ? 'approved' : anyRejected ? 'rejected' : 'pending'

      await prisma.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          approvalLevels: updatedLevels,
          status: finalStatus,
          approvedBy: escalateToName,
          approvalDate: finalStatus === 'approved' ? new Date() : leave.approvalDate,
        },
      })
    } else {
      // Update level to show escalation
      const updatedLevels = approvalLevels.map((al: any) => {
        if (al.level === level) {
          return {
            ...al,
            escalated: true,
            escalatedTo: escalateToUser.id,
            escalatedToName: escalateToName,
            escalationDate: new Date().toISOString(),
          }
        }
        return al
      })

      await prisma.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          approvalLevels: updatedLevels,
        },
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'leave_escalated',
        user: user.email || 'system',
        staffId: user.staffId || undefined,
        details: JSON.stringify({
          leaveRequestId,
          level,
          escalatedTo: escalateToName,
          autoApproved: autoApprove || escalationCheck.autoApprove,
        }),
      },
    })

    // Create notification for escalatee
    if (escalateToUser.id) {
      await prisma.notification.create({
        data: {
          userId: escalateToUser.id,
          staffId: escalateToUser.staff?.staffId,
          type: 'leave_escalated',
          title: 'Leave Request Escalated',
          message: `${leave.staffName}'s ${leave.leaveType} leave request has been escalated to you for approval.`,
          link: `/leaves/${leaveRequestId}`,
        },
      })

      // Send push notification
      sendPushNotification(escalateToUser.id, {
        title: 'Leave Request Escalated',
        message: `A leave request has been escalated to you for approval.`,
        link: `/leaves/${leaveRequestId}`,
        id: leaveRequestId,
        type: 'leave_escalated',
        important: true,
      }).catch(console.error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error escalating approval:', error)
    return NextResponse.json({ error: 'Failed to escalate approval' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin', 'manager'] })

