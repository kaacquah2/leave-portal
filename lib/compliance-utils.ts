/**
 * Government Compliance Utilities
 * 
 * Centralized compliance checks for state-owned institution requirements:
 * - Separation of duties enforcement
 * - Role-based restrictions
 * - Access control validation
 * 
 * Legal Framework: Internal Audit Agency (IAA) requirements, segregation of duties
 */

import { UserRole } from './permissions'
import { mapToMoFARole } from './role-mapping'
import type { AuthUser } from './auth-proxy'

/**
 * Check if a role is restricted from approving leave requests
 * Ghana Government Compliance: System admins cannot approve leave (segregation of duties)
 */
export function canApproveLeave(role: string | UserRole): boolean {
  const normalized = mapToMoFARole(role)
  
  // SYSTEM_ADMIN and SECURITY_ADMIN cannot approve leave
  if (
    normalized === 'SYSTEM_ADMIN' ||
    normalized === 'SYS_ADMIN' ||
    normalized === 'SECURITY_ADMIN' ||
    normalized === 'admin'
  ) {
    return false
  }
  
  // AUDITOR is read-only
  if (normalized === 'AUDITOR' || normalized === 'internal_auditor') {
    return false
  }
  
  // EMPLOYEE cannot approve
  if (normalized === 'EMPLOYEE' || normalized === 'employee') {
    return false
  }
  
  return true
}

/**
 * Check if a role can edit staff records
 * Ghana Government Compliance: Only HR roles can edit staff (segregation of duties)
 */
export function canEditStaffRecords(role: string | UserRole): boolean {
  const normalized = mapToMoFARole(role)
  
  // SYSTEM_ADMIN and SECURITY_ADMIN cannot edit staff records
  if (
    normalized === 'SYSTEM_ADMIN' ||
    normalized === 'SYS_ADMIN' ||
    normalized === 'SECURITY_ADMIN' ||
    normalized === 'admin'
  ) {
    return false
  }
  
  // Only HR roles can edit
  return (
    normalized === 'HR_OFFICER' ||
    normalized === 'HR_DIRECTOR' ||
    normalized === 'hr' ||
    normalized === 'hr_officer' ||
    normalized === 'hr_director' ||
    normalized === 'hr_assistant'
  )
}

/**
 * Check if a role can delete staff records
 * Ghana Government Compliance: Only HR Director can delete staff
 */
export function canDeleteStaffRecords(role: string | UserRole): boolean {
  const normalized = mapToMoFARole(role)
  
  // Only HR_DIRECTOR can delete staff records
  return (
    normalized === 'HR_DIRECTOR' ||
    normalized === 'hr_director'
  )
}

/**
 * Check if a role can create staff records
 * SYSTEM_ADMIN can create for system setup, but cannot edit/delete
 */
export function canCreateStaffRecords(role: string | UserRole): boolean {
  const normalized = mapToMoFARole(role)
  
  // HR roles can create
  if (
    normalized === 'HR_OFFICER' ||
    normalized === 'HR_DIRECTOR' ||
    normalized === 'hr' ||
    normalized === 'hr_officer' ||
    normalized === 'hr_director' ||
    normalized === 'hr_assistant'
  ) {
    return true
  }
  
  // SYSTEM_ADMIN can create for system setup only
  if (
    normalized === 'SYSTEM_ADMIN' ||
    normalized === 'SYS_ADMIN'
  ) {
    return true
  }
  
  return false
}

/**
 * Check if a role can manage leave policies
 * Ghana Government Compliance: Only HR roles can manage policies
 */
export function canManageLeavePolicies(role: string | UserRole): boolean {
  const normalized = mapToMoFARole(role)
  
  // Only HR roles can manage policies
  return (
    normalized === 'HR_OFFICER' ||
    normalized === 'HR_DIRECTOR' ||
    normalized === 'hr' ||
    normalized === 'hr_officer' ||
    normalized === 'hr_director'
  )
}

/**
 * Check if a role can process payroll
 * Ghana Government Compliance: Payroll requires approval workflow
 */
export function canProcessPayroll(role: string | UserRole): boolean {
  const normalized = mapToMoFARole(role)
  
  // Only HR roles can process payroll
  return (
    normalized === 'HR_OFFICER' ||
    normalized === 'HR_DIRECTOR' ||
    normalized === 'hr' ||
    normalized === 'hr_officer' ||
    normalized === 'hr_director'
  )
}

