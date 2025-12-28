/**
 * Leave Type Restrictions
 * Validates leave type eligibility and requirements
 */

import { prisma } from './prisma'

export interface LeaveTypeRestriction {
  leaveType: string
  requiresDocumentation?: boolean
  genderRestriction?: 'male' | 'female' | null
  minServiceMonths?: number
  maxConsecutiveDays?: number
  requiresMedicalCertificate?: boolean
  requiresManagerPreApproval?: boolean
}

/**
 * Check if staff member is eligible for a leave type
 */
export async function checkLeaveTypeEligibility(
  staffId: string,
  leaveType: string
): Promise<{ eligible: boolean; reason?: string }> {
  const staff = await prisma.staffMember.findUnique({
    where: { staffId },
    select: {
      joinDate: true,
      // Add gender field if available in schema
      // gender: true,
    },
  })

  if (!staff) {
    return { eligible: false, reason: 'Staff member not found' }
  }

  // Maternity leave - typically for females only
  if (leaveType === 'Maternity') {
    // Note: Gender field may need to be added to schema
    // For now, we'll allow it but recommend adding gender validation
    // if (staff.gender !== 'female') {
    //   return { eligible: false, reason: 'Maternity leave is only available for female staff' }
    // }
  }

  // Paternity leave - typically for males only
  if (leaveType === 'Paternity') {
    // Note: Gender field may need to be added to schema
    // if (staff.gender !== 'male') {
    //   return { eligible: false, reason: 'Paternity leave is only available for male staff' }
    // }
  }

  // Study leave - may require minimum service period
  if (leaveType === 'Study') {
    const serviceMonths = Math.floor(
      (Date.now() - staff.joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    )
    if (serviceMonths < 12) {
      return {
        eligible: false,
        reason: 'Study leave requires minimum 12 months of service',
      }
    }
  }

  return { eligible: true }
}

/**
 * Check if leave type requires documentation
 */
export function requiresDocumentation(leaveType: string): boolean {
  const typesRequiringDocs = [
    'Sick',
    'Maternity',
    'Paternity',
    'Study',
    'Training',
    'Special Service',
  ]
  return typesRequiringDocs.includes(leaveType)
}

/**
 * Validate leave type restrictions
 */
export async function validateLeaveTypeRestrictions(
  staffId: string,
  leaveType: string,
  days: number
): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = []
  const warnings: string[] = []

  // Check eligibility
  const eligibility = await checkLeaveTypeEligibility(staffId, leaveType)
  if (!eligibility.eligible) {
    errors.push(eligibility.reason || 'Not eligible for this leave type')
  }

  // Check documentation requirements
  if (requiresDocumentation(leaveType)) {
    warnings.push(`${leaveType} leave typically requires supporting documentation`)
  }

  // Check max consecutive days (if applicable)
  if (leaveType === 'Sick' && days > 30) {
    warnings.push('Sick leave exceeding 30 days may require medical certificate')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

