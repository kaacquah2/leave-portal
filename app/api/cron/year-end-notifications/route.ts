/**
 * Year-End Notifications Cron Job
 * Sends notifications to employees about approaching year-end
 * Runs daily starting 30 days before year-end
 * 
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/year-end-notifications",
 *     "schedule": "0 9 * * *" // Daily at 9 AM
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyYearEndApproaching, notifySupervisorHighBalances, notifyHRYearEndApproaching } from '@/lib/notification-service'

export async function GET(request: NextRequest) {
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
    const currentYear = today.getFullYear()
    const yearEnd = new Date(currentYear, 11, 31) // December 31
    const daysUntilYearEnd = Math.ceil((yearEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Only send notifications if within 30 days of year-end
    if (daysUntilYearEnd > 30 || daysUntilYearEnd < 0) {
      return NextResponse.json({
        success: true,
        message: `Not within notification window. ${daysUntilYearEnd} days until year-end.`,
        daysUntilYearEnd,
      })
    }

    // Check if we should send notifications (30, 14, 7 days before)
    const shouldNotify = daysUntilYearEnd === 30 || daysUntilYearEnd === 14 || daysUntilYearEnd === 7

    if (!shouldNotify) {
      return NextResponse.json({
        success: true,
        message: `Not a notification day. ${daysUntilYearEnd} days until year-end.`,
        daysUntilYearEnd,
      })
    }

    console.log(`[Year-End Notifications] Sending notifications (${daysUntilYearEnd} days until year-end)...`)

    // Get all active staff
    const allStaff = await prisma.staffMember.findMany({
      where: { active: true },
      include: {
        leaveBalance: true,
      },
    })

    // Get all leave policies
    const policies = await prisma.leavePolicy.findMany({
      where: { active: true },
    })

    let notificationsSent = 0
    let staffWithHighBalances = 0
    let totalUnusedLeave = 0

    // Group team members by supervisor
    const supervisorTeams: Record<string, Array<{
      staffId: string
      staffName: string
      leaveType: string
      unusedLeave: number
      maxCarryForward: number
    }>> = {}

    // Process each staff member
    for (const staff of allStaff) {
      if (!staff.leaveBalance) continue

      const staffName = `${staff.firstName} ${staff.lastName}`
      let hasHighBalance = false

      // Check each leave type
      const leaveTypes = ['annual', 'sick', 'specialService', 'training', 'study']
      
      for (const leaveType of leaveTypes) {
        const balance = staff.leaveBalance[leaveType as keyof typeof staff.leaveBalance] as number
        if (balance <= 0) continue

        const policy = policies.find(p => 
          p.leaveType.toLowerCase() === leaveType.charAt(0).toUpperCase() + leaveType.slice(1)
        )

        const maxCarryForward = policy?.carryoverAllowed ? (policy.maxCarryover || 0) : 0
        const willForfeit = Math.max(0, balance - maxCarryForward)

        // Send notification to employee
        await notifyYearEndApproaching({
          staffId: staff.staffId,
          staffName,
          daysUntilYearEnd,
          unusedLeave: balance,
          maxCarryForward,
          leaveType: leaveType.charAt(0).toUpperCase() + leaveType.slice(1),
        })
        notificationsSent++

        // Track high balances for supervisor notifications
        if (willForfeit > 0 || balance > maxCarryForward) {
          hasHighBalance = true
          totalUnusedLeave += balance

          if (staff.immediateSupervisorId) {
            if (!supervisorTeams[staff.immediateSupervisorId]) {
              supervisorTeams[staff.immediateSupervisorId] = []
            }
            supervisorTeams[staff.immediateSupervisorId].push({
              staffId: staff.staffId,
              staffName,
              leaveType: leaveType.charAt(0).toUpperCase() + leaveType.slice(1),
              unusedLeave: balance,
              maxCarryForward,
            })
          }
        }
      }

      if (hasHighBalance) {
        staffWithHighBalances++
      }
    }

    // Notify supervisors about team members with high balances
    for (const [supervisorId, teamMembers] of Object.entries(supervisorTeams)) {
      const supervisor = await prisma.staffMember.findUnique({
        where: { staffId: supervisorId },
      })

      if (supervisor) {
        await notifySupervisorHighBalances({
          supervisorId,
          supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
          teamMembers,
        })
      }
    }

    // Notify HR
    await notifyHRYearEndApproaching({
      daysUntilYearEnd,
      staffWithHighBalances,
      totalUnusedLeave,
    })

    console.log(`[Year-End Notifications] Sent ${notificationsSent} notifications to employees, ${Object.keys(supervisorTeams).length} supervisors, and HR`)

    return NextResponse.json({
      success: true,
      daysUntilYearEnd,
      notificationsSent,
      staffWithHighBalances,
      totalUnusedLeave,
      supervisorsNotified: Object.keys(supervisorTeams).length,
    })
  } catch (error: any) {
    console.error('[Year-End Notifications] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to send year-end notifications',
        errorCode: 'NOTIFICATION_ERROR',
      },
      { status: 500 }
    )
  }
}

