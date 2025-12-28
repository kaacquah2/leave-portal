/**
 * Role-Based Access Control (RBAC) Permissions System
 * 
 * This file defines the access boundaries for HR and Manager roles
 * based on the Staff & HR Management Portal requirements.
 */

export type UserRole = 'hr' | 'hr_assistant' | 'manager' | 'deputy_director' | 'employee' | 'admin'

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

/**
 * Permission matrix defining what each role can do
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
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
}

