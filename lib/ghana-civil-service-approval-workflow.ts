/**
 * Ghana Civil Service HR Leave Approval Workflow
 * Compliant with:
 * - Civil Service Act, 1993 (PNDCL 327)
 * - Office of the Head of the Civil Service (OHCS) directives
 * - Public Services Commission (PSC) guidelines
 * 
 * Implements Ghana Civil Service approval workflows:
 * - Standard Staff: Employee → Immediate Supervisor → Unit Head → HoD → HR Officer → Chief Director → Final
 * - Unit Head Leave: Unit Head → Director/HoD → HR Officer → Chief Director → Final
 * - Director Leave: Director → HR Officer → Chief Director → Final
 * - Independent Unit Staff: Employee → HoD → HR Officer → Chief Director → Final
 * - HRMD Staff: HR Staff → HR Director → Chief Director → Final
 */

import { prisma } from '@/lib/prisma'
import { 
  reportsToChiefDirector, 
  isHRMD, 
  isIndependentUnit,
  isHeadOfDepartment,
  isDirectorPosition,
  isUnitHeadPosition,
  isChiefDirectorPosition
} from '@/lib/ghana-civil-service-unit-mapping'
import { resolveApprover } from './acting-appointment-resolver'
import { getDatabaseDrivenWorkflow } from './workflow-engine'

// Re-export database functions
export { createApprovalSteps, updateApprovalStep, getApprovalSteps } from './ghana-civil-service-approval-workflow-db'

export interface CivilServiceApprovalLevel {
  level: number
  approverRole: 'SUPERVISOR' | 'UNIT_HEAD' | 'HEAD_OF_DEPARTMENT' | 'HEAD_OF_INDEPENDENT_UNIT' | 'DIRECTOR' | 'HR_OFFICER' | 'HR_DIRECTOR' | 'CHIEF_DIRECTOR'
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
  subUnit?: string | null
  immediateSupervisorId: string | null
  managerId: string | null
  grade: string
  position: string
}

/**
 * Determine approval workflow based on staff organizational structure
 * Implements Ghana Civil Service routing rules
 * 
 * CRITICAL: This function automatically skips the applicant's own role in the approval chain.
 * This ensures no officer can approve, validate, recommend, or finalize their own leave.
 * 
 * Examples:
 * - Employee applying: Supervisor → Unit Head → HoD → HR Officer → Chief Director (Employee role skipped)
 * - Supervisor applying: Unit Head → HoD → HR Officer → Chief Director (Supervisor role skipped)
 * - Unit Head applying: Director/HoD → HR Officer → Chief Director (Unit Head role skipped)
 * - HR Officer applying: HR Director → Chief Director (HR Officer validation skipped)
 * - Director applying: HR Officer → Chief Director (Director role skipped)
 * - Chief Director applying: HR Director → Recorded/Notified (Chief Director role skipped)
 * 
 * WORKFLOW ENGINE: This function first attempts to use database-driven workflows.
 * If no matching workflow is found, it falls back to hard-coded logic for backward compatibility.
 */
