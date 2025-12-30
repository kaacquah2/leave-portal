/**
 * MoFA Government HR Leave Approval Workflow
 * Implements Ghana Government Public Service standards:
 * - PSC Leave Policy
 * - OHCS HRMIS guidelines
 * - Automatic routing based on organizational structure
 */

import { prisma } from '@/lib/prisma'
import { reportsToChiefDirector, isHRMU } from '@/lib/mofa-unit-mapping'

export interface MoFAApprovalLevel {
  level: number
  approverRole: 'SUPERVISOR' | 'UNIT_HEAD' | 'DIVISION_HEAD' | 'DIRECTOR' | 'REGIONAL_MANAGER' | 'HR_OFFICER' | 'HR_DIRECTOR' | 'CHIEF_DIRECTOR'
  approverStaffId?: string // Specific approver staff ID (if known)
  approverName?: string
  status: 'pending' | 'approved' | 'rejected'
  approvalDate?: string
  comments?: string
  delegatedTo?: string
  delegatedToName?: string
}

export interface StaffOrganizationalInfo {
  staffId: string
  dutyStation: 'HQ' | 'Region' | 'District' | 'Agency' | null
  directorate: string | null
  division: string | null
  unit: string | null
  immediateSupervisorId: string | null
  managerId: string | null
  grade: string
  position: string
}

/**
 * Determine approval workflow based on staff organizational structure
 * Implements MoFA routing rules:
 * - HQ/Directorate Staff: Employee → Supervisor → Unit Head → Directorate Head → HR (Final)
 * - Regional/District Staff: Employee → Supervisor → Regional Manager → Directorate (HQ) → HR (Final)
 * - Senior Staff/Directors: Employee → HR Director → Chief Director / Ministerial Authority
 */
export async function determineMoFAApprovalWorkflow(
  staffInfo: StaffOrganizationalInfo,
  leaveType: string,
  days: number
): Promise<MoFAApprovalLevel[]> {
  const levels: MoFAApprovalLevel[] = []

  // Check if senior staff (Director level or above)
  const isSeniorStaff = staffInfo.position.toLowerCase().includes('director') || 
                        staffInfo.grade.includes('Director') ||
                        ['Chief Director', 'Deputy Director', 'Director'].some(title => 
                          staffInfo.position.includes(title)
                        )

  if (isSeniorStaff) {
    // Senior Staff / Directors: Simplified workflow
    levels.push({
      level: 1,
      approverRole: 'HR_DIRECTOR',
      status: 'pending',
    })
    levels.push({
      level: 2,
      approverRole: 'CHIEF_DIRECTOR',
      status: 'pending',
    })
    return levels
  }

  // Determine workflow based on duty station and organizational structure
  if (staffInfo.dutyStation === 'HQ' || staffInfo.dutyStation === null || !staffInfo.dutyStation) {
    // HQ Staff Workflow
    // Check for special cases first
    
    // SPECIAL CASE 1: HRMU (Human Resource Management Unit)
    // HRMU staff require HR Director approval before final HR Officer approval
    const isHRMUUnit = isHRMU(staffInfo.unit)
    
    // Level 1: Supervisor
    if (staffInfo.immediateSupervisorId) {
      levels.push({
        level: 1,
        approverRole: 'SUPERVISOR',
        approverStaffId: staffInfo.immediateSupervisorId,
        status: 'pending',
      })
    } else {
      // Fallback if no supervisor assigned
      levels.push({
        level: 1,
        approverRole: 'SUPERVISOR',
        status: 'pending',
      })
    }

    // Level 2: Unit Head (if unit exists)
    if (staffInfo.unit) {
      levels.push({
        level: 2,
        approverRole: 'UNIT_HEAD',
        status: 'pending',
      })
    }

    // Level 3: Division Head (if division exists - not commonly used in MoFA)
    if (staffInfo.division) {
      levels.push({
        level: levels.length + 1,
        approverRole: 'DIVISION_HEAD',
        status: 'pending',
      })
    }

    // Level 4: Directorate Head or Chief Director
    // Determine if unit reports to Chief Director or a Directorate
    const reportsToChiefDir = reportsToChiefDirector(staffInfo.unit, staffInfo.directorate)
    
    if (reportsToChiefDir) {
      // Units under Chief Director (Office of the Minister, Office of Chief Director)
      // Examples: Ministerial Secretariat, Protocol Unit, PPME Unit, Internal Audit, Legal, RSIM, Procurement
      levels.push({
        level: levels.length + 1,
        approverRole: 'CHIEF_DIRECTOR',
        status: 'pending',
      })
    } else {
      // Units under a Directorate
      // Examples: Finance & Administration Directorate, PPME Directorate
      levels.push({
        level: levels.length + 1,
        approverRole: 'DIRECTOR',
        status: 'pending',
      })
    }

    // Level 5: HR Director (only for HRMU - special segregation of duties)
    if (isHRMUUnit) {
      levels.push({
        level: levels.length + 1,
        approverRole: 'HR_DIRECTOR',
        status: 'pending',
      })
    }

    // Final: HR Officer
    levels.push({
      level: levels.length + 1,
      approverRole: 'HR_OFFICER',
      status: 'pending',
    })
  } else if (staffInfo.dutyStation === 'Region' || staffInfo.dutyStation === 'District') {
    // Regional / District Staff Workflow
    // Employee → Supervisor → Regional Manager → Directorate (HQ) → HR (Final)
    
    if (staffInfo.immediateSupervisorId) {
      levels.push({
        level: 1,
        approverRole: 'SUPERVISOR',
        approverStaffId: staffInfo.immediateSupervisorId,
        status: 'pending',
      })
    } else {
      levels.push({
        level: 1,
        approverRole: 'SUPERVISOR',
        status: 'pending',
      })
    }

    // Regional Manager
    levels.push({
      level: 2,
      approverRole: 'REGIONAL_MANAGER',
      status: 'pending',
    })

    // Directorate (HQ) - if directorate exists
    if (staffInfo.directorate) {
      levels.push({
        level: 3,
        approverRole: 'DIRECTOR',
        status: 'pending',
      })
    }

    // HR Final Approval
    levels.push({
      level: levels.length + 1,
      approverRole: 'HR_OFFICER',
      status: 'pending',
    })
  } else {
    // Agency or other duty stations - use standard HQ workflow
    if (staffInfo.immediateSupervisorId) {
      levels.push({
        level: 1,
        approverRole: 'SUPERVISOR',
        approverStaffId: staffInfo.immediateSupervisorId,
        status: 'pending',
      })
    } else {
      levels.push({
        level: 1,
        approverRole: 'SUPERVISOR',
        status: 'pending',
      })
    }

    // HR Final Approval
    levels.push({
      level: 2,
      approverRole: 'HR_OFFICER',
      status: 'pending',
    })
  }

  return levels
}

