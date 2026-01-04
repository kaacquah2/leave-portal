/**
 * Ghana Civil Service Compliance Rules
 * Implements mandatory compliance checks per:
 * - Civil Service Act, 1993 (PNDCL 327)
 * - Office of the Head of the Civil Service (OHCS) directives
 * - Public Services Commission (PSC) guidelines
 */

import { prisma } from '@/lib/prisma'
import { validateActingOfficer, validateHRValidation, requiresExternalClearance } from './ghana-civil-service-approval-workflow'
import { isUnitHeadPosition, isDirectorPosition } from './ghana-civil-service-unit-mapping'

export interface ComplianceCheckResult {
  compliant: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Comprehensive compliance check for leave request
 */
export async function checkLeaveRequestCompliance(
  leaveRequestId: string
): Promise<ComplianceCheckResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // Get leave request with staff info
  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    include: {
      staff: true,
      approvalSteps: {
        orderBy: { level: 'asc' },
      },
    },
  })

  if (!leaveRequest) {
    return {
      compliant: false,
      errors: ['Leave request not found'],
      warnings: [],
    }
  }

  const staff = leaveRequest.staff

  // ============================================
  // COMPLIANCE RULE 1: Leave Balance Validation
  // ============================================
  const balance = await prisma.leaveBalance.findUnique({
    where: { staffId: leaveRequest.staffId },
  })

  if (balance) {
    const leaveTypeMap: Record<string, keyof typeof balance> = {
      'Annual': 'annual',
      'Sick': 'sick',
      'Unpaid': 'unpaid',
      'SpecialService': 'specialService',
      'Training': 'training',
      'Study': 'study',
      'StudyWithPay': 'study',
      'StudyWithoutPay': 'study',
      'Maternity': 'maternity',
      'Paternity': 'paternity',
      'Compassionate': 'compassionate',
    }

    const balanceField = leaveTypeMap[leaveRequest.leaveType]
    if (balanceField && balanceField !== 'unpaid') {
      const availableBalance = balance[balanceField] as number
      if (availableBalance < leaveRequest.days) {
        errors.push(`Insufficient leave balance. Available: ${availableBalance} days, Required: ${leaveRequest.days} days`)
      }
    }
  }

  // ============================================
  // COMPLIANCE RULE 2: Acting Officer Assignment
  // ============================================
  const actingOfficerCheck = await validateActingOfficer(
    leaveRequest.staffId,
    staff.position,
    staff.grade,
    staff.unit
  )

  if (!actingOfficerCheck.valid) {
    errors.push(actingOfficerCheck.reason || 'Acting officer must be assigned')
  }

  // ============================================
  // COMPLIANCE RULE 3: Self-Approval Prevention
  // ============================================
  // This is checked at approval time, but we can validate the workflow structure
  const approvalSteps = leaveRequest.approvalSteps || []
  for (const step of approvalSteps) {
    if (step.approverStaffId === leaveRequest.staffId) {
      errors.push(`Approver cannot approve their own leave request (Level ${step.level})`)
    }
  }

  // ============================================
  // COMPLIANCE RULE 4: HR Validation Mandatory
  // ============================================
  if (leaveRequest.status === 'approved' || leaveRequest.status === 'pending') {
    if (!leaveRequest.hrValidated) {
      // Check if HR validation step exists and is approved
      const hrStep = approvalSteps.find(s => s.approverRole === 'HR_OFFICER')
      if (!hrStep || hrStep.status !== 'approved') {
        errors.push('HR Officer validation is mandatory before final approval')
      }
    }
  }

  // ============================================
  // COMPLIANCE RULE 5: PSC/OHCS External Clearance
  // ============================================
  if (requiresExternalClearance(leaveRequest.leaveType)) {
    if (!leaveRequest.requiresExternalClearance) {
      warnings.push('This leave type requires PSC/OHCS external clearance but flag is not set')
    }

    if (leaveRequest.requiresExternalClearance) {
      if (!leaveRequest.externalClearanceStatus || leaveRequest.externalClearanceStatus === 'pending') {
        errors.push('PSC/OHCS external clearance is required but not yet approved')
      }

      if (leaveRequest.externalClearanceStatus === 'approved' && !leaveRequest.pscReferenceNumber && !leaveRequest.ohcsReferenceNumber) {
        warnings.push('External clearance approved but reference number not recorded')
      }
    }
  }

  // ============================================
  // COMPLIANCE RULE 6: Declaration Acceptance
  // ============================================
  if (!leaveRequest.declarationAccepted) {
    errors.push('Declaration must be accepted before leave request can be submitted')
  }

  // ============================================
  // COMPLIANCE RULE 7: Sequential Approval Enforcement
  // ============================================
  let previousLevelCompleted = true
  for (const step of approvalSteps.sort((a, b) => a.level - b.level)) {
    if (!previousLevelCompleted && step.status === 'approved') {
      errors.push(`Approval level ${step.level} was approved before previous level was completed`)
    }
    if (step.status === 'approved') {
      previousLevelCompleted = true
    } else if (step.status === 'rejected') {
      previousLevelCompleted = false
    }
  }

  return {
    compliant: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate leave request before approval
 */
export async function validateBeforeApproval(
  leaveRequestId: string,
  approverStaffId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []

  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    include: { staff: true },
  })

  if (!leaveRequest) {
    return { valid: false, errors: ['Leave request not found'] }
  }

  // Self-approval prevention
  if (leaveRequest.staffId === approverStaffId) {
    errors.push('Approvers cannot approve their own leave requests per Civil Service policy')
  }

  // Balance check
  const balance = await prisma.leaveBalance.findUnique({
    where: { staffId: leaveRequest.staffId },
  })

  if (balance) {
    const leaveTypeMap: Record<string, keyof typeof balance> = {
      'Annual': 'annual',
      'Sick': 'sick',
      'Unpaid': 'unpaid',
      'SpecialService': 'specialService',
      'Training': 'training',
      'Study': 'study',
      'StudyWithPay': 'study',
      'StudyWithoutPay': 'study',
      'Maternity': 'maternity',
      'Paternity': 'paternity',
      'Compassionate': 'compassionate',
    }

    const balanceField = leaveTypeMap[leaveRequest.leaveType]
    if (balanceField && balanceField !== 'unpaid') {
      const availableBalance = balance[balanceField] as number
      if (availableBalance < leaveRequest.days) {
        errors.push(`Insufficient leave balance. Available: ${availableBalance} days, Required: ${leaveRequest.days} days`)
      }
    }
  }

  // Acting officer check for critical positions
  const actingOfficerCheck = await validateActingOfficer(
    leaveRequest.staffId,
    leaveRequest.staff.position,
    leaveRequest.staff.grade,
    leaveRequest.staff.unit
  )

  if (!actingOfficerCheck.valid) {
    errors.push(actingOfficerCheck.reason || 'Acting officer must be assigned')
  }

  // PSC/OHCS clearance check
  if (requiresExternalClearance(leaveRequest.leaveType)) {
    if (!leaveRequest.externalClearanceStatus || leaveRequest.externalClearanceStatus !== 'approved') {
      errors.push('PSC/OHCS external clearance is required and must be approved before final approval')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Check if acting officer is required for a position
 */
export function isActingOfficerRequired(
  position: string | null,
  grade: string | null,
  unit: string | null
): boolean {
  return isUnitHeadPosition(position) || 
         isDirectorPosition(position, grade) ||
         !!(unit && ['Internal Audit Unit', 'Legal Unit'].includes(unit))
}

/**
 * Log compliance violation for audit
 */
export async function logComplianceViolation(
  leaveRequestId: string,
  violationType: string,
  details: string,
  userId: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: 'COMPLIANCE_VIOLATION',
      user: userId,
      staffId: undefined,
      leaveRequestId,
      details: `Compliance violation: ${violationType} - ${details}`,
      metadata: {
        violationType,
        details,
        timestamp: new Date().toISOString(),
      },
    },
  })
}

