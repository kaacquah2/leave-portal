import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { sendPushNotification } from '@/lib/send-push-notification'

// GET pending approvals that need reminders
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url)
    const hoursThreshold = parseInt(searchParams.get('hoursThreshold') || '24')

    // Get all pending leave requests
    const pendingLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'pending',
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

    const now = new Date()
    const reminders: any[] = []

    for (const leave of pendingLeaves) {
      const hoursSinceSubmission = (now.getTime() - leave.createdAt.getTime()) / (1000 * 60 * 60)

      if (hoursSinceSubmission >= hoursThreshold) {
        const approvalLevels = (leave.approvalLevels as any) || []
        const pendingLevels = approvalLevels.filter((al: any) => al.status === 'pending')

        for (const level of pendingLevels) {
          // Find approvers for this level
          let approvers: any[] = []

          if (level.approverRole === 'manager') {
            approvers = await prisma.user.findMany({
              where: { role: 'manager', active: true },
              include: {
                staff: {
                  select: { firstName: true, lastName: true, staffId: true, department: true },
                },
              },
            })
          } else if (level.approverRole === 'hr') {
            approvers = await prisma.user.findMany({
              where: { role: 'hr', active: true },
              include: {
                staff: {
                  select: { firstName: true, lastName: true, staffId: true },
                },
              },
            })
          }

          // Check if reminder was already sent recently (within last 12 hours)
          const recentReminder = await prisma.auditLog.findFirst({
            where: {
              action: 'leave_reminder_sent',
              details: {
                contains: JSON.stringify({ leaveRequestId: leave.id, level: level.level }),
              },
              timestamp: {
                gte: new Date(now.getTime() - 12 * 60 * 60 * 1000), // Last 12 hours
              },
            },
          })

          if (!recentReminder) {
            reminders.push({
              leaveRequestId: leave.id,
              level: level.level,
              approverRole: level.approverRole,
              hoursSinceSubmission: Math.floor(hoursSinceSubmission),
              approvers: approvers.map((a) => ({
                userId: a.id,
                staffId: a.staff?.staffId,
                name: a.staff ? `${a.staff.firstName} ${a.staff.lastName}` : a.email,
              })),
            })
          }
        }
      }
    }

    return NextResponse.json({ reminders })
  } catch (error) {
    console.error('Error fetching reminders:', error)
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin'] })

// POST send reminder for a specific leave request
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const body = await request.json()
    const { leaveRequestId, level, approverUserId } = body

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

    // Get approver
    let approver
    if (approverUserId) {
      approver = await prisma.user.findUnique({
        where: { id: approverUserId },
        include: {
          staff: {
            select: { firstName: true, lastName: true, staffId: true },
          },
        },
      })
    } else {
      // Find approver by role
      approver = await prisma.user.findFirst({
        where: { role: targetLevel.approverRole, active: true },
        include: {
          staff: {
            select: { firstName: true, lastName: true, staffId: true },
          },
        },
      })
    }

    if (!approver) {
      return NextResponse.json({ error: 'Approver not found' }, { status: 404 })
    }

    const approverName = approver.staff
      ? `${approver.staff.firstName} ${approver.staff.lastName}`
      : approver.email

    // Create notification
    await prisma.notification.create({
      data: {
        userId: approver.id,
        staffId: approver.staff?.staffId,
        type: 'leave_reminder',
        title: 'Reminder: Pending Leave Approval',
        message: `${leave.staffName}'s ${leave.leaveType} leave request (${leave.days} days) is pending your approval.`,
        link: `/leaves/${leaveRequestId}`,
      },
    })

    // Send push notification
    sendPushNotification(approver.id, {
      title: 'Reminder: Pending Leave Approval',
      message: `You have a pending leave request to approve.`,
      link: `/leaves/${leaveRequestId}`,
      id: leaveRequestId,
      type: 'leave_reminder',
      important: true,
    }).catch(console.error)

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'leave_reminder_sent',
        user: user.email || 'system',
        staffId: user.staffId || undefined,
        details: JSON.stringify({
          leaveRequestId,
          level,
          approverId: approver.id,
          approverName,
        }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending reminder:', error)
    return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin'] })

