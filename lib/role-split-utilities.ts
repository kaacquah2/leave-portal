/**
 * SYS_ADMIN Role Split Utilities
 * 
 * Ghana Government Compliance: Split SYS_ADMIN into SYSTEM_ADMIN and SECURITY_ADMIN
 * Per requirement: Reduce SYS_ADMIN risk by separating technical and security functions
 * 
 * Legal Reference: Internal Audit Agency requirements, segregation of duties
 * 
 * @module role-split-utilities
 */

/**
 * Role definitions for split SYS_ADMIN
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
  SECURITY_ADMIN: {
    code: 'SECURITY_ADMIN',
    name: 'Security Administrator',
    description: 'Audit logs, access review, and compliance monitoring',
    permissions: [
      'view_audit_logs',
      'view_data_access_logs',
      'access_review',
      'compliance_monitoring',
      'security_settings',
    ],
    restrictions: [
      'cannot_approve_leave',
      'cannot_edit_staff_records',
      'cannot_modify_system_configuration',
    ],
  },
} as const

/**
 * Check if a role is a system admin role (legacy or new)
 */
export function isSystemAdminRole(role: string): boolean {
  const normalizedRole = role?.toUpperCase()
  return (
    normalizedRole === 'SYS_ADMIN' ||
    normalizedRole === 'SYSTEM_ADMIN' ||
    normalizedRole === 'SECURITY_ADMIN' ||
    role === 'admin'
  )
}

/**
 * Check if user can approve leave (SYSTEM_ADMIN cannot)
 */
export function canSystemAdminApproveLeave(role: string): boolean {
  const normalizedRole = role?.toUpperCase()
  
  // SYSTEM_ADMIN and SECURITY_ADMIN cannot approve leave
  if (
    normalizedRole === 'SYSTEM_ADMIN' ||
    normalizedRole === 'SECURITY_ADMIN' ||
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
  
  // SECURITY_ADMIN can view but not edit
  if (normalizedRole === 'SECURITY_ADMIN') {
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
    normalizedRole === 'SECURITY_ADMIN' ||
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
 * Migration strategy for splitting SYS_ADMIN
 * 
 * This function provides guidance on how to migrate existing SYS_ADMIN users
 * to either SYSTEM_ADMIN or SECURITY_ADMIN roles.
 */
export function getRoleMigrationStrategy(): {
  recommendation: string
  steps: string[]
  risks: string[]
} {
  return {
    recommendation: 'Gradual migration with user consultation',
    steps: [
      '1. Identify all existing SYS_ADMIN users',
      '2. Consult with each user to determine their primary function',
      '3. Migrate technical users to SYSTEM_ADMIN',
      '4. Migrate compliance/audit users to SECURITY_ADMIN',
      '5. Update role checks in code to use new roles',
      '6. Monitor for any access issues',
      '7. Deprecate SYS_ADMIN role after migration complete',
    ],
    risks: [
      'Users may lose access to features they previously had',
      'Need to ensure all role checks are updated',
      'May require temporary dual-role assignment during transition',
    ],
  }
}

