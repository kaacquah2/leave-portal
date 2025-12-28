import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { sendEmail } from '@/lib/email'

// GET pending approvals that need reminders
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only HR and admin can view reminders
      if (user.role !== 'hr' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      // Get reminder threshold from settings (default 3 days)
      const reminderSetting = await prisma.systemSettings.findUnique({
        where: { key: 'approval_reminder_days' },
      })
      const reminderDays = reminderSetting ? parseInt(reminderSetting.value) : 3

      const thresholdDate = new Date()
      thresholdDate.setDate(thresholdDate.getDate() - reminderDays)

      // Find pending leave requests older than threshold
      const pendingLeaves = await prisma.leaveRequest.findMany({
        where: {
          status: 'pending',
          createdAt: {
            lte: thresholdDate,
          },
        },
        include: {
          staff: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              department: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      return NextResponse.json({
        pendingLeaves,
        reminderDays,
        thresholdDate: thresholdDate.toISOString(),
      })
    } catch (error) {
      console.error('Error fetching approval reminders:', error)
      return NextResponse.json(
        { error: 'Failed to fetch approval reminders' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

// POST send reminder notifications
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR and admin can send reminders
      if (user.role !== 'hr' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const { leaveIds, sendEmail: shouldSendEmail } = body

      if (!Array.isArray(leaveIds) || leaveIds.length === 0) {
        return NextResponse.json(
          { error: 'leaveIds must be a non-empty array' },
          { status: 400 }
        )
      }

      const results = {
        notified: [] as string[],
        failed: [] as Array<{ leaveId: string; error: string }>,
      }

      // Get reminder threshold
      const reminderSetting = await prisma.systemSettings.findUnique({
        where: { key: 'approval_reminder_days' },
      })
      const reminderDays = reminderSetting ? parseInt(reminderSetting.value) : 3

      for (const leaveId of leaveIds) {
        try {
          const leave = await prisma.leaveRequest.findUnique({
            where: { id: leaveId },
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

          if (!leave || leave.status !== 'pending') {
            results.failed.push({ leaveId, error: 'Leave not found or not pending' })
            continue
          }

          // Find managers/HR who should approve
          const approvers = await prisma.user.findMany({
            where: {
              OR: [
                { role: 'hr' },
                { role: 'hr_assistant' },
                { role: 'admin' },
                // Add manager role if they're the assigned manager
                {
                  role: 'manager',
                  staff: {
                    staffId: leave.staffId,
                  },
                },
                // Add deputy director role
                {
                  role: 'deputy_director',
                },
              ],
            },
            include: {
              staff: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          })

          // Create notifications for approvers
          for (const approver of approvers) {
            if (approver.staff?.email) {
              // Create in-app notification
              await prisma.notification.create({
                data: {
                  userId: approver.id,
                  type: 'approval_reminder',
                  title: 'Pending Leave Approval Reminder',
                  message: `Leave request from ${leave.staffName} (${leave.leaveType}, ${leave.days} days) is pending approval for ${reminderDays} days.`,
                  link: `/leaves/${leaveId}`,
                },
              })

              // Send email if enabled
              if (shouldSendEmail && approver.staff.email) {
                try {
                  await sendEmail({
                    to: approver.staff.email,
                    subject: `Reminder: Pending Leave Approval - ${leave.staffName}`,
                    html: `
                      <h2>Pending Leave Approval Reminder</h2>
                      <p>A leave request has been pending approval for ${reminderDays} days:</p>
                      <ul>
                        <li><strong>Staff:</strong> ${leave.staffName}</li>
                        <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
                        <li><strong>Days:</strong> ${leave.days}</li>
                        <li><strong>Start Date:</strong> ${new Date(leave.startDate).toLocaleDateString()}</li>
                        <li><strong>End Date:</strong> ${new Date(leave.endDate).toLocaleDateString()}</li>
                        <li><strong>Submitted:</strong> ${new Date(leave.createdAt).toLocaleDateString()}</li>
                      </ul>
                      <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/leaves/${leaveId}">Review Leave Request</a></p>
                    `,
                  })
                } catch (emailError) {
                  console.error('Failed to send reminder email:', emailError)
                  // Don't fail the whole operation if email fails
                }
              }
            }
          }

          // Create audit log
          await prisma.auditLog.create({
            data: {
              action: 'APPROVAL_REMINDER_SENT',
              user: user.email || 'system',
              staffId: leave.staffId,
              details: JSON.stringify({
                leaveRequestId: leaveId,
                reminderDays,
                approversNotified: approvers.length,
              }),
            },
          })

          results.notified.push(leaveId)
        } catch (error: any) {
          results.failed.push({ leaveId, error: error.message || 'Unknown error' })
        }
      }

      return NextResponse.json({
        success: true,
        notified: results.notified.length,
        failed: results.failed.length,
        results,
      })
    } catch (error: any) {
      console.error('Error sending approval reminders:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to send reminders' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}
