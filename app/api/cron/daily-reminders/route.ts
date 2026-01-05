/**
 * Combined Daily Reminders Cron Job
 * Handles all daily reminder tasks:
 * 1. Escalation reminders for pending approvals
 * 2. Leave start date reminders (3 days before)
 * 3. Year-end notifications (when within 30 days of year-end)
 * 
 * Note: Year-end processing is now manual-only and must be triggered by HR Officer or HR Director
 * through the UI at /api/leave-rules/year-end
 * 
 * Schedule: Daily at 9 AM
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-reminders",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  checkAndSendEscalationReminders,
  sendNotification,
  notifyYearEndApproaching,
  notifySupervisorHighBalances,
  notifyHRYearEndApproaching
} from '@/lib/notification-service'

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export const runtime = 'nodejs' // Explicitly set to nodejs runtime

export async function GET(request: NextRequest) {
  // During static export build, return early without accessing headers
  const isBuild = 
    (typeof process !== 'undefined' && process.env.NEXT_PHASE === 'phase-production-build') ||
    (typeof process !== 'undefined' && process.env.NEXT_PHASE === 'phase-export') ||
    (typeof process !== 'undefined' && !process.env.DATABASE_URL)
  
  if (isBuild) {
    return NextResponse.json({
      success: true,
      message: 'Static export build - daily reminders require runtime',
      timestamp: new Date().toISOString(),
      results: {
        escalationReminders: { success: false, message: 'Requires runtime' },
        leaveStartReminders: { success: false, sent: 0, errors: 0, total: 0 },
        yearEndNotifications: { success: false, message: 'Requires runtime', daysUntilYearEnd: 0 },
        yearEndProcessing: { success: false, message: 'Requires runtime', processed: false },
      },
    })
  }
  
  // Wrap in runtime handler
  const runtimeHandler = async () => {
    try {
      // Verify cron secret or Vercel Cron header
      const authHeader = request.headers.get('authorization')
      const cronSecret = process.env.CRON_SECRET
      
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        const cronHeader = request.headers.get('x-vercel-cron')
        if (!cronHeader) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
      }

    const today = new Date()
    const isYearEnd = today.getMonth() === 11 && today.getDate() === 31 // December 31st

    const results = {
      escalationReminders: { success: false, message: '' },
      leaveStartReminders: { success: false, sent: 0, errors: 0, total: 0 },
      yearEndNotifications: { success: false, message: '', daysUntilYearEnd: 0 },
      yearEndProcessing: { success: false, message: '', processed: false }
    }

    // 1. Process escalation reminders
    try {
      await checkAndSendEscalationReminders()
      results.escalationReminders = { success: true, message: 'Escalation reminders processed' }
    } catch (error: any) {
      console.error('Error processing escalation reminders:', error)
      results.escalationReminders = { success: false, message: error?.message || 'Failed' }
    }

    // 2. Process leave start reminders
    try {
      const reminderToday = new Date(today)
      reminderToday.setHours(0, 0, 0, 0)
      
      const reminderDate = new Date(reminderToday)
      reminderDate.setDate(reminderDate.getDate() + 3)
      reminderDate.setHours(23, 59, 59, 999)

      const upcomingLeaves = await prisma.leaveRequest.findMany({
        where: {
          status: 'approved',
          startDate: {
            gte: new Date(reminderDate.getTime() - 24 * 60 * 60 * 1000),
            lte: reminderDate,
          },
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

      let sentCount = 0
      let errorCount = 0

      for (const leave of upcomingLeaves) {
        try {
          const existingNotification = await prisma.notification.findFirst({
            where: {
              userId: leave.staff.user?.id,
              type: 'leave_start_reminder',
              createdAt: {
                gte: reminderToday,
              },
              link: `/leaves/${leave.id}`,
            },
          })

          if (existingNotification || !leave.staff.user) {
            continue
          }

          const daysUntilLeave = Math.ceil(
            (new Date(leave.startDate).getTime() - reminderToday.getTime()) / (1000 * 60 * 60 * 24)
          )

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
          console.error(`Error sending leave start reminder for leave ${leave.id}:`, error)
          errorCount++
        }
      }

      if (upcomingLeaves.length > 0) {
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
      }

      results.leaveStartReminders = {
        success: true,
        sent: sentCount,
        errors: errorCount,
        total: upcomingLeaves.length,
      }
    } catch (error: any) {
      console.error('Error processing leave start reminders:', error)
      results.leaveStartReminders = {
        success: false,
        sent: 0,
        errors: 0,
        total: 0,
      }
    }

    // 3. Process year-end notifications (only if within 30 days of year-end)
    try {
      const today = new Date()
      const currentYear = today.getFullYear()
      const yearEnd = new Date(currentYear, 11, 31) // December 31
      const daysUntilYearEnd = Math.ceil((yearEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      results.yearEndNotifications.daysUntilYearEnd = daysUntilYearEnd

      if (daysUntilYearEnd <= 30 && daysUntilYearEnd >= 0) {
        const shouldNotify = daysUntilYearEnd === 30 || daysUntilYearEnd === 14 || daysUntilYearEnd === 7

        if (shouldNotify) {
          console.log(`[Year-End Notifications] Sending notifications (${daysUntilYearEnd} days until year-end)...`)

          // Get all active staff with leave balances
          const allStaff = await prisma.staffMember.findMany({
            where: { active: true, employmentStatus: 'active' },
            include: {
              leaveBalance: true,
              user: {
                select: { id: true, email: true },
              },
            },
          })

          // Get leave policies for carry-forward calculations
          const leavePolicies = await prisma.leavePolicy.findMany({
            where: { active: true },
          })

          const leaveTypes = ['annual', 'sick', 'specialService', 'training', 'study']
          let notifiedCount = 0
          let staffWithHighBalances = 0
          let totalUnusedLeave = 0

          // PERFORMANCE FIX: Collect all notifications first, then batch send
          const notificationsToSend: Array<{
            staffId: string
            staffName: string
            daysUntilYearEnd: number
            unusedLeave: number
            maxCarryForward: number
            leaveType: string
          }> = []

          // Process each staff member (collect notifications, don't send yet)
          for (const staff of allStaff) {
            if (!staff.user || !staff.leaveBalance) continue

            try {
              // Process each leave type
              for (const leaveType of leaveTypes) {
                const balance = staff.leaveBalance[leaveType as keyof typeof staff.leaveBalance] as number
                if (balance <= 0) continue

                // Find policy for this leave type
                const policy = leavePolicies.find(
                  p => p.leaveType.toLowerCase() === leaveType.charAt(0).toUpperCase() + leaveType.slice(1)
                )

                const maxCarryForward = policy?.carryoverAllowed ? (policy.maxCarryover || 0) : 0
                const unusedLeave = balance

                if (unusedLeave > 0) {
                  totalUnusedLeave += unusedLeave
                  if (unusedLeave > maxCarryForward) {
                    staffWithHighBalances++
                  }

                  // Collect notification data (don't send yet)
                  notificationsToSend.push({
                    staffId: staff.staffId,
                    staffName: `${staff.firstName} ${staff.lastName}`,
                    daysUntilYearEnd,
                    unusedLeave,
                    maxCarryForward,
                    leaveType: leaveType.charAt(0).toUpperCase() + leaveType.slice(1),
                  })
                }
              }

              notifiedCount++
            } catch (error) {
              console.error(`Error processing staff ${staff.staffId}:`, error)
            }
          }

          // Batch send notifications (process in chunks to avoid overwhelming the system)
          const batchSize = 50
          for (let i = 0; i < notificationsToSend.length; i += batchSize) {
            const batch = notificationsToSend.slice(i, i + batchSize)
            await Promise.all(
              batch.map(notification => 
                notifyYearEndApproaching(notification).catch(error => {
                  console.error(`Error notifying staff ${notification.staffId}:`, error)
                })
              )
            )
          }

          // Group team members by supervisor
          const supervisorMap = new Map<string, Array<{
            staffId: string
            staffName: string
            leaveType: string
            unusedLeave: number
            maxCarryForward: number
          }>>()

          for (const staff of allStaff) {
            if (!staff.immediateSupervisorId || !staff.leaveBalance) continue

            for (const leaveType of leaveTypes) {
              const balance = staff.leaveBalance[leaveType as keyof typeof staff.leaveBalance] as number
              if (balance <= 0) continue

              const policy = leavePolicies.find(
                p => p.leaveType.toLowerCase() === leaveType.charAt(0).toUpperCase() + leaveType.slice(1)
              )
              const maxCarryForward = policy?.carryoverAllowed ? (policy.maxCarryover || 0) : 0

              if (balance > maxCarryForward) {
                if (!supervisorMap.has(staff.immediateSupervisorId)) {
                  supervisorMap.set(staff.immediateSupervisorId, [])
                }
                supervisorMap.get(staff.immediateSupervisorId)!.push({
                  staffId: staff.staffId,
                  staffName: `${staff.firstName} ${staff.lastName}`,
                  leaveType: leaveType.charAt(0).toUpperCase() + leaveType.slice(1),
                  unusedLeave: balance,
                  maxCarryForward,
                })
              }
            }
          }

          // Send notifications to supervisors
          for (const [supervisorId, teamMembers] of supervisorMap.entries()) {
            const supervisor = allStaff.find(s => s.staffId === supervisorId)
            if (supervisor && supervisor.user) {
              try {
                await notifySupervisorHighBalances({
                  supervisorId: supervisor.staffId,
                  supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
                  teamMembers,
                })
              } catch (error) {
                console.error(`Error notifying supervisor ${supervisorId}:`, error)
              }
            }
          }

          // Notify HR
          await notifyHRYearEndApproaching({
            daysUntilYearEnd,
            staffWithHighBalances,
            totalUnusedLeave,
          })

          results.yearEndNotifications = {
            success: true,
            message: `Year-end notifications sent to ${notifiedCount} staff members`,
            daysUntilYearEnd,
          }
        } else {
          results.yearEndNotifications = {
            success: true,
            message: `Not a notification day. ${daysUntilYearEnd} days until year-end.`,
            daysUntilYearEnd,
          }
        }
      } else {
        results.yearEndNotifications = {
          success: true,
          message: `Not within notification window. ${daysUntilYearEnd} days until year-end.`,
          daysUntilYearEnd,
        }
      }
    } catch (error: any) {
      console.error('Error processing year-end notifications:', error)
      results.yearEndNotifications = {
        success: false,
        message: error?.message || 'Failed',
        daysUntilYearEnd: 0,
      }
    }

    // 4. Year-end processing notification (removed automatic processing)
    // Year-end processing must be manually triggered by HR Officer or HR Director
    // Only send notification reminder if it's approaching year-end
    if (isYearEnd) {
      results.yearEndProcessing = {
        success: true,
        message: 'Year-end date detected. Year-end processing must be manually triggered by HR Officer or HR Director through the UI. Automatic year-end processing is disabled. Please use the Year-End Processing page to manually trigger processing.',
        processed: false,
      }
    } else {
      results.yearEndProcessing = {
        success: true,
        message: 'Not year-end date, skipping processing',
        processed: false,
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Daily reminders processed',
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error: any) {
    console.error('Error processing daily reminders:', error)
    return NextResponse.json(
      {
        error: 'Failed to process daily reminders',
        details: error?.message,
      },
      { status: 500 }
    )
    }
  }
  
  return runtimeHandler()
}

// Allow POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}

