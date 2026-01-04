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
 * Includes SYSTEM_ADMIN, SYS_ADMIN, and admin
 */
export const ADMIN_ROLES: string[] = ['SYSTEM_ADMIN', 'SYS_ADMIN', 'admin']

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
  'SYSTEM_ADMIN', 'SYS_ADMIN', 'admin',
  'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'AUDITOR',
  'hr_director', 'chief_director', 'internal_auditor'
]

/**
 * Standard read-only roles array for allowedRoles
 * Roles that can view data but not modify (for leaves, balances, etc.)
 */
export const READ_ONLY_ROLES: string[] = [
  'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'AUDITOR', 'SYSTEM_ADMIN', 'SYS_ADMIN',
  'SUPERVISOR', 'UNIT_HEAD', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_INDEPENDENT_UNIT', 'DIRECTOR', 'EMPLOYEE',
  'hr', 'hr_assistant', 'admin', 'employee', 'manager', 'deputy_director',
  'hr_officer', 'hr_director', 'chief_director', 'supervisor', 'unit_head', 'division_head',
  'directorate_head', 'regional_manager', 'auditor', 'internal_auditor',
  'head_of_department', 'hod' // Legacy HoD mappings
]

/**
 * Role constants for use in allowedRoles arrays
 */
export const AUDITOR = 'AUDITOR'
export const HR_DIRECTOR = 'HR_DIRECTOR'
export const SYSTEM_ADMIN = 'SYSTEM_ADMIN'

/**
 * All valid UserRole values (for validation)
 * Updated for Ghana Civil Service compliance - removed DIVISION_HEAD and REGIONAL_MANAGER
 * Added HEAD_OF_INDEPENDENT_UNIT for independent supporting units
 */
export const VALID_USER_ROLES: UserRole[] = [
  // Primary Ghana Civil Service roles
  'EMPLOYEE',               // Regular staff
  'SUPERVISOR',             // Immediate supervisor
  'UNIT_HEAD',              // Head of Unit / Sub-Unit
  'HEAD_OF_DEPARTMENT',     // Statutory HoD - Director of Core Directorate
  'HEAD_OF_INDEPENDENT_UNIT', // Head of Independent Unit (Legal, RTI, PR, Audit, Client Service)
  'DIRECTOR',               // Director of Core Directorate
  'HR_OFFICER',             // HRMD staff
  'HR_DIRECTOR',            // Director of HRMD
  'CHIEF_DIRECTOR',         // Top administrative authority
  'AUDITOR',                // Internal audit / read-only
  'SYSTEM_ADMIN',           // IT / portal admin
  // Legacy roles (for backward compatibility)
  'employee', 'supervisor', 'unit_head', 'directorate_head',
  'hr_officer', 'hr_director', 'chief_director',
  'internal_auditor', 'admin', 'SYS_ADMIN',
  'hr', 'hr_assistant', 'manager', 'deputy_director',
  'head_of_department', 'hod' // Legacy HoD mappings
]

/**
 * Validate if a role string is a valid UserRole
 */
export function isValidRole(role: string): role is UserRole {
  return VALID_USER_ROLES.includes(role as UserRole)
}

