/**
 * MoFA RBAC Middleware
 * 
 * Implements role-based access control with unit-based scoping for:
 * - Sequential approval enforcement
 * - Self-approval prevention
 * - Unit/directorate/region-based access control
 * - Hierarchy verification
 * - Audit-ready access logging
 * 
 * Compliance: PSC/OHCS/Labour Act standards
 */

import { prisma } from '@/lib/prisma'
import { type UserRole, hasPermission } from '@/lib/permissions'
import { mapToMoFARole } from '@/lib/role-mapping'
import type { AuthUser } from '@/lib/auth-proxy'

export interface RBACContext {
  user: AuthUser
  staffId?: string
  unit?: string | null
  directorate?: string | null
  dutyStation?: string | null
  role: UserRole
}

export interface ApprovalCheckResult {
  allowed: boolean
  reason?: string
  errorCode?: string
}

/**
 * Get user's organizational context for RBAC checks
 */
export async function getUserRBACContext(user: AuthUser): Promise<RBACContext | null> {
  try {
    const normalizedRole = mapToMoFARole(user.role)
    
    // Get staff member info if staffId exists
    let staffInfo = null
    if (user.staffId) {
      staffInfo = await prisma.staffMember.findUnique({
        where: { staffId: user.staffId },
        select: {
          staffId: true,
          unit: true,
          directorate: true,
          division: true,
          dutyStation: true,
        },
      })
    }

    return {
      user,
      staffId: user.staffId || undefined,
      unit: staffInfo?.unit || null,
      directorate: staffInfo?.directorate || null,
      dutyStation: (staffInfo?.dutyStation as 'HQ' | 'Region' | 'District' | 'Agency') || null,
      role: normalizedRole,
    }
  } catch (error) {
    console.error('[RBAC] Error getting user context:', error)
    return null
  }
}

/**
 * Check if user can view leave requests based on role and organizational scope
 */
export async function canViewLeaveRequest(
  context: RBACContext,
  leaveRequestId: string
): Promise<ApprovalCheckResult> {
  try {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        staff: {
          select: {
            staffId: true,
            unit: true,
            directorate: true,
            division: true,
            dutyStation: true,
            immediateSupervisorId: true,
            managerId: true,
          },
        },
      },
    })

    if (!leave) {
      return { allowed: false, reason: 'Leave request not found', errorCode: 'LEAVE_NOT_FOUND' }
    }

    const role = context.role

    // AUDITOR: Read-only access to all
    if (role === 'AUDITOR' || role === 'internal_auditor') {
      return { allowed: true }
    }

    // EMPLOYEE: Can only view own leaves
    if (role === 'EMPLOYEE' || role === 'employee') {
      if (leave.staffId === context.staffId) {
        return { allowed: true }
      }
      return {
        allowed: false,
        reason: 'Employees can only view their own leave requests',
        errorCode: 'ACCESS_DENIED',
      }
    }

    // HR roles: Can view all
    if (
      role === 'HR_OFFICER' ||
      role === 'HR_DIRECTOR' ||
      role === 'CHIEF_DIRECTOR' ||
      role === 'hr' ||
      role === 'hr_officer' ||
      role === 'hr_director' ||
      role === 'chief_director'
    ) {
      return { allowed: true }
    }

    // SYS_ADMIN: Can view all
    if (role === 'SYS_ADMIN' || role === 'admin') {
      return { allowed: true }
    }

    // Manager/Supervisor roles: Unit-based scoping
    if (
      role === 'SUPERVISOR' ||
      role === 'UNIT_HEAD' ||
      role === 'DIVISION_HEAD' ||
      role === 'DIRECTOR' ||
      role === 'REGIONAL_MANAGER' ||
      role === 'supervisor' ||
      role === 'unit_head' ||
      role === 'division_head' ||
      role === 'directorate_head' ||
      role === 'regional_manager' ||
      role === 'manager' ||
      role === 'deputy_director'
    ) {
      // Check if user is in the approval chain
      const isInApprovalChain = await isUserInApprovalChain(context, leaveRequestId)
      if (isInApprovalChain) {
        return { allowed: true }
      }

      // Check unit/directorate scope
      if (role === 'SUPERVISOR' || role === 'supervisor' || role === 'manager') {
        // Supervisor: Can view direct reports
        if (context.staffId && leave.staff.immediateSupervisorId === context.staffId) {
          return { allowed: true }
        }
        if (context.staffId && leave.staff.managerId === context.staffId) {
          return { allowed: true }
        }
      }

      if (role === 'UNIT_HEAD' || role === 'unit_head') {
        // Unit Head: Can view same unit
        if (context.unit && leave.staff.unit === context.unit) {
          return { allowed: true }
        }
      }

      if (role === 'DIVISION_HEAD' || role === 'division_head') {
        // Division Head: Can view same division
        if (context.directorate && leave.staff.directorate === context.directorate) {
          return { allowed: true }
        }
      }

      if (role === 'DIRECTOR' || role === 'directorate_head' || role === 'deputy_director') {
        // Director: Can view same directorate
        if (context.directorate && leave.staff.directorate === context.directorate) {
          return { allowed: true }
        }
      }

      if (role === 'REGIONAL_MANAGER' || role === 'regional_manager') {
        // Regional Manager: Can view regional/district staff
        if (
          context.dutyStation &&
          (context.dutyStation === 'Region' || context.dutyStation === 'District') &&
          (leave.staff.dutyStation === 'Region' || leave.staff.dutyStation === 'District')
        ) {
          return { allowed: true }
        }
      }

      return {
        allowed: false,
        reason: 'You do not have permission to view this leave request',
        errorCode: 'ACCESS_DENIED',
      }
    }

    return {
      allowed: false,
      reason: 'Unknown role or insufficient permissions',
      errorCode: 'ACCESS_DENIED',
    }
  } catch (error) {
    console.error('[RBAC] Error checking view permission:', error)
    return {
      allowed: false,
      reason: 'Error checking permissions',
      errorCode: 'SYSTEM_ERROR',
    }
  }
}