export async function determineCivilServiceApprovalWorkflow(
  staffInfo: StaffOrganizationalInfo,
  leaveType: string,
  days: number,
  mdaId?: string
): Promise<CivilServiceApprovalLevel[]> {
  // Try database-driven workflow first
  try {
    const dbWorkflow = await getDatabaseDrivenWorkflow(staffInfo, leaveType, days, mdaId)
    if (dbWorkflow && dbWorkflow.length > 0) {
      return dbWorkflow
    }
  } catch (error) {
    // Log error but continue to fallback
    console.warn('[Workflow] Database-driven workflow failed, using fallback:', error)
  }

  // Fallback to hard-coded logic
  const levels: CivilServiceApprovalLevel[] = []

  // Check if staff is Chief Director (must be checked first)
  const isChiefDirector = isChiefDirectorPosition(staffInfo.position, staffInfo.grade)
  
  // Check if staff is a Director (but not Chief Director)
  const isDirector = isDirectorPosition(staffInfo.position, staffInfo.grade) && !isChiefDirector
  
  // Check if staff is a Unit Head
  const isUnitHead = isUnitHeadPosition(staffInfo.position)
  
  // Check if staff is Head of Department (Director or Head of Independent Unit)
  const isHoD = isHeadOfDepartment(staffInfo.position, staffInfo.grade, staffInfo.unit, staffInfo.directorate)

  // ============================================
  // WORKFLOW 0: Chief Director Leave
  // Chief Director → HR Director → Recorded/Notified (NO SELF-APPROVAL)
  // ============================================
  if (isChiefDirector) {
    // Chief Director cannot approve their own leave
    // Goes to HR Director for validation, then recorded/notified to OHCS
    levels.push({
      level: 1,
      approverRole: 'HR_DIRECTOR',
      status: 'pending',
    })
    // Note: After HR Director approval, status becomes "recorded" (not "approved")
    // This is handled in the API route
    return levels
  }

  // ============================================
  // WORKFLOW 1: Director Leave (Non-Chief Director)
  // Director → HR Officer → Chief Director → Final
  // ============================================
  if (isDirector) {
    levels.push({
      level: 1,
      approverRole: 'HR_OFFICER',
      status: 'pending',
    })
    levels.push({
      level: 2,
      approverRole: 'CHIEF_DIRECTOR',
      status: 'pending',
    })
    return levels
  }

  // ============================================
  // WORKFLOW 2: Unit Head Leave
  // Unit Head → Director/HoD → HR Officer → Chief Director → Final
  // ============================================
  if (isUnitHead && !isHoD) {
    // Unit Head (not HoD) - reports to Director or HoD
    const reportsToChiefDir = reportsToChiefDirector(staffInfo.unit, staffInfo.directorate)
    
    if (isIndependentUnit(staffInfo.unit)) {
      // Independent Unit Head reports to Chief Director (via HEAD_OF_INDEPENDENT_UNIT)
      // But for Unit Head leave, they report directly to Chief Director
      levels.push({
        level: 1,
        approverRole: 'CHIEF_DIRECTOR',
        status: 'pending',
      })
    } else if (reportsToChiefDir) {
      // Unit reports directly to Chief Director (edge case)
      levels.push({
        level: 1,
        approverRole: 'CHIEF_DIRECTOR',
        status: 'pending',
      })
    } else {
      // Unit Head in Directorate reports to Director (HEAD_OF_DEPARTMENT)
      levels.push({
        level: 1,
        approverRole: 'HEAD_OF_DEPARTMENT', // Director acts as HoD
        status: 'pending',
      })
    }
    
    levels.push({
      level: 2,
      approverRole: 'HR_OFFICER',
      status: 'pending',
    })
    levels.push({
      level: 3,
      approverRole: 'CHIEF_DIRECTOR',
      status: 'pending',
    })
    return levels
  }

  // ============================================
  // WORKFLOW 3: HR Director Leave
  // HR Director → Chief Director → Final
  // ============================================
  // Check if staff is HR Director (Director of HRMD)
  const isHRDirector = isDirector && isHRMD(staffInfo.unit)
  if (isHRDirector) {
    levels.push({
      level: 1,
      approverRole: 'CHIEF_DIRECTOR',
      status: 'pending',
    })
    return levels
  }

  // ============================================
  // WORKFLOW 4: HR Officer Leave
  // HR Officer → HR Director → Chief Director → Final
  // ============================================
  // Check if staff is HR Officer (HRMD staff but not Director)
  const isHRMDUnit = isHRMD(staffInfo.unit)
  const isHROfficer = isHRMDUnit && !isDirector && !isUnitHead
  
  if (isHROfficer) {
    // HR Officer cannot validate their own leave
    // Skip Supervisor, Unit Head, and HR Officer validation
    // Go directly to HR Director
    
    // Level 1: HR Director (HoD for HRMD)
    levels.push({
      level: 1,
      approverRole: 'HR_DIRECTOR',
      status: 'pending',
    })

    // Level 2: Chief Director
    levels.push({
      level: 2,
      approverRole: 'CHIEF_DIRECTOR',
      status: 'pending',
    })
    return levels
  }

  // ============================================
  // WORKFLOW 5: HRMD Staff (Non-HR Officer)
  // HR Staff → Supervisor → Unit Head → HR Director → Chief Director → Final
  // ============================================
  if (isHRMDUnit && !isHROfficer) {
    // Level 1: Immediate Supervisor (if exists)
    if (staffInfo.immediateSupervisorId) {
      const supervisorApprover = await resolveApprover('SUPERVISOR', staffInfo.staffId, staffInfo.unit || undefined)
      
      if (supervisorApprover) {
        levels.push({
          level: 1,
          approverRole: 'SUPERVISOR',
          approverStaffId: supervisorApprover.staffId,
          approverName: supervisorApprover.name,
          status: 'pending',
        })
      } else {
        levels.push({
          level: 1,
          approverRole: 'SUPERVISOR',
          approverStaffId: staffInfo.immediateSupervisorId,
          status: 'pending',
        })
      }
    }

    // Level 2: Unit Head (if exists)
    if (staffInfo.unit) {
      levels.push({
        level: 2,
        approverRole: 'UNIT_HEAD',
        status: 'pending',
      })
    }

    // Level 3: HR Director (HoD for HRMD)
    levels.push({
      level: levels.length + 1,
      approverRole: 'HR_DIRECTOR',
      status: 'pending',
    })

    // Level 4: Chief Director
    levels.push({
      level: levels.length + 1,
      approverRole: 'CHIEF_DIRECTOR',
      status: 'pending',
    })
    return levels
  }

  // ============================================
  // WORKFLOW 6: Head of Independent Unit Leave
  // Head of Independent Unit → HR Officer → Chief Director → Final
  // ============================================
  if (isIndependentUnit(staffInfo.unit) && isHoD) {
    // Head of Independent Unit (acts as HoD)
    // Skip Supervisor and Unit Head levels
    
    // Level 1: HR Officer (MANDATORY VALIDATION)
    levels.push({
      level: 1,
      approverRole: 'HR_OFFICER',
      status: 'pending',
    })

    // Level 2: Chief Director
    levels.push({
      level: 2,
      approverRole: 'CHIEF_DIRECTOR',
      status: 'pending',
    })
    return levels
  }

  // ============================================
  // WORKFLOW 7: Independent Supporting Unit Staff
  // Employee → Supervisor → Unit Head → HoD → HR Officer → Chief Director → Final
  // ============================================
  if (isIndependentUnit(staffInfo.unit)) {
    // Level 1: Immediate Supervisor
    if (staffInfo.immediateSupervisorId) {
      const supervisorApprover = await resolveApprover('SUPERVISOR', staffInfo.staffId, staffInfo.unit || undefined)
      
      if (supervisorApprover) {
        levels.push({
          level: 1,
          approverRole: 'SUPERVISOR',
          approverStaffId: supervisorApprover.staffId,
          approverName: supervisorApprover.name,
          status: 'pending',
        })
      } else {
        levels.push({
          level: 1,
          approverRole: 'SUPERVISOR',
          approverStaffId: staffInfo.immediateSupervisorId,
          status: 'pending',
        })
      }
    } else {
      levels.push({
        level: 1,
        approverRole: 'SUPERVISOR',
        status: 'pending',
      })
    }

    // Level 2: Unit Head (if exists)
    if (staffInfo.unit) {
      levels.push({
        level: 2,
        approverRole: 'UNIT_HEAD',
        status: 'pending',
      })
    }

    // Level 3: Head of Independent Unit (functions as HoD)
    levels.push({
      level: levels.length + 1,
      approverRole: 'HEAD_OF_INDEPENDENT_UNIT',
      status: 'pending',
    })

    // Level 4: HR Officer (MANDATORY VALIDATION)
    levels.push({
      level: levels.length + 1,
      approverRole: 'HR_OFFICER',
      status: 'pending',
    })

    // Level 5: Chief Director
    levels.push({
      level: levels.length + 1,
      approverRole: 'CHIEF_DIRECTOR',
      status: 'pending',
    })
    return levels
  }

  // ============================================
  // WORKFLOW 8: Standard Staff (Unit-Based)
  // Employee → Immediate Supervisor → Unit Head → HoD → HR Officer → Chief Director → Final
  // ============================================
  
  // Level 1: Immediate Supervisor
  const supervisorApprover = await resolveApprover('SUPERVISOR', staffInfo.staffId, staffInfo.unit || undefined)
  
  if (supervisorApprover) {
    levels.push({
      level: 1,
      approverRole: 'SUPERVISOR',
      approverStaffId: supervisorApprover.staffId,
      approverName: supervisorApprover.name,
      status: 'pending',
    })
  } else if (staffInfo.immediateSupervisorId) {
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

  // Level 2: Unit Head (if unit exists)
  if (staffInfo.unit) {
    levels.push({
      level: 2,
      approverRole: 'UNIT_HEAD',
      status: 'pending',
    })
  }

  // Level 3: Head of Department (HoD)
  // HoD = Director of Core Directorate OR Head of Independent Unit
  const reportsToChiefDir = reportsToChiefDirector(staffInfo.unit, staffInfo.directorate)
  
  if (isIndependentUnit(staffInfo.unit)) {
    // Independent Unit - Head of Independent Unit is the HoD
    levels.push({
      level: levels.length + 1,
      approverRole: 'HEAD_OF_INDEPENDENT_UNIT', // Head of Independent Unit acts as HoD
      status: 'pending',
    })
  } else if (reportsToChiefDir) {
    // Unit reports directly to Chief Director (edge case)
    levels.push({
      level: levels.length + 1,
      approverRole: 'CHIEF_DIRECTOR',
      status: 'pending',
    })
  } else {
    // Unit reports to a Directorate - Director is the HoD
    levels.push({
      level: levels.length + 1,
      approverRole: 'HEAD_OF_DEPARTMENT', // Director acts as HoD
      status: 'pending',
    })
  }

  // Level 4: HR Officer (MANDATORY VALIDATION)
  levels.push({
    level: levels.length + 1,
    approverRole: 'HR_OFFICER',
    status: 'pending',
  })

  // Level 5: Chief Director (Final Approval)
  levels.push({
    level: levels.length + 1,
    approverRole: 'CHIEF_DIRECTOR',
    status: 'pending',
  })

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
      subUnit: true,
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
    subUnit: staff.subUnit || null,
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
export function getNextCivilServiceApprovers(levels: CivilServiceApprovalLevel[]): CivilServiceApprovalLevel[] {
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
export function areAllCivilServiceLevelsApproved(levels: CivilServiceApprovalLevel[]): boolean {
  if (levels.length === 0) return false
  
  // Check for any rejection
  const anyRejected = levels.some(l => l.status === 'rejected')
  if (anyRejected) return false

  // All levels must be approved
  return levels.every(l => l.status === 'approved')
}

/**
 * Calculate overall status from approval levels
 * Returns 'recorded' for Chief Director leave after HR Director approval
 */
export function calculateCivilServiceApprovalStatus(
  levels: CivilServiceApprovalLevel[],
  isChiefDirectorLeave: boolean = false
): 'pending' | 'approved' | 'rejected' | 'recorded' {
  if (levels.length === 0) return 'pending'

  // Check for any rejection
  const anyRejected = levels.some(l => l.status === 'rejected')
  if (anyRejected) return 'rejected'

  // Special handling for Chief Director leave
  if (isChiefDirectorLeave) {
    // Chief Director leave: HR Director approval → Recorded/Notified
    const hrDirectorLevel = levels.find(l => l.approverRole === 'HR_DIRECTOR')
    if (hrDirectorLevel && hrDirectorLevel.status === 'approved') {
      return 'recorded' // Recorded and notified to OHCS, not self-approved
    }
    return 'pending'
  }

  // Check if all approved
  const allApproved = areAllCivilServiceLevelsApproved(levels)
  if (allApproved) return 'approved'

  return 'pending'
}

/**
 * Check if leave type requires PSC/OHCS external clearance
 */
export function requiresExternalClearance(leaveType: string): boolean {
  const pscGovernedTypes = [
    'Study',
    'StudyWithPay',
    'StudyWithoutPay',
    'LeaveOfAbsence',
    'Secondment'
  ]
  
  return pscGovernedTypes.includes(leaveType)
}

/**
 * Validate acting officer assignment (required for Unit Heads, Directors, critical staff)
 */
export async function validateActingOfficer(
  staffId: string,
  position: string | null,
  grade: string | null,
  unit: string | null
): Promise<{ valid: boolean; reason?: string }> {
  // Check if position requires acting officer
  const requiresActing = isUnitHeadPosition(position) || 
                        isDirectorPosition(position, grade) ||
                        (unit && ['Internal Audit Unit', 'Legal Unit'].includes(unit))

  if (!requiresActing) {
    return { valid: true }
  }

  // Check if acting officer is assigned
  const staff = await prisma.staffMember.findUnique({
    where: { staffId },
    select: { actingOfficerId: true },
  })

  if (!staff || !staff.actingOfficerId) {
    return {
      valid: false,
      reason: `Acting officer must be assigned for ${position || 'this position'} before leave can be approved.`
    }
  }

  return { valid: true }
}

/**
 * Validate HR validation requirement (mandatory before final approval)
 */
export function validateHRValidation(levels: CivilServiceApprovalLevel[]): { valid: boolean; reason?: string } {
  // Find HR Officer approval level
  const hrLevel = levels.find(l => l.approverRole === 'HR_OFFICER')
  
  if (!hrLevel) {
    return {
      valid: false,
      reason: 'HR Officer validation is mandatory but not found in approval workflow.'
    }
  }

  // HR validation must be approved before final approval
  if (hrLevel.status !== 'approved') {
    return {
      valid: false,
      reason: 'HR Officer validation is mandatory and must be approved before final approval.'
    }
  }

  return { valid: true }
}

