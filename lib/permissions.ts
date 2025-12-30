/**
 * Role-Based Access Control (RBAC) Permissions System
 * 
 * This file defines the access boundaries for HR and Manager roles
 * based on the Staff & HR Management Portal requirements.
 */

// MoFA Government HR Leave Workflow Roles (Exact Role Codes)
export type UserRole = 
  | 'EMPLOYEE'              // All confirmed MoFA staff
  | 'SUPERVISOR'            // Immediate Supervisor / Line Manager
  | 'UNIT_HEAD'             // Head of functional unit
  | 'DIVISION_HEAD'         // Head of division under directorate
  | 'DIRECTOR'              // Director of MoFA Directorate
  | 'REGIONAL_MANAGER'      // Head of MoFA Regional Office
  | 'HR_OFFICER'            // HR Officer (HRM) - Final approval authority
  | 'HR_DIRECTOR'           // Head of Human Resource Directorate
  | 'CHIEF_DIRECTOR'        // Chief Director / Ministerial Authority
  | 'AUDITOR'               // Internal Auditor (IAA) - Read-only
  | 'SYS_ADMIN'             // System Administrator (Legacy - use SYSTEM_ADMIN or SECURITY_ADMIN)
  | 'SYSTEM_ADMIN'           // System Administrator (Technical config only)
  | 'SECURITY_ADMIN'         // Security Administrator (Audit logs, access review, compliance)
  // Legacy roles (for backward compatibility during migration)
  | 'employee' | 'supervisor' | 'unit_head' | 'division_head' | 'directorate_head' 
  | 'regional_manager' | 'hr_officer' | 'hr_director' | 'chief_director' | 'internal_auditor' | 'admin'
  | 'hr' | 'hr_assistant' | 'manager' | 'deputy_director'

/**
 * Permission types for different actions
 */
export type Permission =
  // System Administration
  | 'system:config:manage'
  | 'system:users:manage'
  | 'system:roles:assign'
  | 'system:reports:view'
  | 'system:audit:view'
  | 'system:backup:manage'
  | 'system:org:manage'
  
  // Employee Management
  | 'employee:create'
  | 'employee:update'
  | 'employee:view:all'
  | 'employee:view:team'
  | 'employee:delete'
  | 'employee:salary:edit'
  | 'employee:contracts:edit'
  | 'employee:documents:upload'
  | 'employee:terminate'
  | 'employee:onboard'
  
  // Leave Management
  | 'leave:create'
  | 'leave:approve:all'
  | 'leave:approve:team'
  | 'leave:view:all'
  | 'leave:view:team'
  | 'leave:policy:manage'
  
  // Performance Management
  | 'performance:review:all'
  | 'performance:review:team'
  | 'performance:view:all'
  | 'performance:view:team'
  | 'performance:promotion:request'
  
  // Attendance & Timesheets
  | 'attendance:view:all'
  | 'attendance:view:team'
  | 'attendance:correct:all'
  | 'attendance:correct:team'
  | 'timesheet:approve:all'
  | 'timesheet:approve:team'
  
  // Reports
  | 'reports:hr:view'
  | 'reports:system:view'
  | 'reports:team:view'
  
  // Disciplinary Actions
  | 'disciplinary:manage:all'
  | 'disciplinary:manage:team'
  
  // Recruitment (Optional)
  | 'recruitment:create'
  | 'recruitment:review'
  
  // Employee Self-Service
  | 'employee:self:view'
  | 'employee:self:update'
  | 'employee:leave:view:own'
  | 'employee:leave:create:own'
  | 'employee:payslip:view:own'
  | 'employee:performance:view:own'
  
  // Unit-Based Permissions (MoFA Organizational Structure)
  | 'unit:view:own'           // View own unit information
  | 'unit:manage:own'         // Manage own unit (UNIT_HEAD)
  | 'directorate:view:own'     // View own directorate
  | 'directorate:manage:own'  // Manage own directorate (DIRECTOR)
  | 'region:view:own'          // View own region
  | 'region:manage:own'        // Manage own region (REGIONAL_MANAGER)
  | 'org:view:all'             // View all organizational structure (HR, SYS_ADMIN)
  | 'org:manage:all'           // Manage organizational structure (HR_DIRECTOR, SYS_ADMIN)