/**
 * Check if user can approve/reject a leave request
 * Enforces:
 * - Sequential approval (cannot skip levels)
 * - Self-approval prevention
 * - Role-based hierarchy
 * - Unit-based scoping
 */
export async function canApproveLeaveRequest(
  context: RBACContext,
  leaveRequestId: string,
  level?: number
): Promise<ApprovalCheckResult> {
  try {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        staff: {
          select: {
            staffId: true,
            unit: true,
            directorate: true,
            division: true,
            dutyStation: true,
            immediateSupervisorId: true,
            managerId: true,
          },
        },
        approvalSteps: {
          orderBy: { level: 'asc' },
        },
      },
    })

    if (!leave) {
      return { allowed: false, reason: 'Leave request not found', errorCode: 'LEAVE_NOT_FOUND' }
    }

    // AUDITOR: Read-only, cannot approve
    if (context.role === 'AUDITOR' || context.role === 'internal_auditor') {
      return {
        allowed: false,
        reason: 'Auditors have read-only access and cannot approve leave requests',
        errorCode: 'READ_ONLY_ROLE',
      }
    }

    // SYS_ADMIN, SYSTEM_ADMIN, SECURITY_ADMIN: Cannot approve leaves (system management only)
    // Ghana Government Compliance: System admins cannot approve leave (segregation of duties)
    if (
      context.role === 'SYS_ADMIN' ||
      context.role === 'SYSTEM_ADMIN' ||
      context.role === 'SECURITY_ADMIN' ||
      context.role === 'admin'
    ) {
      return {
        allowed: false,
        reason: 'System administrators cannot approve leave requests (segregation of duties)',
        errorCode: 'ROLE_NOT_AUTHORIZED',
      }
    }

    // EMPLOYEE: Cannot approve (including own)
    if (context.role === 'EMPLOYEE' || context.role === 'employee') {
      return {
        allowed: false,
        reason: 'Employees cannot approve leave requests',
        errorCode: 'ROLE_NOT_AUTHORIZED',
      }
    }

    // Self-approval prevention
    if (context.staffId && leave.staffId === context.staffId) {
      return {
        allowed: false,
        reason: 'You cannot approve your own leave request',
        errorCode: 'SELF_APPROVAL_NOT_ALLOWED',
      }
    }

    // Check if leave is already finalized
    if (leave.status === 'approved' && leave.locked) {
      return {
        allowed: false,
        reason: 'This leave request has been finalized and cannot be modified',
        errorCode: 'LEAVE_LOCKED',
      }
    }

    // Get approval steps
    const approvalSteps = leave.approvalSteps || []
    if (approvalSteps.length === 0) {
      // Fallback to JSON approvalLevels if ApprovalSteps not created
      const approvalLevels = (leave.approvalLevels as any[]) || []
      if (approvalLevels.length === 0) {
        return {
          allowed: false,
          reason: 'No approval workflow defined for this leave request',
          errorCode: 'NO_WORKFLOW',
        }
      }

      // Use JSON approvalLevels for now (legacy support)
      return await canApproveUsingLegacyLevels(context, leave, approvalLevels, level)
    }

    // Find the current pending step
    const pendingSteps = approvalSteps.filter((s) => s.status === 'pending')
    if (pendingSteps.length === 0) {
      return {
        allowed: false,
        reason: 'No pending approval steps for this leave request',
        errorCode: 'NO_PENDING_STEPS',
      }
    }

    const currentStep = pendingSteps.sort((a, b) => a.level - b.level)[0]

    // Check if previous levels are complete (sequential enforcement)
    const previousSteps = approvalSteps.filter((s) => s.level < currentStep.level)
    const allPreviousComplete = previousSteps.every(
      (s) => s.status === 'approved' || s.status === 'skipped'
    )

    if (!allPreviousComplete && previousSteps.length > 0) {
      return {
        allowed: false,
        reason: 'Previous approval levels must be completed before this level can be approved',
        errorCode: 'SEQUENTIAL_APPROVAL_REQUIRED',
      }
    }

    // Check if user's role matches the required role for this step
    if (currentStep.approverRole !== context.role) {
      return {
        allowed: false,
        reason: `This step requires ${currentStep.approverRole} role, but you have ${context.role}`,
        errorCode: 'ROLE_MISMATCH',
      }
    }

    // Check if specific approver is assigned and matches
    if (currentStep.approverStaffId && context.staffId !== currentStep.approverStaffId) {
      return {
        allowed: false,
        reason: 'You are not the assigned approver for this step',
        errorCode: 'NOT_ASSIGNED_APPROVER',
      }
    }

    // Unit-based scoping for manager roles
    if (
      context.role === 'SUPERVISOR' ||
      context.role === 'UNIT_HEAD' ||
      context.role === 'DIVISION_HEAD' ||
      context.role === 'DIRECTOR'
    ) {
      const scopeCheck = await checkUnitScope(context, leave.staff)
      if (!scopeCheck.allowed) {
        return scopeCheck
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('[RBAC] Error checking approval permission:', error)
    return {
      allowed: false,
      reason: 'Error checking approval permissions',
      errorCode: 'SYSTEM_ERROR',
    }
  }
}

