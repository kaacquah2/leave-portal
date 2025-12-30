/**
 * Workflow Safeguards
 * 
 * Ghana Government Compliance: Prevents retroactive approvals and requires justification
 * Per requirement: Prevent approvals after leave start date (unless emergency)
 * 
 * Legal Reference: Internal Audit Agency requirements, segregation of duties
 * 
 * @module workflow-safeguards
 */

import { prisma } from './prisma'

export interface RetroactiveApprovalCheck {
  isRetroactive: boolean
  daysPastStart: number
  requiresJustification: boolean
  requiresHigherApproval: boolean
  errorMessage?: string
}

/**
 * Check if approval is retroactive (after leave start date)
 * 
 * @param leaveRequestId - Leave request ID
 * @returns Check result with flags for justification and higher approval
 */
export async function checkRetroactiveApproval(
  leaveRequestId: string
): Promise<RetroactiveApprovalCheck> {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    select: {
      startDate: true,
      endDate: true,
      status: true,
    },
  })

  if (!leave) {
    return {
      isRetroactive: false,
      daysPastStart: 0,
      requiresJustification: false,
      requiresHigherApproval: false,
      errorMessage: 'Leave request not found',
    }
  }

  const now = new Date()
  const startDate = new Date(leave.startDate)
  const daysPastStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  // If leave has already started, it's retroactive
  const isRetroactive = now > startDate && leave.status !== 'approved'

  if (!isRetroactive) {
    return {
      isRetroactive: false,
      daysPastStart: 0,
      requiresJustification: false,
      requiresHigherApproval: false,
    }
  }

  // Retroactive approvals require justification
  // If more than 7 days past start, require higher-level approval (HR Director)
  const requiresHigherApproval = daysPastStart > 7

  return {
    isRetroactive: true,
    daysPastStart,
    requiresJustification: true,
    requiresHigherApproval,
    errorMessage: requiresHigherApproval
      ? `This leave started ${daysPastStart} days ago. Retroactive approval requires HR Director authorization and mandatory justification.`
      : `This leave started ${daysPastStart} days ago. Retroactive approval requires mandatory justification.`,
  }
}

/**
 * Validate justification for retroactive approval
 * 
 * @param justification - Justification text
 * @param daysPastStart - Days past leave start date
 * @returns Validation result
 */
export function validateRetroactiveJustification(
  justification: string | undefined,
  daysPastStart: number
): { valid: boolean; error?: string } {
  if (!justification || justification.trim().length === 0) {
    return {
      valid: false,
      error: 'Justification is required for retroactive approvals',
    }
  }

  // Minimum length based on how far past start date
  const minLength = daysPastStart > 7 ? 50 : 30

  if (justification.trim().length < minLength) {
    return {
      valid: false,
      error: `Justification must be at least ${minLength} characters for retroactive approvals (${daysPastStart} days past start date)`,
    }
  }

  return { valid: true }
}

/**
 * Check if user has authority for retroactive approval
 * 
 * @param userRole - User role
 * @param requiresHigherApproval - Whether higher approval is required
 * @returns Whether user has authority
 */
export function hasRetroactiveApprovalAuthority(
  userRole: string,
  requiresHigherApproval: boolean
): boolean {
  const normalizedRole = userRole?.toUpperCase()

  // If higher approval required, only HR Director or Chief Director can approve
  if (requiresHigherApproval) {
    return (
      normalizedRole === 'HR_DIRECTOR' ||
      normalizedRole === 'CHIEF_DIRECTOR' ||
      userRole === 'hr_director' ||
      userRole === 'chief_director'
    )
  }

  // For regular retroactive approvals, HR roles and Directors can approve
  return (
    normalizedRole === 'HR_OFFICER' ||
    normalizedRole === 'HR_DIRECTOR' ||
    normalizedRole === 'DIRECTOR' ||
    normalizedRole === 'CHIEF_DIRECTOR' ||
    userRole === 'hr' ||
    userRole === 'hr_director' ||
    userRole === 'director' ||
    userRole === 'chief_director'
  )
}

