/**
 * SYS_ADMIN Role Utilities
 * 
 * Ghana Government Compliance: SYSTEM_ADMIN role for technical configuration and system management
 * 
 * Legal Reference: Internal Audit Agency requirements, segregation of duties
 * 
 * @module role-split-utilities
 */

/**
 * Role definitions for SYSTEM_ADMIN
 */
export const ROLE_DEFINITIONS = {
  SYSTEM_ADMIN: {
    code: 'SYSTEM_ADMIN',
    name: 'System Administrator',
    description: 'Technical configuration and system management only',
    permissions: [
      'user_management',
      'role_assignment',
      'system_configuration',
      'technical_settings',
    ],
    restrictions: [
      'cannot_approve_leave',
      'cannot_edit_staff_records',
      'cannot_access_sensitive_hr_data',
      'cannot_approve_balance_overrides',
    ],
  },
} as const

/**
 * Check if a role is a system admin role (legacy or new)
 */
export function isSystemAdminRole(role: string): boolean {
  const normalizedRole = role?.toUpperCase()
  return (
    normalizedRole === 'SYSTEM_ADMIN' ||
    normalizedRole === 'SYS_ADMIN' ||
    role === 'admin'
  )
}

/**
 * Check if user can approve leave (SYSTEM_ADMIN cannot)
 */
export function canSystemAdminApproveLeave(role: string): boolean {
  const normalizedRole = role?.toUpperCase()
  
  // SYSTEM_ADMIN cannot approve leave
  if (
    normalizedRole === 'SYSTEM_ADMIN' ||
    normalizedRole === 'SYS_ADMIN' ||
    role === 'admin'
  ) {
    return false
  }
  
  return true
}

/**
 * Check if user can edit staff records (SYSTEM_ADMIN cannot)
 */
export function canSystemAdminEditStaff(role: string): boolean {
  const normalizedRole = role?.toUpperCase()
  
  // SYSTEM_ADMIN cannot edit staff records
  if (normalizedRole === 'SYSTEM_ADMIN' || normalizedRole === 'SYS_ADMIN' || role === 'admin') {
    return false
  }
  
  return true
}

/**
 * Check if user can view audit logs
 */
export function canViewAuditLogs(role: string): boolean {
  const normalizedRole = role?.toUpperCase()
  
  return (
    normalizedRole === 'HR_DIRECTOR' ||
    normalizedRole === 'CHIEF_DIRECTOR' ||
    normalizedRole === 'AUDITOR' ||
    normalizedRole === 'SYS_ADMIN' ||
    normalizedRole === 'SYSTEM_ADMIN' ||
    role === 'hr_director' ||
    role === 'chief_director' ||
    role === 'auditor' ||
    role === 'admin'
  )
}

/**
 * Migration strategy for SYS_ADMIN
 * 
 * This function provides guidance on how to migrate existing SYS_ADMIN users
 * to SYSTEM_ADMIN role.
 */
export function getRoleMigrationStrategy(): {
  recommendation: string
  steps: string[]
  risks: string[]
} {
  return {
    recommendation: 'Migrate all SYS_ADMIN users to SYSTEM_ADMIN',
    steps: [
      '1. Identify all existing SYS_ADMIN users',
      '2. Migrate all users to SYSTEM_ADMIN role',
      '3. Update role checks in code to use SYSTEM_ADMIN',
      '4. Monitor for any access issues',
      '5. Deprecate SYS_ADMIN role after migration complete',
    ],
    risks: [
      'Users may lose access to features they previously had',
      'Need to ensure all role checks are updated',
      'May require temporary dual-role assignment during transition',
    ],
  }
}

