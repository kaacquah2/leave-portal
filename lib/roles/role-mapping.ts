/**
 * MoFA Role Mapping Utility
 * Maps between exact MoFA role codes and legacy roles for backward compatibility
 */

import { UserRole } from './permissions'

/**
 * Map legacy role to Ghana Civil Service role code
 * Handles both uppercase and lowercase role formats
 */
export function mapToMoFARole(role: string): UserRole {
  // Normalize role to lowercase for mapping lookup
  const normalizedRole = role.toLowerCase()
  
  const mapping: Record<string, UserRole> = {
    // Legacy to Ghana Civil Service (all lowercase for case-insensitive matching)
    'employee': 'EMPLOYEE',
    'supervisor': 'SUPERVISOR',
    'unit_head': 'UNIT_HEAD',
    'directorate_head': 'DIRECTOR',
    'hr_officer': 'HR_OFFICER',
    'hr_director': 'HR_DIRECTOR',
    'chief_director': 'CHIEF_DIRECTOR',
    'internal_auditor': 'AUDITOR',
    'admin': 'SYSTEM_ADMIN',
    'sys_admin': 'SYSTEM_ADMIN',
    'hr': 'HR_OFFICER',
    'hr_assistant': 'HR_OFFICER',
    'manager': 'SUPERVISOR',
    'deputy_director': 'DIRECTOR',
    // Head of Department mappings
    'head_of_department': 'HEAD_OF_DEPARTMENT',
    'hod': 'HEAD_OF_DEPARTMENT',
    // Directors are also HoDs (for Core Directorates)
    'director': 'HEAD_OF_DEPARTMENT', // Director acts as HoD for their directorate
    // Head of Independent Unit mappings
    'head_of_independent_unit': 'HEAD_OF_INDEPENDENT_UNIT',
    // Legacy division and regional roles (deprecated, mapped to closest equivalent)
    'division_head': 'UNIT_HEAD',
    'regional_manager': 'DIRECTOR',
  }
  
  // Check if we have a mapping for the normalized role
  if (mapping[normalizedRole]) {
    return mapping[normalizedRole]
  }
  
  // If no mapping found, check if it's already a valid uppercase role format
  // Valid MoFA roles are uppercase with underscores
  const validRoles: UserRole[] = [
    'EMPLOYEE', 'SUPERVISOR', 'UNIT_HEAD', 'HEAD_OF_DEPARTMENT', 
    'HEAD_OF_INDEPENDENT_UNIT', 'DIRECTOR', 'HR_OFFICER', 'HR_DIRECTOR',
    'CHIEF_DIRECTOR', 'AUDITOR', 'SYSTEM_ADMIN'
  ]
  
  // If the role is already in valid format, return it as-is
  if (validRoles.includes(role as UserRole)) {
    return role as UserRole
  }
  
  // Fallback: return normalized uppercase version if it looks like a valid role
  const upperRole = role.toUpperCase().replace(/-/g, '_') as UserRole
  if (validRoles.includes(upperRole)) {
    return upperRole
  }
  
  // Last resort: return as-is (will default to employee route in getRoleRoute)
  return role as UserRole
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    'EMPLOYEE': 'Employee',
    'SUPERVISOR': 'Immediate Supervisor',
    'UNIT_HEAD': 'Unit Head',
    'HEAD_OF_DEPARTMENT': 'Head of Department (HoD)',
    'HEAD_OF_INDEPENDENT_UNIT': 'Head of Independent Unit',
    'DIRECTOR': 'Director',
    'HR_OFFICER': 'HR Officer',
    'HR_DIRECTOR': 'HR Director',
    'CHIEF_DIRECTOR': 'Chief Director',
    'AUDITOR': 'Internal Auditor',
    'SYSTEM_ADMIN': 'System Administrator',
    // Legacy
    'employee': 'Employee',
    'supervisor': 'Supervisor',
    'unit_head': 'Unit Head',
    'directorate_head': 'Director',
    'hr_officer': 'HR Officer',
    'hr_director': 'HR Director',
    'chief_director': 'Chief Director',
    'internal_auditor': 'Internal Auditor',
    'admin': 'System Administrator',
    'SYS_ADMIN': 'System Administrator',
    'hr': 'HR Officer',
    'hr_assistant': 'HR Assistant',
    'manager': 'Manager',
    'deputy_director': 'Deputy Director',
    'head_of_department': 'Head of Department (HoD)',
    'hod': 'Head of Department (HoD)',
    'head_of_independent_unit': 'Head of Independent Unit',
  }
  
  return names[role] || role
}

/**
 * Get role route path
 */
export function getRoleRoute(role: UserRole): string {
  const routes: Record<UserRole, string> = {
    'EMPLOYEE': '/employee',
    'SUPERVISOR': '/supervisor',
    'UNIT_HEAD': '/unit-head',
    'HEAD_OF_DEPARTMENT': '/hod',
    'HEAD_OF_INDEPENDENT_UNIT': '/head-independent-unit',
    'DIRECTOR': '/director',
    'HR_OFFICER': '/hr',
    'HR_DIRECTOR': '/hr-director',
    'CHIEF_DIRECTOR': '/chief-director',
    'AUDITOR': '/auditor',
    'SYSTEM_ADMIN': '/admin',
    // Legacy routes
    'employee': '/employee',
    'supervisor': '/supervisor',
    'unit_head': '/unit-head',
    'directorate_head': '/director',
    'hr_officer': '/hr',
    'hr_director': '/hr-director',
    'chief_director': '/chief-director',
    'internal_auditor': '/auditor',
    'admin': '/admin',
    'SYS_ADMIN': '/admin',
    'hr': '/hr',
    'hr_assistant': '/hr',
    'manager': '/supervisor',
    'deputy_director': '/director',
    'head_of_department': '/hod',
    'hod': '/hod',
    'head_of_independent_unit': '/head-independent-unit',
  }
  
  return routes[role] || '/employee'
}

/**
 * Check if role is an approver role
 */
export function isApproverRole(role: UserRole): boolean {
  const approverRoles: UserRole[] = [
    'SUPERVISOR', 'UNIT_HEAD', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_INDEPENDENT_UNIT', 'DIRECTOR',
    'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR',
    'supervisor', 'unit_head', 'head_of_department', 'hod', 'HEAD_OF_INDEPENDENT_UNIT', 'head_of_independent_unit',
    'directorate_head',
    'hr_officer', 'hr_director', 'chief_director', 'hr', 'manager', 'deputy_director',
  ]
  
  return approverRoles.includes(role)
}

/**
 * Check if role is read-only
 */
export function isReadOnlyRole(role: UserRole): boolean {
  return role === 'AUDITOR' || role === 'internal_auditor'
}

