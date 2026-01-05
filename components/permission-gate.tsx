'use client'

import { hasPermission, type UserRole, type Permission } from '@/lib/roles'

interface PermissionGateProps {
  role: UserRole
  permission: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * PermissionGate component - Conditionally renders children based on user permissions
 * 
 * @example
 * <PermissionGate role={userRole} permission="employee:payslip:view:own">
 *   <PayslipsCard />
 * </PermissionGate>
 */
export function PermissionGate({ role, permission, children, fallback = null }: PermissionGateProps) {
  if (hasPermission(role, permission)) {
    return <>{children}</>
  }
  return <>{fallback}</>
}

