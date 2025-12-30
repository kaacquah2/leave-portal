/**
 * Ghana Government Statutory Constants
 * 
 * This file contains hard-coded statutory minimums based on:
 * - Labour Act, 2003 (Act 651)
 * - Public Services Commission (PSC) Conditions of Service
 * - Office of the Head of Civil Service (OHCS) HR guidelines
 * 
 * These values CANNOT be reduced below the statutory minimums.
 * Policies may EXCEED these minimums but never go below.
 * 
 * @module ghana-statutory-constants
 */

/**
 * Statutory minimum leave entitlements per Labour Act 651
 * 
 * Reference: Labour Act, 2003 (Act 651), Section 57-60
 */
export const STATUTORY_LEAVE_MINIMUMS = {
  /**
   * Annual Leave Minimum
   * Labour Act 651 Section 57: Every worker is entitled to annual leave
   * Public Service: Minimum 21 working days per year
   */
  ANNUAL_LEAVE_MIN_DAYS: 21,

  /**
   * Maternity Leave Minimum
   * Labour Act 651 Section 58: Minimum 12 weeks (84 days) maternity leave
   * Public Service: Typically 90 days (3 months)
   */
  MATERNITY_LEAVE_MIN_DAYS: 84, // 12 weeks as per Labour Act 651

  /**
   * Paternity Leave Minimum
   * Labour Act 651: Not explicitly mandated, but Public Service practice is 5 days
   * Some government institutions provide 7-10 days
   */
  PATERNITY_LEAVE_MIN_DAYS: 5, // Public Service standard practice

  /**
   * Sick Leave Minimum
   * Labour Act 651: Not explicitly mandated, but Public Service standard is 12 days per year
   */
  SICK_LEAVE_MIN_DAYS: 12, // Public Service standard

  /**
   * Compassionate Leave Minimum
   * Labour Act 651: Not explicitly mandated, but Public Service standard is 3-5 days
   */
  COMPASSIONATE_LEAVE_MIN_DAYS: 3, // Public Service standard
} as const

/**
 * Legal references for statutory requirements
 */
export const LEGAL_REFERENCES = {
  LABOUR_ACT_651: {
    name: 'Labour Act, 2003 (Act 651)',
    sections: {
      ANNUAL_LEAVE: 'Section 57',
      MATERNITY_LEAVE: 'Section 58',
      GENERAL_PROVISIONS: 'Section 1-3',
    },
    url: 'https://www.ilo.org/dyn/natlex/docs/ELECTRONIC/100001/115281/F-123456789/GHA100001.pdf', // Reference URL
  },
  DATA_PROTECTION_ACT_843: {
    name: 'Data Protection Act, 2012 (Act 843)',
    sections: {
      DATA_PROCESSING: 'Section 20',
      DATA_RETENTION: 'Section 25',
      DATA_ACCESS: 'Section 24',
    },
  },
  ELECTRONIC_TRANSACTIONS_ACT_772: {
    name: 'Electronic Transactions Act, 2008 (Act 772)',
    sections: {
      ELECTRONIC_RECORDS: 'Section 7',
      DIGITAL_SIGNATURES: 'Section 31',
    },
  },
  PSC_CONDITIONS: {
    name: 'Public Services Commission (PSC) Conditions of Service',
    reference: 'PSC Circular No. 1/2010',
  },
  OHCS_GUIDELINES: {
    name: 'Office of the Head of Civil Service (OHCS) HR Guidelines',
    reference: 'OHCS HR Manual 2020',
  },
} as const

/**
 * Data retention periods per Data Protection Act 843
 */
export const DATA_RETENTION_PERIODS = {
  /**
   * Active staff records: Retain indefinitely while staff is active
   */
  ACTIVE_STAFF: null, // Indefinite

  /**
   * Terminated staff records: Retain for 7 years after termination
   * Per Data Protection Act 843 and audit requirements
   */
  TERMINATED_STAFF_YEARS: 7,

  /**
   * Audit logs: Immutable, retain permanently
   * Per Internal Audit Agency requirements
   */
  AUDIT_LOGS: null, // Permanent/Indefinite

  /**
   * Leave approval history: Retain for 10 years
   * Per audit and legal requirements
   */
  LEAVE_APPROVAL_HISTORY_YEARS: 10,

  /**
   * Data access logs: Retain for 5 years
   * Per Data Protection Act 843
   */
  DATA_ACCESS_LOGS_YEARS: 5,
} as const

/**
 * Password policy requirements for government systems
 */
export const PASSWORD_POLICY = {
  /**
   * Minimum password length
   */
  MIN_LENGTH: 8,

  /**
   * Maximum password age (days)
   * Government standard: 90 days
   */
  MAX_AGE_DAYS: 90,

  /**
   * Password history: Prevent reuse of last N passwords
   */
  PASSWORD_HISTORY_COUNT: 5,

  /**
   * Account lockout after failed attempts
   */
  MAX_FAILED_ATTEMPTS: 5,

  /**
   * Account lockout duration (minutes)
   */
  LOCKOUT_DURATION_MINUTES: 30,
} as const

/**
 * System compliance status indicators
 */
export const COMPLIANCE_STATUS = {
  COMPLIANT: 'COMPLIANT',
  NON_COMPLIANT: 'NON_COMPLIANT',
  REQUIRES_REVIEW: 'REQUIRES_REVIEW',
} as const

export type ComplianceStatus = typeof COMPLIANCE_STATUS[keyof typeof COMPLIANCE_STATUS]

