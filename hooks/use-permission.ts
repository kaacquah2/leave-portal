/**
 * usePermission Hook
 * 
 * Standardized hook for checking user permissions across components
 * Provides consistent permission checking pattern
 */

import { useAuth } from './use-auth'
import { hasPermission, type Permission, type UserRole } from '@/lib/permissions'

/**
 * Hook to check if current user has a specific permission
 * 
 * @param permission - The permission to check
 * @returns boolean indicating if user has the permission
 * 
 * @example
 * ```tsx
 * const canApprove = usePermission('leave:approve:team')
 * 
 * {canApprove && (
 *   <Button onClick={handleApprove}>Approve</Button>
 * )}
 * ```
 */
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth()
  
  if (!user?.role) {
    return false
  }
  
  return hasPermission(user.role as UserRole, permission)
}

/**
 * Hook to check if current user has any of the specified permissions
 * 
 * @param permissions - Array of permissions to check
 * @returns boolean indicating if user has any of the permissions
 * 
 * @example
 * ```tsx
 * const canViewLeaves = useAnyPermission(['leave:view:all', 'leave:view:team'])
 * ```
 */
export function useAnyPermission(permissions: Permission[]): boolean {
  const { user } = useAuth()
  
  if (!user?.role) {
    return false
  }
  
  return permissions.some(permission => hasPermission(user.role as UserRole, permission))
}

/**
 * Hook to check if current user has all of the specified permissions
 * 
 * @param permissions - Array of permissions to check
 * @returns boolean indicating if user has all of the permissions
 * 
 * @example
 * ```tsx
 * const canManageStaff = useAllPermissions(['employee:view:all', 'employee:update'])
 * ```
 */
export function useAllPermissions(permissions: Permission[]): boolean {
  const { user } = useAuth()
  
  if (!user?.role) {
    return false
  }
  
  return permissions.every(permission => hasPermission(user.role as UserRole, permission))
}

