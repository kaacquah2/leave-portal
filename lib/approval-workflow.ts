/**
 * Enhanced Approval Workflow Engine
 * Supports parallel approvals, conditional routing, escalation, and delegation
 */

export interface ApprovalLevel {
  level: number
  approverRole: 'manager' | 'hr' | 'director' | 'admin'
  approverId?: string // Specific approver user ID
  approverStaffId?: string // Specific approver staff ID
  status: 'pending' | 'approved' | 'rejected' | 'delegated'
  approverName?: string
  approvalDate?: string
  comments?: string
  delegatedTo?: string // User ID of delegate
  delegatedToName?: string
  delegationDate?: string
  parallel?: boolean // If true, can be approved in parallel with other levels
  required?: boolean // If false, this level is optional
  conditions?: ApprovalCondition[] // Conditions for this level to be required
  escalationRules?: EscalationRule[]
}

export interface ApprovalCondition {
  type: 'days' | 'leaveType' | 'department' | 'grade' | 'amount'
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'in' | 'notIn'
  value: any
}

export interface EscalationRule {
  triggerAfterHours: number
  escalateTo?: string // User ID or role
  notify?: boolean
  autoApprove?: boolean // Auto-approve if escalated (for certain cases)
}

export interface ApprovalHistory {
  id: string
  leaveRequestId: string
  action: 'submitted' | 'approved' | 'rejected' | 'delegated' | 'escalated' | 'reminder_sent' | 'recalled'
  performedBy: string
  performedByName: string
  performedAt: string
  level?: number
  comments?: string
  previousStatus?: string
  newStatus?: string
  metadata?: Record<string, any>
}

export interface DelegationRequest {
  id: string
  leaveRequestId: string
  fromUserId: string
  fromUserName: string
  toUserId: string
  toUserName: string
  level: number
  status: 'pending' | 'accepted' | 'rejected'
  requestedAt: string
  respondedAt?: string
  reason?: string
}

/**
 * Check if approval level conditions are met
 */
export function checkApprovalConditions(
  level: ApprovalLevel,
  leaveData: {
    days: number
    leaveType: string
    department?: string
    grade?: string
    amount?: number
  }
): boolean {
  if (!level.conditions || level.conditions.length === 0) {
    return true // No conditions means always required
  }

  // All conditions must be met (AND logic)
  return level.conditions.every((condition) => {
    switch (condition.type) {
      case 'days':
        return compareValues(leaveData.days, condition.operator, condition.value)
      case 'leaveType':
        if (condition.operator === 'eq') {
          return leaveData.leaveType === condition.value
        } else if (condition.operator === 'in') {
          return Array.isArray(condition.value) && condition.value.includes(leaveData.leaveType)
        }
        return false
      case 'department':
        return leaveData.department && compareValues(leaveData.department, condition.operator, condition.value)
      case 'grade':
        return leaveData.grade && compareValues(leaveData.grade, condition.operator, condition.value)
      case 'amount':
        return leaveData.amount && compareValues(leaveData.amount, condition.operator, condition.value)
      default:
        return true
    }
  })
}

/**
 * Compare values based on operator
 */
function compareValues(actual: any, operator: string, expected: any): boolean {
  switch (operator) {
    case 'gt':
      return actual > expected
    case 'gte':
      return actual >= expected
    case 'lt':
      return actual < expected
    case 'lte':
      return actual <= expected
    case 'eq':
      return actual === expected
    case 'in':
      return Array.isArray(expected) && expected.includes(actual)
    case 'notIn':
      return Array.isArray(expected) && !expected.includes(actual)
    default:
      return false
  }
}

/**
 * Determine which approval levels are required based on conditions
 */
export function getRequiredApprovalLevels(
  levels: ApprovalLevel[],
  leaveData: {
    days: number
    leaveType: string
    department?: string
    grade?: string
    amount?: number
  }
): ApprovalLevel[] {
  return levels.filter((level) => {
    // If level is marked as not required, check conditions
    if (level.required === false) {
      return checkApprovalConditions(level, leaveData)
    }
    // If required is true or undefined, always include
    return true
  })
}