/**
 * Check if a role can approve payroll processing
 * Ghana Government Compliance: Payroll processing requires approval
 */
export function canApprovePayroll(role: string | UserRole): boolean {
  const normalized = mapToMoFARole(role)
  
  // HR_DIRECTOR and CHIEF_DIRECTOR can approve payroll
  return (
    normalized === 'HR_DIRECTOR' ||
    normalized === 'CHIEF_DIRECTOR' ||
    normalized === 'hr_director' ||
    normalized === 'chief_director'
  )
}

/**
 * Check if a role has read-only access
 */
export function isReadOnlyRole(role: string | UserRole): boolean {
  const normalized = mapToMoFARole(role)
  
  return (
    normalized === 'AUDITOR' ||
    normalized === 'internal_auditor' ||
    normalized === 'SECURITY_ADMIN'
  )
}

/**
 * Get compliance restrictions for a role
 */
export function getRoleComplianceRestrictions(role: string | UserRole): {
  canApproveLeave: boolean
  canEditStaff: boolean
  canDeleteStaff: boolean
  canCreateStaff: boolean
  canManagePolicies: boolean
  canProcessPayroll: boolean
  canApprovePayroll: boolean
  isReadOnly: boolean
} {
  const normalized = mapToMoFARole(role)
  
  return {
    canApproveLeave: canApproveLeave(normalized),
    canEditStaff: canEditStaffRecords(normalized),
    canDeleteStaff: canDeleteStaffRecords(normalized),
    canCreateStaff: canCreateStaffRecords(normalized),
    canManagePolicies: canManageLeavePolicies(normalized),
    canProcessPayroll: canProcessPayroll(normalized),
    canApprovePayroll: canApprovePayroll(normalized),
    isReadOnly: isReadOnlyRole(normalized),
  }
}

/**
 * Validate compliance for a user action
 */
export function validateCompliance(
  user: AuthUser,
  action: 'approve_leave' | 'edit_staff' | 'delete_staff' | 'create_staff' | 'manage_policies' | 'process_payroll' | 'approve_payroll'
): { allowed: boolean; reason?: string; errorCode?: string } {
  const normalized = mapToMoFARole(user.role)
  
  switch (action) {
    case 'approve_leave':
      if (!canApproveLeave(normalized)) {
        return {
          allowed: false,
          reason: 'System administrators cannot approve leave requests (segregation of duties)',
          errorCode: 'SEGREGATION_OF_DUTIES_VIOLATION',
        }
      }
      break
      
    case 'edit_staff':
      if (!canEditStaffRecords(normalized)) {
        return {
          allowed: false,
          reason: 'System administrators cannot edit staff records (segregation of duties)',
          errorCode: 'SEGREGATION_OF_DUTIES_VIOLATION',
        }
      }
      break
      
    case 'delete_staff':
      if (!canDeleteStaffRecords(normalized)) {
        return {
          allowed: false,
          reason: 'Only HR Director can delete staff records',
          errorCode: 'INSUFFICIENT_PERMISSIONS',
        }
      }
      break
      
    case 'create_staff':
      if (!canCreateStaffRecords(normalized)) {
        return {
          allowed: false,
          reason: 'Only HR roles and system administrators can create staff members',
          errorCode: 'INSUFFICIENT_PERMISSIONS',
        }
      }
      break
      
    case 'manage_policies':
      if (!canManageLeavePolicies(normalized)) {
        return {
          allowed: false,
          reason: 'Only HR roles can manage leave policies',
          errorCode: 'INSUFFICIENT_PERMISSIONS',
        }
      }
      break
      
    case 'process_payroll':
      if (!canProcessPayroll(normalized)) {
        return {
          allowed: false,
          reason: 'Only HR roles can process payroll',
          errorCode: 'INSUFFICIENT_PERMISSIONS',
        }
      }
      break
      
    case 'approve_payroll':
      if (!canApprovePayroll(normalized)) {
        return {
          allowed: false,
          reason: 'Only HR Director and Chief Director can approve payroll processing',
          errorCode: 'INSUFFICIENT_PERMISSIONS',
        }
      }
      break
  }
  
  return { allowed: true }
}

