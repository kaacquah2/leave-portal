/**
 * Workflow State Transition Validator
 * 
 * Validates state transitions for leave requests and approval steps
 * to ensure only valid transitions are allowed.
 */

export type LeaveStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'recorded'

export type ApprovalStepStatus = 'pending' | 'approved' | 'rejected' | 'delegated' | 'skipped'

interface Transition {
  from: LeaveStatus | ApprovalStepStatus
  to: LeaveStatus | ApprovalStepStatus
  condition?: string
}

const VALID_LEAVE_TRANSITIONS: Transition[] = [
  { from: 'draft', to: 'pending', condition: 'On submit' },
  { from: 'pending', to: 'approved', condition: 'All levels approved' },
  { from: 'pending', to: 'rejected', condition: 'Any level rejected' },
  { from: 'pending', to: 'cancelled', condition: 'Employee/HR cancels' },
  { from: 'rejected', to: 'pending', condition: 'Resubmission' },
  { from: 'approved', to: 'cancelled', condition: 'HR cancels' },
  { from: 'pending', to: 'recorded', condition: 'Chief Director leave - HR Director approved' },
]

const VALID_STEP_TRANSITIONS: Transition[] = [
  { from: 'pending', to: 'approved', condition: 'Approver approves' },
  { from: 'pending', to: 'rejected', condition: 'Approver rejects' },
  { from: 'pending', to: 'delegated', condition: 'Approver delegates' },
  { from: 'pending', to: 'skipped', condition: 'Escalation or auto-skip' },
  { from: 'delegated', to: 'approved', condition: 'Delegate approves' },
]

/**
 * Check if a leave status transition is valid
 */
export function isValidLeaveTransition(
  from: LeaveStatus,
  to: LeaveStatus
): { valid: boolean; reason?: string } {
  const transition = VALID_LEAVE_TRANSITIONS.find(
    (t) => t.from === from && t.to === to
  )

  if (!transition) {
    return {
      valid: false,
      reason: `Invalid transition from ${from} to ${to}. Valid transitions from ${from}: ${VALID_LEAVE_TRANSITIONS.filter(t => t.from === from).map(t => t.to).join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Check if an approval step status transition is valid
 */
export function isValidStepTransition(
  from: ApprovalStepStatus,
  to: ApprovalStepStatus
): { valid: boolean; reason?: string } {
  const transition = VALID_STEP_TRANSITIONS.find(
    (t) => t.from === from && t.to === to
  )

  if (!transition) {
    return {
      valid: false,
      reason: `Invalid transition from ${from} to ${to}. Valid transitions from ${from}: ${VALID_STEP_TRANSITIONS.filter(t => t.from === from).map(t => t.to).join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Validate workflow transition for both leave status and step status
 */
export function validateWorkflowTransition(
  currentStatus: LeaveStatus,
  newStatus: LeaveStatus,
  currentStepStatus?: ApprovalStepStatus,
  newStepStatus?: ApprovalStepStatus
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate leave status transition
  const leaveValidation = isValidLeaveTransition(currentStatus, newStatus)
  if (!leaveValidation.valid) {
    errors.push(leaveValidation.reason || 'Invalid leave status transition')
  }

  // Validate step status transition if provided
  if (currentStepStatus && newStepStatus) {
    const stepValidation = isValidStepTransition(currentStepStatus, newStepStatus)
    if (!stepValidation.valid) {
      errors.push(stepValidation.reason || 'Invalid step status transition')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get all valid transitions from a given status
 */
export function getValidTransitions(
  status: LeaveStatus | ApprovalStepStatus,
  type: 'leave' | 'step' = 'leave'
): LeaveStatus[] | ApprovalStepStatus[] {
  if (type === 'leave') {
    return VALID_LEAVE_TRANSITIONS
      .filter((t) => t.from === status)
      .map((t) => t.to as LeaveStatus)
  } else {
    return VALID_STEP_TRANSITIONS
      .filter((t) => t.from === status)
      .map((t) => t.to as ApprovalStepStatus)
  }
}