/**
 * Check if parallel approvals are complete
 */
export function areParallelApprovalsComplete(levels: ApprovalLevel[]): boolean {
  // Group levels by parallel groups
  const parallelGroups: ApprovalLevel[][] = []
  const sequentialLevels: ApprovalLevel[] = []

  levels.forEach((level) => {
    if (level.parallel) {
      // Find existing parallel group or create new
      const group = parallelGroups.find((g) => g.some((l) => l.level === level.level))
      if (group) {
        group.push(level)
      } else {
        parallelGroups.push([level])
      }
    } else {
      sequentialLevels.push(level)
    }
  })

  // Check parallel groups - all must be approved
  for (const group of parallelGroups) {
    const allApproved = group.every((l) => l.status === 'approved')
    const anyRejected = group.some((l) => l.status === 'rejected')
    if (anyRejected) return false
    if (!allApproved) return false
  }

  // Check sequential levels
  for (const level of sequentialLevels) {
    if (level.status === 'pending' || level.status === 'delegated') {
      return false
    }
    if (level.status === 'rejected') {
      return false
    }
  }

  return true
}

/**
 * Check if escalation should be triggered
 */
export function checkEscalation(
  level: ApprovalLevel,
  submittedAt: Date
): { shouldEscalate: boolean; escalateTo?: string; autoApprove?: boolean } {
  if (!level.escalationRules || level.escalationRules.length === 0) {
    return { shouldEscalate: false }
  }

  const now = new Date()
  const hoursSinceSubmission = (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60)

  // Find applicable escalation rule
  for (const rule of level.escalationRules.sort((a, b) => b.triggerAfterHours - a.triggerAfterHours)) {
    if (hoursSinceSubmission >= rule.triggerAfterHours && level.status === 'pending') {
      return {
        shouldEscalate: true,
        escalateTo: rule.escalateTo,
        autoApprove: rule.autoApprove,
      }
    }
  }

  return { shouldEscalate: false }
}

/**
 * Calculate overall approval status
 */
export function calculateApprovalStatus(levels: ApprovalLevel[]): 'pending' | 'approved' | 'rejected' {
  // Check for any rejection
  const anyRejected = levels.some((l) => l.status === 'rejected')
  if (anyRejected) return 'rejected'

  // Get required levels
  const requiredLevels = levels.filter((l) => l.required !== false)
  if (requiredLevels.length === 0) return 'approved'

  // Check if all required levels are approved
  const allRequiredApproved = requiredLevels.every((l) => l.status === 'approved')
  if (allRequiredApproved) {
    // Also check parallel approvals if any
    if (levels.some((l) => l.parallel)) {
      return areParallelApprovalsComplete(levels) ? 'approved' : 'pending'
    }
    return 'approved'
  }

  return 'pending'
}

/**
 * Get next approvers for a leave request
 */
export function getNextApprovers(levels: ApprovalLevel[]): ApprovalLevel[] {
  // Find the first pending level that can be approved
  const pendingLevels = levels.filter((l) => l.status === 'pending' || l.status === 'delegated')

  if (pendingLevels.length === 0) return []

  // If there are parallel levels, return all parallel pending levels
  const parallelPending = pendingLevels.filter((l) => l.parallel)
  if (parallelPending.length > 0) {
    return parallelPending
  }

  // Otherwise, return the first sequential pending level
  const firstPending = pendingLevels.sort((a, b) => a.level - b.level)[0]
  if (!firstPending) return []

  // Check if previous levels are approved
  const previousLevels = levels.filter((l) => l.level < firstPending.level && !l.parallel)
  const previousApproved = previousLevels.every((l) => l.status === 'approved')

  if (previousApproved || previousLevels.length === 0) {
    return [firstPending]
  }

  return []
}