/**
 * Check unit-based scope for manager roles
 */
async function checkUnitScope(
  context: RBACContext,
  staffInfo: {
    unit?: string | null
    directorate?: string | null
    division?: string | null
    dutyStation?: string | null
    immediateSupervisorId?: string | null
    managerId?: string | null
  }
): Promise<ApprovalCheckResult> {
  if (context.role === 'SUPERVISOR' || context.role === 'supervisor') {
    // Supervisor: Must be the immediate supervisor
    if (context.staffId && staffInfo.immediateSupervisorId === context.staffId) {
      return { allowed: true }
    }
    if (context.staffId && staffInfo.managerId === context.staffId) {
      return { allowed: true }
    }
    return {
      allowed: false,
      reason: 'You are not the assigned supervisor for this staff member',
      errorCode: 'NOT_SUPERVISOR',
    }
  }

  if (context.role === 'UNIT_HEAD' || context.role === 'unit_head') {
    // Unit Head: Must be in same unit
    if (context.unit && staffInfo.unit === context.unit) {
      return { allowed: true }
    }
    return {
      allowed: false,
      reason: 'This leave request is not from your unit',
      errorCode: 'UNIT_MISMATCH',
    }
  }

  if (context.role === 'DIVISION_HEAD' || context.role === 'division_head') {
    // Division Head: Must be in same division
    if (context.directorate && staffInfo.directorate === context.directorate) {
      return { allowed: true }
    }
    return {
      allowed: false,
      reason: 'This leave request is not from your division',
      errorCode: 'DIVISION_MISMATCH',
    }
  }

  if (context.role === 'DIRECTOR' || context.role === 'directorate_head') {
    // Director: Must be in same directorate
    if (context.directorate && staffInfo.directorate === context.directorate) {
      return { allowed: true }
    }
    return {
      allowed: false,
      reason: 'This leave request is not from your directorate',
      errorCode: 'DIRECTORATE_MISMATCH',
    }
  }

  return { allowed: true }
}

