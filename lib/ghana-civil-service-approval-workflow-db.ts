/**
 * Ghana Civil Service Approval Workflow - Database Operations
 * Handles ApprovalStep database operations for persistent tracking
 */

import { prisma } from '@/lib/prisma'
import { CivilServiceApprovalLevel } from './ghana-civil-service-approval-workflow'

/**
 * Create ApprovalSteps in database for a leave request
 * This provides persistent tracking of approval workflow state
 */
export async function createApprovalSteps(
  leaveRequestId: string,
  approvalLevels: CivilServiceApprovalLevel[]
): Promise<void> {
  try {
    // Create approval steps in database
    for (const level of approvalLevels) {
      // Check if previous level exists and is complete
      const previousLevels = approvalLevels.filter((l) => l.level < level.level)
      const previousLevelCompleted =
        previousLevels.length === 0 ||
        previousLevels.every((l) => l.status === 'approved' || (l.status as string) === 'skipped')

      await prisma.approvalStep.create({
        data: {
          leaveRequestId,
          level: level.level,
          approverRole: level.approverRole,
          approverStaffId: level.approverStaffId || null,
          status: level.status,
          previousLevelCompleted,
        },
      })
    }
  } catch (error) {
    console.error('[Workflow] Error creating approval steps:', error)
    // Don't throw - allow fallback to JSON approvalLevels
  }
}

/**
 * Update approval step status in database
 */
export async function updateApprovalStep(
  leaveRequestId: string,
  level: number,
  status: 'approved' | 'rejected' | 'delegated' | 'skipped' | 'pending',
  approverUserId?: string,
  approverName?: string,
  comments?: string,
  delegatedTo?: string
): Promise<void> {
  try {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    }

    if (status === 'approved' || status === 'rejected') {
      updateData.approvalDate = new Date()
      if (approverName) updateData.approverName = approverName
      if (approverUserId) updateData.approverUserId = approverUserId
      if (comments) updateData.comments = comments
    }

    if (status === 'delegated' && delegatedTo) {
      updateData.delegatedTo = delegatedTo
      updateData.delegationDate = new Date()
      // Get delegate name
      const delegateUser = await prisma.user.findUnique({
        where: { id: delegatedTo },
        include: {
          staff: {
            select: { firstName: true, lastName: true },
          },
        },
      })
      if (delegateUser?.staff) {
        updateData.delegatedToName = `${delegateUser.staff.firstName} ${delegateUser.staff.lastName}`
      }
    }

    await prisma.approvalStep.update({
      where: {
        leaveRequestId_level: {
          leaveRequestId,
          level,
        },
      },
      data: updateData,
    })

    // Update previousLevelCompleted for next steps
    const nextSteps = await prisma.approvalStep.findMany({
      where: {
        leaveRequestId,
        level: { gt: level },
      },
    })

    if (nextSteps.length > 0) {
      // Mark next step as having previous level completed if this was approved
      if (status === 'approved') {
        const nextStep = nextSteps.sort((a, b) => a.level - b.level)[0]
        await prisma.approvalStep.update({
          where: { id: nextStep.id },
          data: { previousLevelCompleted: true },
        })
      }
    }
  } catch (error) {
    console.error('[Workflow] Error updating approval step:', error)
    throw error
  }
}

/**
 * Get approval steps from database for a leave request
 */
export async function getApprovalSteps(leaveRequestId: string) {
  return await prisma.approvalStep.findMany({
    where: { leaveRequestId },
    orderBy: { level: 'asc' },
  })
}

