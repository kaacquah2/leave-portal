/**
 * MoFA Role Mapping Utility
 * Maps between exact MoFA role codes and legacy roles for backward compatibility
 */

import { UserRole } from './permissions'

/**
 * Map legacy role to MoFA exact role code
 */
export function mapToMoFARole(role: string): UserRole {
  const mapping: Record<string, UserRole> = {
    // Legacy to MoFA
    'employee': 'EMPLOYEE',
    'supervisor': 'SUPERVISOR',
    'unit_head': 'UNIT_HEAD',
    'division_head': 'DIVISION_HEAD',
    'directorate_head': 'DIRECTOR',
    'regional_manager': 'REGIONAL_MANAGER',
    'hr_officer': 'HR_OFFICER',
    'hr_director': 'HR_DIRECTOR',
    'chief_director': 'CHIEF_DIRECTOR',
    'internal_auditor': 'AUDITOR',
    'admin': 'SYS_ADMIN',
    'hr': 'HR_OFFICER',
    'hr_assistant': 'HR_OFFICER',
    'manager': 'SUPERVISOR',
    'deputy_director': 'DIRECTOR',
  }
  
  return (mapping[role] || role) as UserRole
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    'EMPLOYEE': 'Employee',
    'SUPERVISOR': 'Supervisor',
    'UNIT_HEAD': 'Unit Head',
    'DIVISION_HEAD': 'Division Head',
    'DIRECTOR': 'Director',
    'REGIONAL_MANAGER': 'Regional Manager',
    'HR_OFFICER': 'HR Officer',
    'HR_DIRECTOR': 'HR Director',
    'CHIEF_DIRECTOR': 'Chief Director',
    'AUDITOR': 'Internal Auditor',
    'SYS_ADMIN': 'System Administrator',
    'SYSTEM_ADMIN': 'System Administrator',
    'SECURITY_ADMIN': 'Security Administrator',
    // Legacy
    'employee': 'Employee',
    'supervisor': 'Supervisor',
    'unit_head': 'Unit Head',
    'division_head': 'Division Head',
    'directorate_head': 'Director',
    'regional_manager': 'Regional Manager',
    'hr_officer': 'HR Officer',
    'hr_director': 'HR Director',
    'chief_director': 'Chief Director',
    'internal_auditor': 'Internal Auditor',
    'admin': 'System Administrator',
    'hr': 'HR Officer',
    'hr_assistant': 'HR Assistant',
    'manager': 'Manager',
    'deputy_director': 'Deputy Director',
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
    'DIVISION_HEAD': '/division-head',
    'DIRECTOR': '/director',
    'REGIONAL_MANAGER': '/regional-manager',
    'HR_OFFICER': '/hr',
    'HR_DIRECTOR': '/hr-director',
    'CHIEF_DIRECTOR': '/chief-director',
    'AUDITOR': '/auditor',
    'SYS_ADMIN': '/admin',
    'SYSTEM_ADMIN': '/admin',
    'SECURITY_ADMIN': '/admin',
    // Legacy routes
    'employee': '/employee',
    'supervisor': '/supervisor',
    'unit_head': '/unit-head',
    'division_head': '/division-head',
    'directorate_head': '/director',
    'regional_manager': '/regional-manager',
    'hr_officer': '/hr',
    'hr_director': '/hr-director',
    'chief_director': '/chief-director',
    'internal_auditor': '/auditor',
    'admin': '/admin',
    'hr': '/hr',
    'hr_assistant': '/hr',
    'manager': '/supervisor',
    'deputy_director': '/director',
  }
  
  return routes[role] || '/employee'
}

/**
 * Check if role is an approver role
 */
export function isApproverRole(role: UserRole): boolean {
  const approverRoles: UserRole[] = [
    'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER',
    'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR',
    'supervisor', 'unit_head', 'division_head', 'directorate_head', 'regional_manager',
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