/**
 * Legacy support: Check approval using JSON approvalLevels
 */
async function canApproveUsingLegacyLevels(
  context: RBACContext,
  leave: any,
  approvalLevels: any[],
  level?: number
): Promise<ApprovalCheckResult> {
  // Find pending levels
  const pendingLevels = approvalLevels.filter((l) => l.status === 'pending')
  if (pendingLevels.length === 0) {
    return {
      allowed: false,
      reason: 'No pending approval levels',
      errorCode: 'NO_PENDING_LEVELS',
    }
  }

  const currentLevel = level
    ? approvalLevels.find((l) => l.level === level)
    : pendingLevels.sort((a, b) => a.level - b.level)[0]

  if (!currentLevel) {
    return {
      allowed: false,
      reason: 'Approval level not found',
      errorCode: 'LEVEL_NOT_FOUND',
    }
  }

  // Check sequential approval
  const previousLevels = approvalLevels.filter((l) => l.level < currentLevel.level)
  const allPreviousApproved = previousLevels.every((l) => l.status === 'approved')

  if (!allPreviousApproved && previousLevels.length > 0) {
    return {
      allowed: false,
      reason: 'Previous approval levels must be completed first',
      errorCode: 'SEQUENTIAL_APPROVAL_REQUIRED',
    }
  }

  // Check role match
  if (currentLevel.approverRole !== context.role) {
    return {
      allowed: false,
      reason: `This level requires ${currentLevel.approverRole} role`,
      errorCode: 'ROLE_MISMATCH',
    }
  }

  return { allowed: true }
}

/**
 * Check if user is in the approval chain for a leave request
 */
async function isUserInApprovalChain(
  context: RBACContext,
  leaveRequestId: string
): Promise<boolean> {
  try {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        approvalSteps: true,
      },
    })

    if (!leave) return false

    // Check approval steps
    if (leave.approvalSteps && leave.approvalSteps.length > 0) {
      const isInSteps = leave.approvalSteps.some(
        (step) =>
          step.approverRole === context.role ||
          (step.approverStaffId === context.staffId && context.staffId)
      )
      if (isInSteps) return true
    }

    // Check legacy approvalLevels
    const approvalLevels = (leave.approvalLevels as any[]) || []
    if (approvalLevels.length > 0) {
      const isInLevels = approvalLevels.some(
        (level) =>
          level.approverRole === context.role ||
          (level.approverStaffId === context.staffId && context.staffId)
      )
      if (isInLevels) return true
    }

    return false
  } catch (error) {
    console.error('[RBAC] Error checking approval chain:', error)
    return false
  }
}

/**
 * Check if user can create leave requests
 */
export async function canCreateLeaveRequest(
  context: RBACContext,
  targetStaffId: string
): Promise<ApprovalCheckResult> {
  // EMPLOYEE: Can only create for themselves
  if (context.role === 'EMPLOYEE' || context.role === 'employee') {
    if (context.staffId === targetStaffId) {
      return { allowed: true }
    }
    return {
      allowed: false,
      reason: 'Employees can only create leave requests for themselves',
      errorCode: 'SELF_ONLY',
    }
  }

  // HR roles: Can create for any staff
  if (
    hasPermission(context.role, 'leave:create') ||
    context.role === 'HR_OFFICER' ||
    context.role === 'HR_DIRECTOR' ||
    context.role === 'hr' ||
    context.role === 'hr_officer' ||
    context.role === 'hr_director'
  ) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: 'You do not have permission to create leave requests',
    errorCode: 'PERMISSION_DENIED',
  }
}