/**
 * Get staff organizational information for workflow determination
 */
export async function getStaffOrganizationalInfo(staffId: string): Promise<StaffOrganizationalInfo | null> {
  const staff = await prisma.staffMember.findUnique({
    where: { staffId },
    select: {
      staffId: true,
      dutyStation: true,
      directorate: true,
      division: true,
      unit: true,
      immediateSupervisorId: true,
      managerId: true,
      grade: true,
      position: true,
    },
  })

  if (!staff) return null

  return {
    staffId: staff.staffId,
    dutyStation: (staff.dutyStation as 'HQ' | 'Region' | 'District' | 'Agency') || null,
    directorate: staff.directorate,
    division: staff.division,
    unit: staff.unit,
    immediateSupervisorId: staff.immediateSupervisorId,
    managerId: staff.managerId,
    grade: staff.grade,
    position: staff.position,
  }
}

/**
 * Validate that approver cannot approve their own request
 */
export async function validateApproverNotSelf(
  leaveRequestStaffId: string,
  approverStaffId: string
): Promise<boolean> {
  return leaveRequestStaffId !== approverStaffId
}

/**
 * Get next approvers for notifications
 */
export function getNextMoFAApprovers(levels: MoFAApprovalLevel[]): MoFAApprovalLevel[] {
  // Find first pending level
  const pendingLevels = levels.filter(l => l.status === 'pending')
  if (pendingLevels.length === 0) return []

  // Return the first pending level (sequential approval)
  const firstPending = pendingLevels.sort((a, b) => a.level - b.level)[0]
  return firstPending ? [firstPending] : []
}

/**
 * Check if all required approval levels are complete
 */
export function areAllMoFALevelsApproved(levels: MoFAApprovalLevel[]): boolean {
  if (levels.length === 0) return false
  
  // Check for any rejection
  const anyRejected = levels.some(l => l.status === 'rejected')
  if (anyRejected) return false

  // All levels must be approved
  return levels.every(l => l.status === 'approved')
}

/**
 * Calculate overall status from approval levels
 */
export function calculateMoFAApprovalStatus(levels: MoFAApprovalLevel[]): 'pending' | 'approved' | 'rejected' {
  if (levels.length === 0) return 'pending'

  // Check for any rejection
  const anyRejected = levels.some(l => l.status === 'rejected')
  if (anyRejected) return 'rejected'

  // Check if all approved
  const allApproved = areAllMoFALevelsApproved(levels)
  if (allApproved) return 'approved'

  return 'pending'
}

/**
 * Create ApprovalSteps in database for a leave request
 * This provides persistent tracking of approval workflow state
 */
export async function createApprovalSteps(
  leaveRequestId: string,
  approvalLevels: MoFAApprovalLevel[]
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
  status: 'approved' | 'rejected' | 'delegated' | 'skipped',
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