/**
 * MoFA Government HR Leave Workflow - Permission Matrix
 * Exact role codes matching MoFA hierarchy
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // ========== MoFA EXACT ROLE CODES ==========
  
  // 1. EMPLOYEE - All confirmed MoFA staff
  EMPLOYEE: [
    'employee:self:view',
    'employee:self:update',
    'employee:leave:view:own',
    'employee:leave:create:own',
    'employee:payslip:view:own',
    'employee:performance:view:own',
  ],

  // 2. SUPERVISOR - Immediate Supervisor / Line Manager (Level 1 Approval)
  SUPERVISOR: [
    'employee:view:team', // Direct reports only
    'leave:view:team', // Direct reports only
    'leave:approve:team', // Level 1 approval
    'performance:view:team',
    'attendance:view:team',
    'reports:team:view',
    'unit:view:own', // Can view own unit information
  ],

  // 3. UNIT_HEAD - Head of functional unit (Level 2 Approval)
  UNIT_HEAD: [
    'employee:view:team', // Unit level
    'leave:view:team', // Unit level
    'leave:approve:team', // Level 2 approval
    'performance:view:team',
    'attendance:view:team',
    'reports:team:view',
    'unit:view:own', // View own unit
    'unit:manage:own', // Manage own unit
    'directorate:view:own', // View parent directorate
  ],

  // 4. DIVISION_HEAD - Head of division under directorate (Level 3 Approval)
  DIVISION_HEAD: [
    'employee:view:team', // Division level
    'leave:view:team', // Division level
    'leave:approve:team', // Level 3 approval
    'performance:view:team',
    'attendance:view:team',
    'reports:team:view',
    'unit:view:own', // View units in division
    'directorate:view:own', // View parent directorate
  ],

  // 5. DIRECTOR - Director of MoFA Directorate (Level 4 Approval)
  DIRECTOR: [
    'employee:view:team', // Directorate level
    'leave:view:team', // Directorate level
    'leave:approve:team', // Level 4 approval
    'performance:view:team',
    'attendance:view:team',
    'reports:team:view',
    'unit:view:own', // View all units in directorate
    'directorate:view:own', // View own directorate
    'directorate:manage:own', // Manage own directorate
  ],

  // 6. REGIONAL_MANAGER - Head of MoFA Regional Office
  REGIONAL_MANAGER: [
    'employee:view:team', // Regional/district staff
    'leave:view:team', // Regional/district staff
    'leave:approve:team', // Regional approval
    'performance:view:team',
    'attendance:view:team',
    'reports:team:view',
    'region:view:own', // View own region
    'region:manage:own', // Manage own region
  ],

  // 7. HR_OFFICER - HR Officer (HRM) - Final approval authority
  HR_OFFICER: [
    'employee:view:all',
    'employee:update',
    'employee:documents:upload',
    'leave:view:all',
    'leave:approve:all', // Final approval authority
    'leave:policy:manage',
    'leave:create',
    'performance:view:all',
    'attendance:view:all',
    'attendance:correct:all',
    'timesheet:approve:all',
    'reports:hr:view',
    'org:view:all', // View all organizational structure
  ],

  // 8. HR_DIRECTOR - Head of Human Resource Directorate
  HR_DIRECTOR: [
    'employee:view:all',
    'employee:create',
    'employee:update',
    'employee:documents:upload',
    'leave:view:all',
    'leave:approve:all', // Can approve senior staff/director leave
    'leave:policy:manage',
    'leave:create',
    'performance:view:all',
    'performance:review:all',
    'attendance:view:all',
    'attendance:correct:all',
    'timesheet:approve:all',
    'reports:hr:view',
    'reports:system:view',
    'system:audit:view',
    'org:view:all', // View all organizational structure
    'org:manage:all', // Manage organizational structure
  ],

  // 9. CHIEF_DIRECTOR - Chief Director / Ministerial Authority
  CHIEF_DIRECTOR: [
    'employee:view:all',
    'leave:view:all',
    'leave:approve:all', // Final authority for Directors & HR Director
    'performance:view:all',
    'performance:review:all',
    'attendance:view:all',
    'reports:hr:view',
    'reports:system:view',
    'system:audit:view',
    'org:view:all', // View all organizational structure
  ],

  // 10. AUDITOR - Internal Auditor (IAA) - Read-only access
  AUDITOR: [
    'employee:view:all',
    'leave:view:all',
    'performance:view:all',
    'attendance:view:all',
    'reports:hr:view',
    'reports:system:view',
    'system:audit:view', // Full audit log access
    'org:view:all', // View all organizational structure (read-only)
  ],

  // 11. SYS_ADMIN - System Administrator (Legacy - use SYSTEM_ADMIN or SECURITY_ADMIN)
  SYS_ADMIN: [
    'system:config:manage',
    'system:users:manage',
    'system:roles:assign',
    'system:reports:view',
    'system:audit:view',
    'system:backup:manage',
    'system:org:manage',
    'employee:view:all',
    'employee:create',
    'employee:update',
    'employee:delete',
    'leave:view:all',
    'leave:policy:manage',
    'reports:system:view',
    'org:view:all', // View all organizational structure
    'org:manage:all', // Manage organizational structure
  ],

  // 12. SYSTEM_ADMIN - System Administrator (Technical config only)
  // Ghana Government Compliance: Cannot approve leave or edit staff records (segregation of duties)
  SYSTEM_ADMIN: [
    'system:config:manage',
    'system:users:manage',
    'system:roles:assign',
    'system:reports:view',
    'system:backup:manage',
    'system:org:manage',
    'employee:view:all', // View only, cannot edit
    'leave:view:all', // View only, cannot approve
    'reports:system:view',
    'org:view:all', // View all organizational structure
    'org:manage:all', // Manage organizational structure
    // Note: Cannot approve leave or edit staff records per compliance requirements
  ],

  // 13. SECURITY_ADMIN - Security Administrator (Audit logs, access review, compliance)
  // Ghana Government Compliance: Cannot approve leave or edit staff records (segregation of duties)
  SECURITY_ADMIN: [
    'system:audit:view', // Full audit log access
    'system:reports:view',
    'reports:system:view',
    'employee:view:all', // View only, cannot edit
    'leave:view:all', // View only, cannot approve
    'org:view:all', // View all organizational structure (read-only)
    // Note: Cannot approve leave or edit staff records per compliance requirements
  ],

  // ========== LEGACY ROLES (Backward Compatibility) ==========
  
  hr: [
    // Employee Management - HR's primary domain
    'employee:create',
    'employee:update',
    'employee:view:all',
    'employee:delete',
    'employee:salary:edit',
    'employee:contracts:edit',
    'employee:documents:upload',
    'employee:terminate',
    'employee:onboard',
    
    // Leave Management
    'leave:create',
    'leave:approve:all',
    'leave:view:all',
    'leave:policy:manage',
    
    // Performance Management (view all, can update)
    'performance:view:all',
    'performance:review:all',
    
    // Attendance & Timesheets
    'attendance:view:all',
    'attendance:correct:all',
    'timesheet:approve:all',
    
    // HR Reports
    'reports:hr:view',
    
    // Disciplinary Actions
    'disciplinary:manage:all',
    
    // Recruitment
    'recruitment:create',
    'recruitment:review',
  ],
  
  manager: [
    // Team-level Employee View
    'employee:view:team',
    
    // Team Leave Management
    'leave:view:team',
    'leave:approve:team',
    
    // Team Performance Management
    'performance:view:team',
    'performance:review:team',
    'performance:promotion:request',
    
    // Team Attendance & Timesheets
    'attendance:view:team',
    'attendance:correct:team',
    'timesheet:approve:team',
    
    // Team Reports
    'reports:team:view',
    
    // Team Disciplinary Actions
    'disciplinary:manage:team',
    
    // Optional: Recruitment for their department
    'recruitment:create',
    'recruitment:review',
  ],
  
  employee: [
    // Self-service permissions
    'employee:self:view',
    'employee:self:update',
    'employee:leave:view:own',
    'employee:leave:create:own',
    'employee:payslip:view:own',
    'employee:performance:view:own',
  ],
  
  // Deputy Director: Between Manager and HR, can approve across directorates
  deputy_director: [
    // Can view all employees in their directorate
    'employee:view:team', // Extended to directorate level
    
    // Directorate-level Leave Management
    'leave:view:team', // Extended to directorate level
    'leave:approve:team', // Can approve for entire directorate
    
    // Directorate Performance Management
    'performance:view:team', // Extended to directorate level
    'performance:review:team', // Can review directorate staff
    
    // Directorate Attendance & Timesheets
    'attendance:view:team', // Extended to directorate level
    'attendance:correct:team', // Can correct directorate attendance
    'timesheet:approve:team', // Can approve directorate timesheets
    
    // Directorate Reports
    'reports:team:view', // Extended to directorate level
    
    // Directorate Disciplinary Actions
    'disciplinary:manage:team', // Extended to directorate level
    
    // Can delegate approvals
    'leave:create', // Can create leave on behalf of staff if needed
  ],
  
  // HR Assistant: Restricted HR access for data entry and document management
  hr_assistant: [
    // Limited Employee Management (view and basic updates only)
    'employee:view:all',
    'employee:update', // Can update basic info, but not salary/contracts
    'employee:documents:upload', // Can upload documents
    
    // Leave Management (view and basic operations)
    'leave:view:all',
    'leave:create', // Can create leave requests on behalf of staff
    
    // Limited Performance Management (view only)
    'performance:view:all',
    
    // Limited Attendance & Timesheets (view only)
    'attendance:view:all',
    
    // Limited Reports (view HR reports)
    'reports:hr:view',
    
    // Cannot:
    // - Delete employees
    // - Terminate employees
    // - Edit salaries/contracts
    // - Approve leaves (unless delegated)
    // - Manage leave policies
    // - Manage disciplinary actions
  ],
  
  // Admin role (already exists in schema, adding permissions)
  admin: [
    // System Administration
    'system:config:manage',
    'system:users:manage',
    'system:roles:assign',
    'system:reports:view',
    'system:audit:view',
    'system:backup:manage',
    'system:org:manage',
    
    // Full Employee Management (for system admin purposes)
    'employee:view:all',
    'employee:create',
    'employee:update',
    'employee:delete',
    
    // Full Leave Management
    'leave:view:all',
    'leave:approve:all',
    'leave:policy:manage',
    
    // Full Performance Management
    'performance:view:all',
    'performance:review:all',
    
    // Full Attendance & Timesheets
    'attendance:view:all',
    'attendance:correct:all',
    'timesheet:approve:all',
    
    // All Reports
    'reports:hr:view',
    'reports:system:view',
    'reports:team:view',
    
    // Full Disciplinary Actions
    'disciplinary:manage:all',
  ],

  // ========== GHANA GOVERNMENT PUBLIC SERVICE ROLES (MoFA) ==========
  
  // Supervisor / Line Manager: First level approval
  supervisor: [
    'employee:view:team',
    'leave:view:team',
    'leave:approve:team', // Can approve direct reports
    'performance:view:team',
    'performance:review:team',
    'attendance:view:team',
    'attendance:correct:team',
    'timesheet:approve:team',
    'reports:team:view',
  ],

  // Unit Head: Second level approval (after supervisor)
  unit_head: [
    'employee:view:team', // Extended to unit level
    'leave:view:team',
    'leave:approve:team', // Can approve unit staff
    'performance:view:team',
    'performance:review:team',
    'attendance:view:team',
    'attendance:correct:team',
    'timesheet:approve:team',
    'reports:team:view',
  ],

  // Division Head: Third level approval
  division_head: [
    'employee:view:team', // Extended to division level
    'leave:view:team',
    'leave:approve:team', // Can approve division staff
    'performance:view:team',
    'performance:review:team',
    'attendance:view:team',
    'attendance:correct:team',
    'timesheet:approve:team',
    'reports:team:view',
  ],

  // Directorate Head: Fourth level approval
  directorate_head: [
    'employee:view:team', // Extended to directorate level
    'leave:view:team',
    'leave:approve:team', // Can approve directorate staff
    'performance:view:team',
    'performance:review:team',
    'attendance:view:team',
    'attendance:correct:team',
    'timesheet:approve:team',
    'reports:team:view',
  ],

  // Regional Manager: For regional/district staff
  regional_manager: [
    'employee:view:team', // Regional/district staff
    'leave:view:team',
    'leave:approve:team', // Can approve regional staff
    'performance:view:team',
    'performance:review:team',
    'attendance:view:team',
    'attendance:correct:team',
    'timesheet:approve:team',
    'reports:team:view',
  ],

  // HR Officer: Final approval level, manages leave policies
  hr_officer: [
    'employee:view:all',
    'employee:update',
    'employee:documents:upload',
    'leave:view:all',
    'leave:approve:all', // Final approval authority
    'leave:policy:manage',
    'leave:create',
    'performance:view:all',
    'attendance:view:all',
    'attendance:correct:all',
    'timesheet:approve:all',
    'reports:hr:view',
  ],

  // HR Director: Senior HR authority, can override
  hr_director: [
    'employee:view:all',
    'employee:create',
    'employee:update',
    'employee:documents:upload',
    'leave:view:all',
    'leave:approve:all',
    'leave:policy:manage',
    'leave:create',
    'performance:view:all',
    'performance:review:all',
    'attendance:view:all',
    'attendance:correct:all',
    'timesheet:approve:all',
    'reports:hr:view',
    'reports:system:view',
    'system:audit:view',
  ],

  // Chief Director / Ministerial Authority: Highest approval authority
  chief_director: [
    'employee:view:all',
    'leave:view:all',
    'leave:approve:all', // Highest approval authority
    'performance:view:all',
    'performance:review:all',
    'attendance:view:all',
    'reports:hr:view',
    'reports:system:view',
    'system:audit:view',
  ],

  // Internal Auditor: Read-only access for compliance
  internal_auditor: [
    'employee:view:all',
    'leave:view:all',
    'performance:view:all',
    'attendance:view:all',
    'reports:hr:view',
    'reports:system:view',
    'system:audit:view', // Full audit log access
  ],
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

/**
 * Permission check helpers for common operations
 */
