import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notification-service'

/**
 * Cron Job: Leave Start Date Reminders
 * 
 * Sends reminders to staff members 3 days before their approved leave starts
 * 
 * Schedule: Daily at 9 AM
 * Vercel Cron: Add to vercel.json
 * {
 *   "crons": [{
 *     "path": "/api/cron/leave-start-reminders",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (if using Vercel Cron)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Calculate date 3 days from now
    const reminderDate = new Date(today)
    reminderDate.setDate(reminderDate.getDate() + 3)
    reminderDate.setHours(23, 59, 59, 999)

    // Find approved leave requests starting in 3 days
    const upcomingLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'approved',
        startDate: {
          gte: new Date(reminderDate.getTime() - 24 * 60 * 60 * 1000), // Start of reminder date
          lte: reminderDate, // End of reminder date
        },
        // Only send reminder if not already sent (check notification)
        // We'll track this by checking if a notification was sent today
      },
      include: {
        staff: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (upcomingLeaves.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No leave reminders to send',
        count: 0,
      })
    }

    let sentCount = 0
    let errorCount = 0

    // Send reminders
    for (const leave of upcomingLeaves) {
      try {
        // Check if reminder was already sent today
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: leave.staff.user?.id,
            type: 'leave_start_reminder',
            createdAt: {
              gte: new Date(today),
            },
            link: `/leaves/${leave.id}`,
          },
        })

        if (existingNotification) {
          // Already sent today, skip
          continue
        }

        if (!leave.staff.user) {
          // No user account, skip
          continue
        }

        const daysUntilLeave = Math.ceil(
          (new Date(leave.startDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Create in-app notification
        await sendNotification({
          userId: leave.staff.user.id,
          staffId: leave.staffId,
          type: 'leave_start_reminder',
          title: 'Upcoming Leave Reminder',
          message: `Your ${leave.leaveType} leave (${leave.days} day${leave.days > 1 ? 's' : ''}) starts in ${daysUntilLeave} day${daysUntilLeave > 1 ? 's' : ''}. Start date: ${new Date(leave.startDate).toLocaleDateString()}`,
          link: `/leaves/${leave.id}`,
          priority: 'normal',
          metadata: {
            leaveRequestId: leave.id,
            startDate: leave.startDate,
            daysUntilLeave,
          },
        })

        sentCount++
      } catch (error) {
        console.error(`Error sending reminder for leave ${leave.id}:`, error)
        errorCount++
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'LEAVE_START_REMINDERS_SENT',
        user: 'system',
        userRole: 'SYSTEM',
        details: `Sent ${sentCount} leave start reminders, ${errorCount} errors`,
        metadata: {
          reminderDate: reminderDate.toISOString(),
          totalLeaves: upcomingLeaves.length,
          sentCount,
          errorCount,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Leave start reminders processed`,
      total: upcomingLeaves.length,
      sent: sentCount,
      errors: errorCount,
    })
  } catch (error: any) {
    console.error('Error processing leave start reminders:', error)
    return NextResponse.json(
      {
        error: 'Failed to process leave start reminders',
        details: error?.message,
      },
      { status: 500 }
    )
  }
}

// Allow POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}

