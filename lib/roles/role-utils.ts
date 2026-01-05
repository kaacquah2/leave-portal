/**
 * Role Utilities - Standardized role normalization and checking
 * 
 * This module provides consistent role normalization and checking utilities
 * to replace hardcoded role string comparisons throughout the codebase.
 */

import { UserRole } from '../types/roles'
import { mapToMoFARole } from './role-mapping'
import { hasPermission } from './permissions'

/**
 * Normalize a role string to a UserRole type
 * Handles all legacy roles and case variations
 */
export function normalizeRole(role: string | undefined | null): UserRole | null {
  if (!role) return null
  return mapToMoFARole(role)
}

/**
 * Check if a role is an admin role (SYSTEM_ADMIN, SYS_ADMIN, or admin)
 */
export function isAdminRole(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  
  return normalized === 'SYSTEM_ADMIN' || 
         normalized === 'SYS_ADMIN' || 
         normalized === 'admin'
}

/**
 * Check if a role is an HR role
 */
export function isHRRole(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  
  return normalized === 'HR_OFFICER' || 
         normalized === 'HR_DIRECTOR' ||
         normalized === 'hr' ||
         normalized === 'hr_officer' ||
         normalized === 'hr_director' ||
         normalized === 'hr_assistant'
}

/**
 * Check if a role can view audit logs
 * Includes admin roles, HR Director, Chief Director, and Auditors
 */
export function canViewAuditLogs(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  
  return isAdminRole(role) ||
         normalized === 'HR_DIRECTOR' ||
         normalized === 'CHIEF_DIRECTOR' ||
         normalized === 'AUDITOR' ||
         normalized === 'internal_auditor'
}

/**
 * Check if a role can manage users
 * Includes admin roles and HR roles
 */
export function canManageUsers(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  
  return isAdminRole(role) || isHRRole(role)
}

/**
 * Check if a role can manage system settings
 * Only system admins
 */
export function canManageSystem(role: string | undefined | null): boolean {
  return isAdminRole(role)
}

/**
 * Check if a role is an employee role
 */
export function isEmployeeRole(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  return normalized === 'EMPLOYEE' || normalized === 'employee'
}

/**
 * Check if a role is an auditor role
 */
export function isAuditorRole(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  return normalized === 'AUDITOR' || normalized === 'internal_auditor'
}

/**
 * Check if a role is a supervisor/manager role
 */
export function isSupervisorRole(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  
  return normalized === 'SUPERVISOR' ||
         normalized === 'supervisor' ||
         normalized === 'manager'
}

/**
 * Check if a role is a unit head role
 */
export function isUnitHeadRole(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  
  return normalized === 'UNIT_HEAD' ||
         normalized === 'unit_head' ||
         normalized === 'HEAD_OF_INDEPENDENT_UNIT' ||
         normalized === 'head_of_independent_unit'
}

/**
 * Check if a role is a director role
 */
export function isDirectorRole(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  
  return normalized === 'DIRECTOR' ||
         normalized === 'directorate_head' ||
         normalized === 'deputy_director' ||
         normalized === 'HEAD_OF_DEPARTMENT' ||
         normalized === 'head_of_department' ||
         normalized === 'hod'
}

/**
 * Check if a role is a chief director role
 */
export function isChiefDirectorRole(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  return normalized === 'CHIEF_DIRECTOR' || normalized === 'chief_director'
}

/**
 * Check if a role can view all data (organization-wide access)
 * Includes HR roles, Chief Director, and System Admin
 */
export function canViewAllData(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  
  return isAdminRole(role) ||
         isHRRole(role) ||
         normalized === 'HR_DIRECTOR' ||
         normalized === 'CHIEF_DIRECTOR' ||
         normalized === 'AUDITOR' ||
         normalized === 'internal_auditor'
}

/**
 * Check if a role can approve leave requests
 * Uses permission system for accurate checking
 */
export function canApproveLeave(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  
  return hasPermission(normalized, 'leave:approve:team') ||
         hasPermission(normalized, 'leave:approve:all')
}

/**
 * Check if a role can view team data
 * Includes supervisors, unit heads, directors, and HR roles
 */
export function canViewTeamData(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  
  return isSupervisorRole(role) ||
         isUnitHeadRole(role) ||
         isDirectorRole(role) ||
         isHRRole(role) ||
         isAdminRole(role)
}

/**
 * Check if role matches any of the provided roles
 * Useful for checking against arrays of allowed roles
 */
export function hasAnyRole(
  role: string | undefined | null,
  allowedRoles: (string | UserRole)[]
): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  
  return allowedRoles.some(allowed => {
    const normalizedAllowed = normalizeRole(allowed)
    return normalizedAllowed === normalized
  })
}

/**
 * Array of all valid user roles
 */
export const VALID_USER_ROLES: UserRole[] = [
  'EMPLOYEE',
  'SUPERVISOR',
  'UNIT_HEAD',
  'HEAD_OF_DEPARTMENT',
  'HEAD_OF_INDEPENDENT_UNIT',
  'DIRECTOR',
  'HR_OFFICER',
  'HR_DIRECTOR',
  'CHIEF_DIRECTOR',
  'AUDITOR',
  'SYSTEM_ADMIN',
]

/**
 * HR roles array
 */
export const HR_ROLES: UserRole[] = [
  'HR_OFFICER',
  'HR_DIRECTOR',
  'hr',
  'hr_officer',
  'hr_director',
  'hr_assistant',
]

/**
 * Admin roles array
 */
export const ADMIN_ROLES: UserRole[] = [
  'SYSTEM_ADMIN',
  'SYS_ADMIN',
  'admin',
]

/**
 * Read-only roles array (auditors)
 */
export const READ_ONLY_ROLES: UserRole[] = [
  'AUDITOR',
  'internal_auditor',
]

/**
 * Audit roles array
 */
export const AUDIT_ROLES: UserRole[] = [
  'AUDITOR',
  'internal_auditor',
]

/**
 * HR Director role constant
 */
export const HR_DIRECTOR: UserRole = 'HR_DIRECTOR'

/**
 * System Admin role constant
 */
export const SYSTEM_ADMIN: UserRole = 'SYSTEM_ADMIN'

/**
 * Auditor role constant
 */
export const AUDITOR: UserRole = 'AUDITOR'