'use client'

import { useMemo } from 'react'
import { hasPermission, hasAnyPermission, hasAllPermissions, getRolePermissions, type UserRole, type Permission } from '@/lib/roles'
import { PermissionChecks } from '@/lib/roles'

/**
 * Hook to check if user has a specific permission
 * 
 * @example
 * const canViewPayslips = useHasPermission(userRole, 'employee:payslip:view:own')
 */
export function useHasPermission(role: UserRole | undefined, permission: Permission): boolean {
  return useMemo(() => {
    if (!role) return false
    return hasPermission(role, permission)
  }, [role, permission])
}

/**
 * Hook to check if user has any of the specified permissions
 * 
 * @example
 * const canViewReports = useHasAnyPermission(userRole, ['reports:hr:view', 'reports:team:view'])
 */
export function useHasAnyPermission(role: UserRole | undefined, permissions: Permission[]): boolean {
  return useMemo(() => {
    if (!role) return false
    return hasAnyPermission(role, permissions)
  }, [role, permissions])
}

/**
 * Hook to check if user has all of the specified permissions
 * 
 * @example
 * const canManageEverything = useHasAllPermissions(userRole, ['employee:create', 'employee:update', 'employee:delete'])
 */
export function useHasAllPermissions(role: UserRole | undefined, permissions: Permission[]): boolean {
  return useMemo(() => {
    if (!role) return false
    return hasAllPermissions(role, permissions)
  }, [role, permissions])
}

/**
 * Hook to get all permissions for a role
 * 
 * @example
 * const permissions = useRolePermissions(userRole)
 */
export function useRolePermissions(role: UserRole | undefined): Permission[] {
  return useMemo(() => {
    if (!role) return []
    return getRolePermissions(role)
  }, [role])
}

/**
 * Comprehensive permission hook that provides all permission checks for a role
 * 
 * @example
 * const permissions = usePermissions(userRole)
 * if (permissions.canViewAllEmployees) { ... }
 * if (permissions.canApproveLeaveTeam) { ... }
 */
export function usePermissions(role: UserRole | undefined) {
  return useMemo(() => {
    if (!role) {
      return {
        // Employee permissions
        canViewSelf: false,
        canUpdateSelf: false,
        canViewOwnLeaves: false,
        canCreateOwnLeaves: false,
        canViewOwnPayslips: false,
        canViewOwnPerformance: false,
        
        // Manager permissions
        canViewTeamEmployees: false,
        canViewTeamLeaves: false,
        canApproveLeaveTeam: false,
        canViewTeamReports: false,
        
        // HR permissions
        canCreateEmployee: false,
        canUpdateEmployee: false,
        canViewAllEmployees: false,
        canDeleteEmployee: false,
        canEditEmployeeSalary: false,
        canApproveLeaveAll: false,
        canViewAllLeaves: false,
        canManageLeavePolicy: false,
        canViewHRReports: false,
        
        // System permissions
        canManageSystemConfig: false,
        canManageUsers: false,
        canViewSystemReports: false,
        canViewAuditLogs: false,
      }
    }
    
    return {
      // Employee permissions
      canViewSelf: hasPermission(role, 'employee:self:view'),
      canUpdateSelf: hasPermission(role, 'employee:self:update'),
      canViewOwnLeaves: hasPermission(role, 'employee:leave:view:own'),
      canCreateOwnLeaves: hasPermission(role, 'employee:leave:create:own'),
      canViewOwnPayslips: hasPermission(role, 'employee:payslip:view:own'),
      canViewOwnPerformance: hasPermission(role, 'employee:performance:view:own'),
      
      // Manager permissions
      canViewTeamEmployees: PermissionChecks.canViewTeamEmployees(role),
      canViewTeamLeaves: PermissionChecks.canViewTeamLeaves(role),
      canApproveLeaveTeam: PermissionChecks.canApproveLeaveTeam(role),
      canViewTeamReports: PermissionChecks.canViewTeamReports(role),
      
      // HR permissions
      canCreateEmployee: PermissionChecks.canCreateEmployee(role),
      canUpdateEmployee: hasPermission(role, 'employee:update'),
      canViewAllEmployees: PermissionChecks.canViewAllEmployees(role),
      canDeleteEmployee: hasPermission(role, 'employee:delete'),
      canEditEmployeeSalary: PermissionChecks.canEditEmployeeSalary(role),
      canApproveLeaveAll: PermissionChecks.canApproveLeaveAll(role),
      canViewAllLeaves: PermissionChecks.canViewAllLeaves(role),
      canManageLeavePolicy: PermissionChecks.canManageLeavePolicy(role),
      canViewHRReports: PermissionChecks.canViewHRReports(role),
      
      // System permissions
      canManageSystemConfig: PermissionChecks.canManageSystemConfig(role),
      canManageUsers: PermissionChecks.canManageUsers(role),
      canViewSystemReports: PermissionChecks.canViewSystemReports(role),
      canViewAuditLogs: PermissionChecks.canViewAuditLogs(role),
    }
  }, [role])
}

