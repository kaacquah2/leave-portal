/**
 * Role Utilities - Standardized role normalization and checking
 * 
 * This module provides consistent role normalization and checking utilities
 * to replace hardcoded role string comparisons throughout the codebase.
 */

import { UserRole } from './permissions'
import { mapToMoFARole } from './role-mapping'

/**
 * Normalize a role string to a UserRole type
 * Handles all legacy roles and case variations
 */
export function normalizeRole(role: string | undefined | null): UserRole | null {
  if (!role) return null
  return mapToMoFARole(role)
}

/**
 * Check if a role is an admin role (SYSTEM_ADMIN, SYS_ADMIN, admin, or SECURITY_ADMIN)
 * SECURITY_ADMIN is included as it has admin-level access for audit/compliance
 */
export function isAdminRole(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  
  return normalized === 'SYSTEM_ADMIN' || 
         normalized === 'SYS_ADMIN' || 
         normalized === 'admin' ||
         normalized === 'SECURITY_ADMIN'
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
 * Includes admin roles and SECURITY_ADMIN
 */
export function canViewAuditLogs(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  
  return isAdminRole(role) ||
         normalized === 'HR_DIRECTOR' ||
         normalized === 'CHIEF_DIRECTOR' ||
         normalized === 'AUDITOR' ||
         normalized === 'hr_director' ||
         normalized === 'chief_director' ||
         normalized === 'internal_auditor' ||
         normalized === 'hr_assistant'
}

/**
 * Check if a role is read-only (AUDITOR)
 */
export function isReadOnlyRole(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  
  return normalized === 'AUDITOR' || normalized === 'internal_auditor'
}

/**
 * Standard admin roles array for allowedRoles
 * Includes SYSTEM_ADMIN, SYS_ADMIN, admin, and SECURITY_ADMIN
 */
export const ADMIN_ROLES: string[] = ['SYSTEM_ADMIN', 'SYS_ADMIN', 'admin', 'SECURITY_ADMIN']

/**
 * Standard HR roles array for allowedRoles
 */
export const HR_ROLES: string[] = [
  'HR_OFFICER', 'HR_DIRECTOR', 'hr', 'hr_officer', 'hr_director', 'hr_assistant'
]

/**
 * Standard audit roles array for allowedRoles
 * Roles that can view audit logs and compliance reports
 */
export const AUDIT_ROLES: string[] = [
  'SYSTEM_ADMIN', 'SYS_ADMIN', 'admin', 'SECURITY_ADMIN',
  'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'AUDITOR',
  'hr_director', 'chief_director', 'internal_auditor'
]

/**
 * Standard read-only roles array for allowedRoles
 * Roles that can view data but not modify (for leaves, balances, etc.)
 */
export const READ_ONLY_ROLES: string[] = [
  'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'AUDITOR', 'SYSTEM_ADMIN', 'SYS_ADMIN', 'SECURITY_ADMIN',
  'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER', 'EMPLOYEE',
  'hr', 'hr_assistant', 'admin', 'employee', 'manager', 'deputy_director',
  'hr_officer', 'hr_director', 'chief_director', 'supervisor', 'unit_head', 'division_head',
  'directorate_head', 'regional_manager', 'auditor', 'internal_auditor'
]

/**
 * All valid UserRole values (for validation)
 */
export const VALID_USER_ROLES: UserRole[] = [
  'EMPLOYEE', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR',
  'REGIONAL_MANAGER', 'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR',
  'AUDITOR', 'SYSTEM_ADMIN', 'SECURITY_ADMIN',
  // Legacy roles
  'employee', 'supervisor', 'unit_head', 'division_head', 'directorate_head',
  'regional_manager', 'hr_officer', 'hr_director', 'chief_director',
  'internal_auditor', 'admin', 'SYS_ADMIN',
  'hr', 'hr_assistant', 'manager', 'deputy_director'
]

/**
 * Validate if a role string is a valid UserRole
 */
export function isValidRole(role: string): role is UserRole {
  return VALID_USER_ROLES.includes(role as UserRole)
}

