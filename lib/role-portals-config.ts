/**
 * Role-Based Portal Configuration
 * Ghana Civil Service HR Leave & Staff Management Portal
 * 
 * Defines pages, features, API routes, and buttons for each role
 */

import { UserRole } from './permissions'

export interface RolePortalConfig {
  pages: string[]
  features: string[]
  apiRoutes: string[]
  buttons: string[]
}

/**
 * Role-specific portal configurations
 */
export const rolePortals: Record<UserRole, RolePortalConfig> = {
  // ========== PRIMARY ROLES ==========
  
  EMPLOYEE: {
    pages: ['My Leave Requests', 'Apply Leave', 'Leave Balance', 'Notifications'],
    features: ['Apply leave', 'Cancel pending leave', 'Download leave history'],
    apiRoutes: ['/api/leaves', '/api/leaves/:id', '/api/leaves/:id/cancel', '/api/balances'],
    buttons: ['Apply Leave', 'Cancel Request', 'Download History'],
  },

  SUPERVISOR: {
    pages: ['Pending Approvals', 'Team Leave Calendar', 'Leave History of Subordinates'],
    features: ['Approve/Reject/Comment', 'View overlapping leaves'],
    apiRoutes: ['/api/leaves/pending/supervisor', '/api/leaves/:id', '/api/calendar/leave-calendar'],
    buttons: ['Approve', 'Reject', 'Add Comment', 'View Team Calendar'],
  },

  UNIT_HEAD: {
    pages: ['Unit Pending Approvals', 'Acting Officer Assignment', 'Unit Leave Calendar'],
    features: ['Approve/Reject leave', 'Assign acting officer', 'View unit calendar'],
    apiRoutes: ['/api/leaves/pending/unit-head', '/api/leaves/:id', '/api/acting-appointments', '/api/calendar/leave-calendar'],
    buttons: ['Approve with Acting Officer', 'Reject', 'Assign Acting Officer', 'View Unit Calendar'],
  },

  HEAD_OF_DEPARTMENT: {
    pages: ['Directorate Leave Approvals', 'Leave Analytics', 'Acting Officer Assignments', 'Staff Leave History'],
    features: ['Approve/Reject leave', 'Monitor compliance', 'Export reports'],
    apiRoutes: ['/api/leaves/pending/hod', '/api/leaves/:id', '/api/reports/analytics', '/api/reports/export', '/api/acting-appointments'],
    buttons: ['Approve/Reject', 'Export Report', 'View Directorate Calendar'],
  },

  HEAD_OF_INDEPENDENT_UNIT: {
    pages: ['Pending Leave Approvals', 'Unit Leave Calendar', 'Acting Officer Management', 'Leave Reports'],
    features: ['Approve/Reject leave', 'Assign acting officers', 'View unit trends'],
    apiRoutes: ['/api/leaves/pending/independent-unit', '/api/leaves/:id', '/api/acting-appointments', '/api/reports/analytics', '/api/reports/export'],
    buttons: ['Approve/Reject', 'Assign Acting Officer', 'Export Leave Data'],
  },

  DIRECTOR: {
    pages: ['Unit Head Leave Approvals', 'Directorate Leave Overview', 'Acting Officer Assignment', 'Reports'],
    features: ['Approve leave for Unit Heads', 'Verify acting officer', 'Export analytics'],
    apiRoutes: ['/api/leaves/pending/director', '/api/leaves/:id', '/api/reports/analytics', '/api/reports/export', '/api/acting-appointments'],
    buttons: ['Approve/Reject', 'Assign Acting Officer', 'Export Report'],
  },

  HR_OFFICER: {
    pages: ['Pending HR Validation', 'Leave Balance Checks', 'Reports & Audit', 'PSC/OHCS Export'],
    features: ['Validate leave eligibility', 'Flag PSC/OHCS clearance', 'Generate audit-ready reports'],
    apiRoutes: ['/api/leaves/pending/hr-validation', '/api/leaves/hr-validate/:id', '/api/reports/analytics', '/api/reports/export', '/api/reports/compliance'],
    buttons: ['Validate Leave', 'Reject Leave', 'Export PSC Report'],
  },

  HR_DIRECTOR: {
    pages: ['HR Staff Leave Approvals', 'Directorate Reports', 'Leave Analytics', 'Acting Officer Oversight'],
    features: ['Approve/reject HR staff leave', 'Monitor HR compliance', 'Export HR reports'],
    apiRoutes: ['/api/leaves/pending/hr-director', '/api/leaves/:id', '/api/reports/analytics', '/api/reports/export', '/api/reports/compliance'],
    buttons: ['Approve/Reject', 'Export HR Reports'],
  },

  CHIEF_DIRECTOR: {
    pages: ['Final Leave Approvals', 'Ministry Leave Overview', 'Reports / Audit', 'PSC/OHCS Notifications'],
    features: ['Final approval', 'View acting officer assignments', 'Export ministry-wide reports'],
    apiRoutes: ['/api/leaves/pending/chief-director', '/api/leaves/:id', '/api/reports/analytics', '/api/reports/export', '/api/reports/compliance', '/api/leaves/external-clearance'],
    buttons: ['Approve/Reject', 'View Acting Officer Assignments', 'Export Ministry Report', 'Notify PSC/OHCS'],
  },

  AUDITOR: {
    pages: ['Audit Leave Requests', 'Export Reports', 'Audit Trails'],
    features: ['View all leave', 'Filter and search', 'Download immutable audit trail'],
    apiRoutes: ['/api/leaves', '/api/audit-logs', '/api/audit-logs/:id', '/api/reports/export', '/api/reports/compliance'],
    buttons: ['Export Audit Trail', 'Filter / Search Requests'],
  },

  SYSTEM_ADMIN: {
    pages: ['User Management', 'Role Assignment', 'System Settings', 'Logs'],
    features: ['Add/remove users', 'Assign roles', 'Configure leave types', 'Manage access logs'],
    apiRoutes: ['/api/admin/users', '/api/admin/users/:id', '/api/admin/audit-logs', '/api/audit-logs'],
    buttons: ['Add User', 'Edit Roles', 'Export Logs', 'Configure System'],
  },

  // ========== LEGACY ROLES (Mapped to primary roles) ==========
  
  employee: {
    pages: ['My Leave Requests', 'Apply Leave', 'Leave Balance', 'Notifications'],
    features: ['Apply leave', 'Cancel pending leave', 'Download leave history'],
    apiRoutes: ['/api/leaves', '/api/leaves/:id', '/api/leaves/:id/cancel', '/api/balances'],
    buttons: ['Apply Leave', 'Cancel Request', 'Download History'],
  },

  supervisor: {
    pages: ['Pending Approvals', 'Team Leave Calendar', 'Leave History of Subordinates'],
    features: ['Approve/Reject/Comment', 'View overlapping leaves'],
    apiRoutes: ['/api/leaves/pending/supervisor', '/api/leaves/:id', '/api/calendar/leave-calendar'],
    buttons: ['Approve', 'Reject', 'Add Comment', 'View Team Calendar'],
  },

  unit_head: {
    pages: ['Unit Pending Approvals', 'Acting Officer Assignment', 'Unit Leave Calendar'],
    features: ['Approve/Reject leave', 'Assign acting officer', 'View unit calendar'],
    apiRoutes: ['/api/leaves/pending/unit-head', '/api/leaves/:id', '/api/acting-appointments', '/api/calendar/leave-calendar'],
    buttons: ['Approve with Acting Officer', 'Reject', 'Assign Acting Officer', 'View Unit Calendar'],
  },

  head_of_department: {
    pages: ['Directorate Leave Approvals', 'Leave Analytics', 'Acting Officer Assignments', 'Staff Leave History'],
    features: ['Approve/Reject leave', 'Monitor compliance', 'Export reports'],
    apiRoutes: ['/api/leaves/pending/hod', '/api/leaves/:id', '/api/reports/analytics', '/api/reports/export', '/api/acting-appointments'],
    buttons: ['Approve/Reject', 'Export Report', 'View Directorate Calendar'],
  },

  hod: {
    pages: ['Directorate Leave Approvals', 'Leave Analytics', 'Acting Officer Assignments', 'Staff Leave History'],
    features: ['Approve/Reject leave', 'Monitor compliance', 'Export reports'],
    apiRoutes: ['/api/leaves/pending/hod', '/api/leaves/:id', '/api/reports/analytics', '/api/reports/export', '/api/acting-appointments'],
    buttons: ['Approve/Reject', 'Export Report', 'View Directorate Calendar'],
  },

  head_of_independent_unit: {
    pages: ['Pending Leave Approvals', 'Unit Leave Calendar', 'Acting Officer Management', 'Leave Reports'],
    features: ['Approve/Reject leave', 'Assign acting officers', 'View unit trends'],
    apiRoutes: ['/api/leaves/pending/independent-unit', '/api/leaves/:id', '/api/acting-appointments', '/api/reports/analytics', '/api/reports/export'],
    buttons: ['Approve/Reject', 'Assign Acting Officer', 'Export Leave Data'],
  },

  directorate_head: {
    pages: ['Unit Head Leave Approvals', 'Directorate Leave Overview', 'Acting Officer Assignment', 'Reports'],
    features: ['Approve leave for Unit Heads', 'Verify acting officer', 'Export analytics'],
    apiRoutes: ['/api/leaves/pending/director', '/api/leaves/:id', '/api/reports/analytics', '/api/reports/export', '/api/acting-appointments'],
    buttons: ['Approve/Reject', 'Assign Acting Officer', 'Export Report'],
  },

  hr_officer: {
    pages: ['Pending HR Validation', 'Leave Balance Checks', 'Reports & Audit', 'PSC/OHCS Export'],
    features: ['Validate leave eligibility', 'Flag PSC/OHCS clearance', 'Generate audit-ready reports'],
    apiRoutes: ['/api/leaves/pending/hr-validation', '/api/leaves/hr-validate/:id', '/api/reports/analytics', '/api/reports/export', '/api/reports/compliance'],
    buttons: ['Validate Leave', 'Reject Leave', 'Export PSC Report'],
  },

  hr_director: {
    pages: ['HR Staff Leave Approvals', 'Directorate Reports', 'Leave Analytics', 'Acting Officer Oversight'],
    features: ['Approve/reject HR staff leave', 'Monitor HR compliance', 'Export HR reports'],
    apiRoutes: ['/api/leaves/pending/hr-director', '/api/leaves/:id', '/api/reports/analytics', '/api/reports/export', '/api/reports/compliance'],
    buttons: ['Approve/Reject', 'Export HR Reports'],
  },

  chief_director: {
    pages: ['Final Leave Approvals', 'Ministry Leave Overview', 'Reports / Audit', 'PSC/OHCS Notifications'],
    features: ['Final approval', 'View acting officer assignments', 'Export ministry-wide reports'],
    apiRoutes: ['/api/leaves/pending/chief-director', '/api/leaves/:id', '/api/reports/analytics', '/api/reports/export', '/api/reports/compliance', '/api/leaves/external-clearance'],
    buttons: ['Approve/Reject', 'View Acting Officer Assignments', 'Export Ministry Report', 'Notify PSC/OHCS'],
  },

  internal_auditor: {
    pages: ['Audit Leave Requests', 'Export Reports', 'Audit Trails'],
    features: ['View all leave', 'Filter and search', 'Download immutable audit trail'],
    apiRoutes: ['/api/leaves', '/api/audit-logs', '/api/audit-logs/:id', '/api/reports/export', '/api/reports/compliance'],
    buttons: ['Export Audit Trail', 'Filter / Search Requests'],
  },

  hr: {
    pages: ['Pending HR Validation', 'Leave Balance Checks', 'Reports & Audit', 'PSC/OHCS Export'],
    features: ['Validate leave eligibility', 'Flag PSC/OHCS clearance', 'Generate audit-ready reports'],
    apiRoutes: ['/api/leaves/pending/hr-validation', '/api/leaves/hr-validate/:id', '/api/reports/analytics', '/api/reports/export', '/api/reports/compliance'],
    buttons: ['Validate Leave', 'Reject Leave', 'Export PSC Report'],
  },

  hr_assistant: {
    pages: ['Pending HR Validation', 'Leave Balance Checks', 'Reports & Audit', 'PSC/OHCS Export'],
    features: ['Validate leave eligibility', 'Flag PSC/OHCS clearance', 'Generate audit-ready reports'],
    apiRoutes: ['/api/leaves/pending/hr-validation', '/api/leaves/hr-validate/:id', '/api/reports/analytics', '/api/reports/export', '/api/reports/compliance'],
    buttons: ['Validate Leave', 'Reject Leave', 'Export PSC Report'],
  },

  manager: {
    pages: ['Pending Approvals', 'Team Leave Calendar', 'Leave History of Subordinates'],
    features: ['Approve/Reject/Comment', 'View overlapping leaves'],
    apiRoutes: ['/api/leaves/pending/supervisor', '/api/leaves/:id', '/api/calendar/leave-calendar'],
    buttons: ['Approve', 'Reject', 'Add Comment', 'View Team Calendar'],
  },

  deputy_director: {
    pages: ['Unit Head Leave Approvals', 'Directorate Leave Overview', 'Acting Officer Assignment', 'Reports'],
    features: ['Approve leave for Unit Heads', 'Verify acting officer', 'Export analytics'],
    apiRoutes: ['/api/leaves/pending/director', '/api/leaves/:id', '/api/reports/analytics', '/api/reports/export', '/api/acting-appointments'],
    buttons: ['Approve/Reject', 'Assign Acting Officer', 'Export Report'],
  },

  admin: {
    pages: ['User Management', 'Role Assignment', 'System Settings', 'Logs'],
    features: ['Add/remove users', 'Assign roles', 'Configure leave types', 'Manage access logs'],
    apiRoutes: ['/api/admin/users', '/api/admin/users/:id', '/api/admin/audit-logs', '/api/audit-logs'],
    buttons: ['Add User', 'Edit Roles', 'Export Logs', 'Configure System'],
  },

  SYS_ADMIN: {
    pages: ['User Management', 'Role Assignment', 'System Settings', 'Logs'],
    features: ['Add/remove users', 'Assign roles', 'Configure leave types', 'Manage access logs'],
    apiRoutes: ['/api/admin/users', '/api/admin/users/:id', '/api/admin/audit-logs', '/api/audit-logs'],
    buttons: ['Add User', 'Edit Roles', 'Export Logs', 'Configure System'],
  },
}