export const PermissionChecks = {
  /**
   * Can manage system configuration
   */
  canManageSystemConfig: (role: UserRole) => hasPermission(role, 'system:config:manage'),
  
  /**
   * Can manage user accounts and roles
   */
  canManageUsers: (role: UserRole) => hasPermission(role, 'system:users:manage'),
  
  /**
   * Can create employee profiles
   */
  canCreateEmployee: (role: UserRole) => hasPermission(role, 'employee:create'),
  
  /**
   * Can edit employee salary and contracts
   */
  canEditEmployeeSalary: (role: UserRole) => hasPermission(role, 'employee:salary:edit'),
  
  /**
   * Can view all employees
   */
  canViewAllEmployees: (role: UserRole) => hasPermission(role, 'employee:view:all'),
  
  /**
   * Can view team employees only
   */
  canViewTeamEmployees: (role: UserRole) => hasPermission(role, 'employee:view:team'),
  
  /**
   * Can approve leave requests (all organization)
   */
  canApproveLeaveAll: (role: UserRole) => hasPermission(role, 'leave:approve:all'),
  
  /**
   * Can approve leave requests (team only)
   */
  canApproveLeaveTeam: (role: UserRole) => hasPermission(role, 'leave:approve:team'),
  
  /**
   * Can view all leave requests
   */
  canViewAllLeaves: (role: UserRole) => hasPermission(role, 'leave:view:all'),
  
  /**
   * Can view team leave requests only
   */
  canViewTeamLeaves: (role: UserRole) => hasPermission(role, 'leave:view:team'),
  
  /**
   * Can manage leave policies
   */
  canManageLeavePolicy: (role: UserRole) => hasPermission(role, 'leave:policy:manage'),
  
  /**
   * Can conduct performance reviews (all)
   */
  canReviewPerformanceAll: (role: UserRole) => hasPermission(role, 'performance:review:all'),
  
  /**
   * Can conduct performance reviews (team only)
   */
  canReviewPerformanceTeam: (role: UserRole) => hasPermission(role, 'performance:review:team'),
  
  /**
   * Can view system-wide reports
   */
  canViewSystemReports: (role: UserRole) => hasPermission(role, 'reports:system:view'),
  
  /**
   * Can view HR reports
   */
  canViewHRReports: (role: UserRole) => hasPermission(role, 'reports:hr:view'),
  
  /**
   * Can view team reports
   */
  canViewTeamReports: (role: UserRole) => hasPermission(role, 'reports:team:view'),
  
  /**
   * Can view audit logs
   */
  canViewAuditLogs: (role: UserRole) => hasPermission(role, 'system:audit:view'),
  
  /**
   * Can view own unit information
   */
  canViewOwnUnit: (role: UserRole) => hasPermission(role, 'unit:view:own'),
  
  /**
   * Can manage own unit
   */
  canManageOwnUnit: (role: UserRole) => hasPermission(role, 'unit:manage:own'),
  
  /**
   * Can view own directorate
   */
  canViewOwnDirectorate: (role: UserRole) => hasPermission(role, 'directorate:view:own'),
  
  /**
   * Can manage own directorate
   */
  canManageOwnDirectorate: (role: UserRole) => hasPermission(role, 'directorate:manage:own'),
  
  /**
   * Can view own region
   */
  canViewOwnRegion: (role: UserRole) => hasPermission(role, 'region:view:own'),
  
  /**
   * Can manage own region
   */
  canManageOwnRegion: (role: UserRole) => hasPermission(role, 'region:manage:own'),
  
  /**
   * Can view all organizational structure
   */
  canViewAllOrg: (role: UserRole) => hasPermission(role, 'org:view:all'),
  
  /**
   * Can manage all organizational structure
   */
  canManageAllOrg: (role: UserRole) => hasPermission(role, 'org:manage:all'),
}

