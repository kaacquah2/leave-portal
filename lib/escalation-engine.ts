/**
 * Escalation Engine for MoFA Leave Approval System
 * 
 * Implements automatic escalation after 10 working days of pending approval
 * Handles approver unavailability and automatic reassignment
 */

import { prisma } from '@/lib/prisma'
import { sendNotification } from './notification-service'
import { getApprovalSteps, updateApprovalStep } from './mofa-approval-workflow'
import { resolveApprover } from './acting-appointment-resolver'

/**
 * Calculate working days between two dates (excluding weekends)
 */
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let workingDays = 0
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()
    // Exclude weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return workingDays
}

/**
 * Escalate approval to next level after 10 working days
 */
export async function escalateApproval(
  leaveRequestId: string,
  currentLevel: number
): Promise<void> {
  try {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        staff: true,
        approvalSteps: {
          orderBy: { level: 'asc' },
        },
      },
    })

    if (!leaveRequest || leaveRequest.status !== 'pending') {
      return
    }

    const currentStep = leaveRequest.approvalSteps.find(s => s.level === currentLevel)
    if (!currentStep || currentStep.status !== 'pending') {
      return
    }

    // Check if pending for 10+ working days
    const workingDaysPending = calculateWorkingDays(
      currentStep.createdAt,
      new Date()
    )

    if (workingDaysPending < 10) {
      return // Not yet time to escalate
    }

    // Find next approval level
    const nextStep = leaveRequest.approvalSteps.find(s => s.level > currentLevel && s.status === 'pending')
    
    if (!nextStep) {
      // No next level - escalate to HR
      await escalateToHR(leaveRequestId, currentLevel)
      return
    }

    // Try to resolve approver for next level
    const nextApprover = await resolveApprover(
      nextStep.approverRole,
      leaveRequest.staffId,
      leaveRequest.staff.unit || undefined
    )

    if (nextApprover) {
      // Reassign to next level
      await updateApprovalStep(
        leaveRequestId,
        currentLevel,
        'skipped',
        undefined,
        undefined,
        'Automatically escalated after 10 working days'
      )

      await updateApprovalStep(
        leaveRequestId,
        nextStep.level,
        'pending',
        nextApprover.userId,
        nextApprover.name
      )

      // Notify parties
      await notifyEscalation(leaveRequest, currentLevel, nextStep.level, nextApprover.name)
    } else {
      // No approver found - escalate to HR
      await escalateToHR(leaveRequestId, currentLevel)
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'approval_escalated',
        user: 'system',
        userRole: 'SYSTEM',
        staffId: leaveRequest.staffId,
        leaveRequestId: leaveRequestId,
        details: `Approval escalated from level ${currentLevel} to level ${nextStep?.level || 'HR'} after ${workingDaysPending} working days`,
        metadata: {
          fromLevel: currentLevel,
          toLevel: nextStep?.level || 'HR',
          workingDaysPending,
        },
      },
    })
  } catch (error) {
    console.error('[Escalation] Error escalating approval:', error)
    throw error
  }
}

/**
 * Escalate directly to HR when no approver found
 */
async function escalateToHR(leaveRequestId: string, fromLevel: number): Promise<void> {
  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    include: { staff: true },
  })

  if (!leaveRequest) return

  // Find HR approver
  const hrUsers = await prisma.user.findMany({
    where: {
      role: { in: ['HR_OFFICER', 'HR_DIRECTOR'] },
      active: true,
    },
    include: { staff: true },
  })

  if (hrUsers.length > 0) {
    const hrUser = hrUsers[0]
    const hrName = hrUser.staff 
      ? `${hrUser.staff.firstName} ${hrUser.staff.lastName}`
      : hrUser.email

    // Update current step
    await updateApprovalStep(
      leaveRequestId,
      fromLevel,
      'skipped',
      undefined,
      undefined,
      'Escalated to HR after 10 working days - no approver available'
    )

    // Create or update HR approval step
    const hrStep = await prisma.approvalStep.findFirst({
      where: {
        leaveRequestId,
        approverRole: { in: ['HR_OFFICER', 'HR_DIRECTOR'] },
      },
    })

    if (hrStep) {
      await updateApprovalStep(
        leaveRequestId,
        hrStep.level,
        'pending',
        hrUser.id,
        hrName
      )
    }

    // Notify HR
    await sendNotification({
      userId: hrUser.id,
      type: 'escalation',
      title: '🚨 Escalated Leave Request - Action Required',
      message: `Leave request from ${leaveRequest.staffName} has been escalated to HR after 10 working days pending at level ${fromLevel}.`,
      link: `/leaves/${leaveRequestId}`,
      priority: 'urgent',
    })
  }
}

/**
 * Notify parties about escalation
 */
async function notifyEscalation(
  leaveRequest: any,
  fromLevel: number,
  toLevel: number,
  newApproverName: string
): Promise<void> {
  // Notify original approver
  if (leaveRequest.approvalSteps) {
    const originalStep = leaveRequest.approvalSteps.find((s: any) => s.level === fromLevel)
    if (originalStep?.approverUserId) {
      await sendNotification({
        userId: originalStep.approverUserId,
        type: 'escalation',
        title: 'Leave Request Escalated',
        message: `Leave request from ${leaveRequest.staffName} has been escalated to level ${toLevel} after 10 working days.`,
        link: `/leaves/${leaveRequest.id}`,
        priority: 'normal',
      })
    }
  }

  // Notify employee
  const employeeUser = await prisma.user.findFirst({
    where: { staffId: leaveRequest.staffId },
  })

  if (employeeUser) {
    await sendNotification({
      userId: employeeUser.id,
      type: 'escalation',
      title: 'Leave Request Escalated',
      message: `Your leave request has been escalated to ${newApproverName} after 10 working days.`,
      link: `/leaves/${leaveRequest.id}`,
      priority: 'normal',
    })
  }
}

/**
 * Check and escalate all pending approvals
 * Should be run as a scheduled job (daily)
 */
export async function checkAndEscalatePendingApprovals(): Promise<void> {
  try {
    const pendingSteps = await prisma.approvalStep.findMany({
      where: {
        status: 'pending',
        createdAt: {
          lte: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // At least 10 days old
        },
      },
      include: {
        leaveRequest: {
          include: {
            staff: true,
            approvalSteps: {
              orderBy: { level: 'asc' },
            },
          },
        },
      },
    })

    for (const step of pendingSteps) {
      const workingDaysPending = calculateWorkingDays(
        step.createdAt,
        new Date()
      )

      if (workingDaysPending >= 10) {
        await escalateApproval(step.leaveRequestId, step.level)
      }
    }
  } catch (error) {
    console.error('[Escalation] Error checking pending approvals:', error)
    throw error
  }
}

