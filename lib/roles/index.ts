/**
 * Roles & Permissions Module Barrel Export
 * 
 * Centralized exports for all role and permission-related functionality.
 * Import from this file for cleaner imports.
 */

// Core permissions
export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  type Permission,
  PermissionChecks,
  UnitBasedPermissions,
} from './permissions'

// Role mapping
export {
  mapToMoFARole,
  getRoleDisplayName,
  getRoleRoute,
  isReadOnlyRole,
} from './role-mapping'

// Role utilities
export {
  normalizeRole,
  isAdminRole,
  isHRRole,
  isEmployeeRole,
  isAuditorRole,
  isSupervisorRole,
  isUnitHeadRole,
  isDirectorRole,
  isChiefDirectorRole,
  canViewAuditLogs,
  canManageUsers,
  canManageSystem,
  canViewAllData,
  canApproveLeave,
  canViewTeamData,
  hasAnyRole,
  VALID_USER_ROLES,
  HR_ROLES,
  ADMIN_ROLES,
  READ_ONLY_ROLES,
  AUDIT_ROLES,
  HR_DIRECTOR,
  SYSTEM_ADMIN,
  AUDITOR,
} from './role-utils'

// RBAC middleware
export {
  getUserRBACContext,
  canViewLeaveRequest,
  canApproveLeaveRequest,
  canCreateLeaveRequest,
  type RBACContext,
  type ApprovalCheckResult,
} from './mofa-rbac-middleware'

// Types
export type { UserRole } from '../types/roles'

