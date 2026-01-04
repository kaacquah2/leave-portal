/**
 * Workflow Integration Utility
 * Integrates leave workflow rules with role-based portals
 * Ensures: self-approval prevention, acting officer enforcement, HR validation, PSC/OHCS clearance
 */

import { UserRole } from './permissions'
import { VALID_USER_ROLES } from './role-utils'

export interface WorkflowIntegrationConfig {
  selfApprovalBlocked: boolean
  actingOfficerRequired: boolean
  hrValidationRequired: boolean
  externalClearance: boolean
}

/**
 * Get workflow integration configuration for a role
 */
export function getWorkflowIntegrationConfig(role: UserRole): WorkflowIntegrationConfig {
  const normalizedRole = role.toUpperCase() as UserRole

  return {
    selfApprovalBlocked: true, // Always blocked for all roles
    actingOfficerRequired: ['UNIT_HEAD', 'HEAD_OF_DEPARTMENT', 'DIRECTOR', 'HR_DIRECTOR', 'HEAD_OF_INDEPENDENT_UNIT'].includes(normalizedRole),
    hrValidationRequired: !['HR_OFFICER', 'HR_DIRECTOR'].includes(normalizedRole), // HR roles skip their own validation
    externalClearance: true, // All roles may need external clearance for special leave types
  }
}

/**
 * Integrate leave workflow rules for a role
 * This function ensures all workflow rules are properly configured
 */
export function integrateLeaveWorkflow(
  role: UserRole,
  config?: Partial<WorkflowIntegrationConfig>
): WorkflowIntegrationConfig {
  const defaultConfig = getWorkflowIntegrationConfig(role)
  return {
    ...defaultConfig,
    ...config,
  }
}

/**
 * Apply workflow integration to all roles
 */
export function applyWorkflowIntegrationToAllRoles(): Record<UserRole, WorkflowIntegrationConfig> {
  const integrations: Record<string, WorkflowIntegrationConfig> = {}

  VALID_USER_ROLES.forEach((role) => {
    integrations[role] = integrateLeaveWorkflow(role)
  })

  return integrations as Record<UserRole, WorkflowIntegrationConfig>
}

/**
 * Check if a role requires acting officer assignment
 */
export function requiresActingOfficer(role: UserRole): boolean {
  const config = getWorkflowIntegrationConfig(role)
  return config.actingOfficerRequired
}

/**
 * Check if a role requires HR validation
 */
export function requiresHRValidation(role: UserRole): boolean {
  const config = getWorkflowIntegrationConfig(role)
  return config.hrValidationRequired
}

/**
 * Check if external clearance is supported
 */
export function supportsExternalClearance(role: UserRole): boolean {
  const config = getWorkflowIntegrationConfig(role)
  return config.externalClearance
}

/**
 * Validate workflow configuration for a role
 */
export function validateWorkflowConfig(role: UserRole, config: WorkflowIntegrationConfig): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Self-approval must always be blocked
  if (!config.selfApprovalBlocked) {
    errors.push('Self-approval must be blocked for all roles')
  }

  // Acting officer required roles
  const actingOfficerRoles = ['UNIT_HEAD', 'HEAD_OF_DEPARTMENT', 'DIRECTOR', 'HR_DIRECTOR', 'HEAD_OF_INDEPENDENT_UNIT']
  if (actingOfficerRoles.includes(role.toUpperCase())) {
    if (!config.actingOfficerRequired) {
      errors.push(`${role} must require acting officer assignment`)
    }
  }

  // HR validation rules
  const hrRoles = ['HR_OFFICER', 'HR_DIRECTOR']
  if (hrRoles.includes(role.toUpperCase())) {
    if (config.hrValidationRequired) {
      errors.push(`${role} should not require HR validation (they are HR)`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

