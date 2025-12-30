/**
 * Statutory Leave Validation
 * 
 * Enforces Ghana Labour Act 651 minimum leave entitlements.
 * Prevents HR users from configuring leave policies below statutory minimums.
 * 
 * Reference: Labour Act, 2003 (Act 651)
 * 
 * @module statutory-leave-validation
 */

import { STATUTORY_LEAVE_MINIMUMS, LEGAL_REFERENCES } from './ghana-statutory-constants'

export interface LeavePolicyValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
  statutoryMinimum?: number
  legalReference?: string
}

/**
 * Validate leave policy against statutory minimums
 * 
 * @param leaveType - Type of leave (Annual, Maternity, Paternity, etc.)
 * @param maxDays - Maximum days configured for this leave type
 * @returns Validation result with errors and legal references
 */
export function validateLeavePolicyAgainstStatutoryMinimums(
  leaveType: string,
  maxDays: number
): LeavePolicyValidation {
  const errors: string[] = []
  const warnings: string[] = []
  let statutoryMinimum: number | undefined
  let legalReference: string | undefined

  // Map leave types to statutory minimums
  switch (leaveType) {
    case 'Annual':
      statutoryMinimum = STATUTORY_LEAVE_MINIMUMS.ANNUAL_LEAVE_MIN_DAYS
      legalReference = `${LEGAL_REFERENCES.LABOUR_ACT_651.name}, ${LEGAL_REFERENCES.LABOUR_ACT_651.sections.ANNUAL_LEAVE}`
      
      if (maxDays < statutoryMinimum) {
        errors.push(
          `Annual leave cannot be less than ${statutoryMinimum} days. ` +
          `This violates ${LEGAL_REFERENCES.LABOUR_ACT_651.name}. ` +
          `Minimum required: ${statutoryMinimum} days.`
        )
      }
      break

    case 'Maternity':
      statutoryMinimum = STATUTORY_LEAVE_MINIMUMS.MATERNITY_LEAVE_MIN_DAYS
      legalReference = `${LEGAL_REFERENCES.LABOUR_ACT_651.name}, ${LEGAL_REFERENCES.LABOUR_ACT_651.sections.MATERNITY_LEAVE}`
      
      if (maxDays < statutoryMinimum) {
        errors.push(
          `Maternity leave cannot be less than ${statutoryMinimum} days (12 weeks). ` +
          `This violates ${LEGAL_REFERENCES.LABOUR_ACT_651.name}. ` +
          `Minimum required: ${statutoryMinimum} days.`
        )
      }
      break

    case 'Paternity':
      statutoryMinimum = STATUTORY_LEAVE_MINIMUMS.PATERNITY_LEAVE_MIN_DAYS
      legalReference = `${LEGAL_REFERENCES.PSC_CONDITIONS.name}`
      
      if (maxDays < statutoryMinimum) {
        errors.push(
          `Paternity leave cannot be less than ${statutoryMinimum} days. ` +
          `This violates Public Service standards. ` +
          `Minimum required: ${statutoryMinimum} days.`
        )
      }
      break

    case 'Sick':
      statutoryMinimum = STATUTORY_LEAVE_MINIMUMS.SICK_LEAVE_MIN_DAYS
      legalReference = `${LEGAL_REFERENCES.PSC_CONDITIONS.name}`
      
      if (maxDays < statutoryMinimum) {
        warnings.push(
          `Sick leave is recommended to be at least ${statutoryMinimum} days per year ` +
          `per Public Service standards. Current: ${maxDays} days.`
        )
        // Note: Sick leave is a warning, not a hard error, as Labour Act 651 doesn't mandate it
      }
      break

    case 'Compassionate':
      statutoryMinimum = STATUTORY_LEAVE_MINIMUMS.COMPASSIONATE_LEAVE_MIN_DAYS
      legalReference = `${LEGAL_REFERENCES.PSC_CONDITIONS.name}`
      
      if (maxDays < statutoryMinimum) {
        warnings.push(
          `Compassionate leave is recommended to be at least ${statutoryMinimum} days ` +
          `per Public Service standards. Current: ${maxDays} days.`
        )
      }
      break

    // Other leave types (Unpaid, Special Service, Training, Study) don't have statutory minimums
    default:
      // No statutory minimum for this leave type
      break
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    statutoryMinimum,
    legalReference,
  }
}

/**
 * Get statutory minimum for a leave type
 * 
 * @param leaveType - Type of leave
 * @returns Statutory minimum days, or undefined if no minimum exists
 */
export function getStatutoryMinimum(leaveType: string): number | undefined {
  switch (leaveType) {
    case 'Annual':
      return STATUTORY_LEAVE_MINIMUMS.ANNUAL_LEAVE_MIN_DAYS
    case 'Maternity':
      return STATUTORY_LEAVE_MINIMUMS.MATERNITY_LEAVE_MIN_DAYS
    case 'Paternity':
      return STATUTORY_LEAVE_MINIMUMS.PATERNITY_LEAVE_MIN_DAYS
    case 'Sick':
      return STATUTORY_LEAVE_MINIMUMS.SICK_LEAVE_MIN_DAYS
    case 'Compassionate':
      return STATUTORY_LEAVE_MINIMUMS.COMPASSIONATE_LEAVE_MIN_DAYS
    default:
      return undefined
  }
}

/**
 * Check if a leave type has a statutory minimum
 * 
 * @param leaveType - Type of leave
 * @returns True if statutory minimum exists
 */
export function hasStatutoryMinimum(leaveType: string): boolean {
  return getStatutoryMinimum(leaveType) !== undefined
}