/**
 * Get portal configuration for a role
 */
export function getRolePortalConfig(role: UserRole): RolePortalConfig | null {
  return rolePortals[role] || null
}

/**
 * Get all pages for a role
 */
export function getRolePages(role: UserRole): string[] {
  const config = getRolePortalConfig(role)
  return config?.pages || []
}

/**
 * Get all features for a role
 */
export function getRoleFeatures(role: UserRole): string[] {
  const config = getRolePortalConfig(role)
  return config?.features || []
}

/**
 * Get all API routes for a role
 */
export function getRoleApiRoutes(role: UserRole): string[] {
  const config = getRolePortalConfig(role)
  return config?.apiRoutes || []
}

/**
 * Get all buttons/actions for a role
 */
export function getRoleButtons(role: UserRole): string[] {
  const config = getRolePortalConfig(role)
  return config?.buttons || []
}

/**
 * Check if a role has access to a specific feature
 */
export function roleHasFeature(role: UserRole, feature: string): boolean {
  const features = getRoleFeatures(role)
  return features.includes(feature)
}

/**
 * Check if a role has access to a specific API route
 */
export function roleHasApiRoute(role: UserRole, route: string): boolean {
  const routes = getRoleApiRoutes(role)
  // Check if route matches (handle dynamic params like :id)
  return routes.some(r => {
    // Exact match
    if (r === route) return true
    // Pattern match (e.g., /api/leaves/approve/:id matches /api/leaves/approve/123)
    const pattern = r.replace(/:[^/]+/g, '[^/]+')
    const regex = new RegExp(`^${pattern}$`)
    return regex.test(route)
  })
}