/**
 * Unit-based permission checks for MoFA organizational structure
 */
export const UnitBasedPermissions = {
  /**
   * Check if user can view staff in a specific unit
   */
  canViewUnitStaff: (userRole: UserRole, userUnit: string | null, targetUnit: string | null): boolean => {
    // HR roles can view all
    if (hasPermission(userRole, 'employee:view:all')) return true
    
    // Same unit
    if (userUnit && targetUnit && userUnit === targetUnit) {
      return hasPermission(userRole, 'unit:view:own')
    }
    
    return false
  },
  
  /**
   * Check if user can view staff in a specific directorate
   */
  canViewDirectorateStaff: (userRole: UserRole, userDirectorate: string | null, targetDirectorate: string | null): boolean => {
    // HR roles can view all
    if (hasPermission(userRole, 'employee:view:all')) return true
    
    // Same directorate
    if (userDirectorate && targetDirectorate && userDirectorate === targetDirectorate) {
      return hasPermission(userRole, 'directorate:view:own')
    }
    
    return false
  },
  
  /**
   * Check if user can view staff in a specific region
   */
  canViewRegionStaff: (userRole: UserRole, userDutyStation: string | null, targetDutyStation: string | null): boolean => {
    // HR roles can view all
    if (hasPermission(userRole, 'employee:view:all')) return true
    
    // Regional managers can view regional/district staff
    if (
      (userDutyStation === 'Region' || userDutyStation === 'District') &&
      (targetDutyStation === 'Region' || targetDutyStation === 'District')
    ) {
      return hasPermission(userRole, 'region:view:own')
    }
    
    return false
  },
}

