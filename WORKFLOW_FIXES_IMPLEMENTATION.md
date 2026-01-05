# Workflow Enforcement Gaps - Implementation Fixes

This document provides specific code fixes for identified workflow enforcement gaps.

---

## Fix 1: Implement Resubmission Workflow

### 1.1 Database Schema Update

**File**: `prisma/schema.prisma`

```prisma
model LeaveRequest {
  // ... existing fields
  resubmittedFromId String? // Link to original rejected request
  resubmissionCount Int @default(0) // Track resubmission attempts
  
  // Relation
  resubmittedFrom LeaveRequest? @relation("Resubmissions", fields: [resubmittedFromId], references: [id])
  resubmissions LeaveRequest[] @relation("Resubmissions")
}
```

### 1.2 API Endpoint

**File**: `app/api/leaves/[id]/resubmit/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { createApprovalSteps } from '@/lib/ghana-civil-service-approval-workflow-db'
import { determineCivilServiceApprovalWorkflow } from '@/lib/ghana-civil-service-approval-workflow'
import { logComprehensiveAudit } from '@/lib/comprehensive-audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Get original rejected leave request
      const originalLeave = await prisma.leaveRequest.findUnique({
        where: { id },
        include: {
          staff: true,
        },
      })

      if (!originalLeave) {
        return NextResponse.json(
          { error: 'Leave request not found' },
          { status: 404 }
        )
      }

      // Verify it's rejected
      if (originalLeave.status !== 'rejected') {
        return NextResponse.json(
          { error: 'Only rejected leave requests can be resubmitted' },
          { status: 400 }
        )
      }

      // Verify user owns this leave request
      if (user.staffId !== originalLeave.staffId) {
        return NextResponse.json(
          { error: 'You can only resubmit your own leave requests' },
          { status: 403 }
        )
      }

      // Get staff info for workflow determination
      const staffInfo = {
        staffId: originalLeave.staff.staffId,
        dutyStation: originalLeave.staff.dutyStation as 'HQ' | 'Region' | 'District' | 'Agency' | null,
        directorate: originalLeave.staff.directorate,
        division: originalLeave.staff.division,
        unit: originalLeave.staff.unit,
        immediateSupervisorId: originalLeave.staff.immediateSupervisorId,
        managerId: originalLeave.staff.managerId,
        grade: originalLeave.staff.grade || '',
        position: originalLeave.staff.position || '',
      }

      // Determine approval workflow
      const approvalLevels = await determineCivilServiceApprovalWorkflow(
        staffInfo,
        originalLeave.leaveType,
        originalLeave.days
      )

      // Create new leave request (resubmission)
      const resubmittedLeave = await prisma.leaveRequest.create({
        data: {
          staffId: originalLeave.staffId,
          staffName: originalLeave.staffName,
          leaveType: originalLeave.leaveType,
          startDate: originalLeave.startDate,
          endDate: originalLeave.endDate,
          days: originalLeave.days,
          reason: originalLeave.reason,
          status: 'pending',
          resubmittedFromId: id,
          resubmissionCount: originalLeave.resubmissionCount + 1,
          officerTakingOver: originalLeave.officerTakingOver,
          handoverNotes: originalLeave.handoverNotes,
          declarationAccepted: originalLeave.declarationAccepted,
          requiresExternalClearance: originalLeave.requiresExternalClearance,
          externalClearanceStatus: originalLeave.externalClearanceStatus,
          pscReferenceNumber: originalLeave.pscReferenceNumber,
          ohcsReferenceNumber: originalLeave.ohcsReferenceNumber,
          externalClearanceDate: originalLeave.externalClearanceDate,
          payrollImpactFlag: originalLeave.payrollImpactFlag,
        },
      })

      // Create approval steps
      await createApprovalSteps(resubmittedLeave.id, approvalLevels)

      // Update approvalLevels JSON for backward compatibility
      await prisma.leaveRequest.update({
        where: { id: resubmittedLeave.id },
        data: {
          approvalLevels: approvalLevels as any,
        },
      })

      // Audit log
      await logComprehensiveAudit({
        action: 'leave_resubmitted',
        userId: user.id,
        userRole: user.role,
        userEmail: user.email,
        staffId: originalLeave.staffId,
        leaveRequestId: resubmittedLeave.id,
        details: `Leave request resubmitted from rejected request ${id}. Resubmission count: ${resubmittedLeave.resubmissionCount}`,
        metadata: {
          originalLeaveId: id,
          resubmissionCount: resubmittedLeave.resubmissionCount,
        },
        ip: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      })

      return NextResponse.json({
        success: true,
        leaveRequest: resubmittedLeave,
        message: 'Leave request resubmitted successfully',
      })
    } catch (error: any) {
      console.error('Error resubmitting leave:', error)
      return NextResponse.json(
        { error: 'Failed to resubmit leave request', details: error.message },
        { status: 500 }
      )
    }
  })(request)
}
```

### 1.3 UI Update

**File**: `components/employee-leave-history.tsx`

Add resubmit button for rejected leaves:

```typescript
{leave.status === 'rejected' && (
  <Button
    variant="outline"
    onClick={() => handleResubmit(leave.id)}
    disabled={leave.resubmissionCount >= 3} // Limit resubmissions
  >
    {leave.resubmissionCount >= 3
      ? 'Max resubmissions reached'
      : 'Resubmit Leave Request'}
  </Button>
)}
```

---

## Fix 2: Bulk Approval Validation

### 2.1 Updated Bulk Approval Route

**File**: `app/api/leaves/bulk/route.ts`

Replace existing bulk approval logic with validated version:

```typescript
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      const body = await request.json()
      const { leaveIds, action, comments, level } = body

      if (!leaveIds || !Array.isArray(leaveIds) || leaveIds.length === 0) {
        return NextResponse.json(
          { error: 'Leave IDs array is required' },
          { status: 400 }
        )
      }

      if (!['approved', 'rejected'].includes(action)) {
        return NextResponse.json(
          { error: 'Action must be approved or rejected' },
          { status: 400 }
        )
      }

      const results = {
        success: [] as string[],
        failed: [] as Array<{ leaveId: string; error: string }>,
      }

      // Get RBAC context once
      const rbacContext = await getUserRBACContext(user)
      if (!rbacContext) {
        return NextResponse.json(
          { error: 'Unable to verify user permissions' },
          { status: 500 }
        )
      }

      // Process each leave request with full validation
      for (const leaveId of leaveIds) {
        try {
          // Get leave request
          const leave = await prisma.leaveRequest.findUnique({
            where: { id: leaveId },
            include: {
              staff: true,
              approvalSteps: {
                orderBy: { level: 'asc' },
              },
            },
          })

          if (!leave) {
            results.failed.push({ leaveId, error: 'Leave request not found' })
            continue
          }

          // Validate approval permission (same as individual approval)
          const approvalPermission = await canApproveLeaveRequest(
            rbacContext,
            leaveId,
            level
          )

          if (!approvalPermission.allowed) {
            results.failed.push({
              leaveId,
              error: approvalPermission.reason || 'Permission denied',
            })
            continue
          }

          // Validate balance if approving
          if (action === 'approved') {
            const balanceValidation = await validateLeaveBalance(
              leave.staffId,
              leave.leaveType,
              leave.days
            )

            if (!balanceValidation.valid) {
              results.failed.push({
                leaveId,
                error: balanceValidation.error || 'Insufficient balance',
              })
              continue
            }
          }

          // Validate rejection comments
          if (action === 'rejected') {
            if (!comments || comments.trim().length < 10) {
              results.failed.push({
                leaveId,
                error: 'Rejection comments are required and must be at least 10 characters',
              })
              continue
            }
          }

          // Use same approval logic as individual route
          const approverStaff = await prisma.staffMember.findUnique({
            where: { staffId: user.staffId || '' },
            select: { firstName: true, lastName: true },
          })
          const approverName = approverStaff
            ? `${approverStaff.firstName} ${approverStaff.lastName}`
            : user.email || 'Unknown'

          // Update approval step
          if (leave.approvalSteps && leave.approvalSteps.length > 0 && level !== undefined) {
            const stepStatus: 'approved' | 'rejected' =
              action === 'approved' ? 'approved' : 'rejected'
            
            await updateApprovalStep(
              leaveId,
              level,
              stepStatus,
              user.id,
              approverName,
              comments
            )

            // Recalculate status
            const updatedSteps = await getApprovalSteps(leaveId)
            const stepStatuses = updatedSteps.map((s) => s.status)

            let newStatus = leave.status
            if (stepStatuses.some((s) => s === 'rejected')) {
              newStatus = 'rejected'
            } else if (stepStatuses.every((s) => s === 'approved' || s === 'skipped')) {
              newStatus = 'approved'
            } else {
              newStatus = 'pending'
            }

            // Update leave request
            await prisma.leaveRequest.update({
              where: { id: leaveId },
              data: {
                status: newStatus,
                approvedBy: action === 'approved' ? approverName : leave.approvedBy,
                approvalDate: action !== 'pending' ? new Date() : leave.approvalDate,
                locked: newStatus === 'approved' ? true : leave.locked,
              },
            })

            // Deduct balance if newly approved
            if (newStatus === 'approved' && leave.status !== 'approved') {
              await deductLeaveBalance(leave.staffId, leave.leaveType, leave.days)
              await logBalanceDeduction({
                staffId: leave.staffId,
                leaveType: leave.leaveType,
                days: leave.days,
                balanceBefore: 0, // Calculate if needed
                balanceAfter: 0, // Calculate if needed
                leaveRequestId: leaveId,
                userId: user.id,
                userRole: user.role,
              })
            }
          } else {
            // Fallback to legacy JSON approvalLevels
            results.failed.push({
              leaveId,
              error: 'Approval steps not found, cannot process bulk approval',
            })
            continue
          }

          // Audit log
          if (action === 'approved') {
            await logLeaveApproval({
              leaveRequestId: leaveId,
              level: level || 1,
              approverId: user.id,
              approverName,
              approverRole: user.role,
              approverStaffId: user.staffId || undefined,
              comments,
              ip: request.headers.get('x-forwarded-for') || undefined,
              userAgent: request.headers.get('user-agent') || undefined,
            })
          } else {
            await logLeaveRejection({
              leaveRequestId: leaveId,
              level: level || 1,
              approverId: user.id,
              approverName,
              approverRole: user.role,
              approverStaffId: user.staffId || undefined,
              comments: comments || '',
              ip: request.headers.get('x-forwarded-for') || undefined,
              userAgent: request.headers.get('user-agent') || undefined,
            })
          }

          // Notify employee
          await notifyLeaveDecision({
            leaveRequestId: leaveId,
            staffId: leave.staffId,
            staffName: leave.staffName,
            leaveType: leave.leaveType,
            days: leave.days,
            status: action as 'approved' | 'rejected',
            approverName,
            comments,
          })

          results.success.push(leaveId)
        } catch (error: any) {
          results.failed.push({ leaveId, error: error.message || 'Unknown error' })
        }
      }

      return NextResponse.json({
        success: true,
        processed: results.success.length,
        failed: results.failed.length,
        results,
      })
    } catch (error: any) {
      console.error('Error performing bulk operation:', error)
      return NextResponse.json(
        { error: 'Failed to process bulk operation', details: error.message },
        { status: 500 }
      )
    }
  })(request)
}
```

**Required Imports**:
```typescript
import { getUserRBACContext, canApproveLeaveRequest } from '@/lib/roles'
import { validateLeaveBalance, deductLeaveBalance } from '@/lib/leave-balance-utils'
import { updateApprovalStep, getApprovalSteps } from '@/lib/ghana-civil-service-approval-workflow-db'
import { logLeaveApproval, logLeaveRejection, logBalanceDeduction } from '@/lib/audit-logger'
import { notifyLeaveDecision } from '@/lib/notification-service'
```

---

## Fix 3: Desktop Client Offline Validation

### 3.1 Desktop API Wrapper

**File**: `lib/api/desktop-api.ts`

Add offline check for approval actions:

```typescript
leaveRequests: {
  // ... existing methods
  
  approve: async (leaveId: string, level: number, comments?: string) => {
    // Check if online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Approval requires online connection. Please connect to the internet and try again.')
    }
    
    // Use web API endpoint
    const response = await fetch(`/api/leaves/${leaveId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'approved',
        level,
        comments,
      }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to approve leave request')
    }
    
    return response.json()
  },
  
  reject: async (leaveId: string, level: number, comments: string) => {
    // Check if online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Rejection requires online connection. Please connect to the internet and try again.')
    }
    
    // Validate comments
    if (!comments || comments.trim().length < 10) {
      throw new Error('Rejection comments are required and must be at least 10 characters')
    }
    
    // Use web API endpoint
    const response = await fetch(`/api/leaves/${leaveId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'rejected',
        level,
        comments,
      }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to reject leave request')
    }
    
    return response.json()
  },
}
```

### 3.2 UI Component Update

**File**: `components/leave-management.tsx` (or desktop-specific component)

```typescript
const handleApprove = async (leaveId: string, level: number, comments?: string) => {
  // Check online status
  if (!navigator.onLine) {
    toast.error('Approval requires online connection')
    return
  }
  
  try {
    await desktopAPI.leaveRequests.approve(leaveId, level, comments)
    toast.success('Leave request approved')
    // Refresh data
  } catch (error: any) {
    toast.error(error.message || 'Failed to approve leave request')
  }
}
```

---

## Fix 4: State Transition Validation Layer

### 4.1 State Machine Validator

**File**: `lib/workflow-state-validator.ts`

```typescript
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
]

const VALID_STEP_TRANSITIONS: Transition[] = [
  { from: 'pending', to: 'approved', condition: 'Approver approves' },
  { from: 'pending', to: 'rejected', condition: 'Approver rejects' },
  { from: 'pending', to: 'delegated', condition: 'Approver delegates' },
  { from: 'pending', to: 'skipped', condition: 'Escalation or auto-skip' },
  { from: 'delegated', to: 'approved', condition: 'Delegate approves' },
]

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
      reason: `Invalid transition from ${from} to ${to}`,
    }
  }

  return { valid: true }
}

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
      reason: `Invalid transition from ${from} to ${to}`,
    }
  }

  return { valid: true }
}

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
```

### 4.2 Integration in API Route

**File**: `app/api/leaves/[id]/route.ts`

Add validation at the start of PATCH handler:

```typescript
import { validateWorkflowTransition } from '@/lib/workflow-state-validator'

// In PATCH handler, after getting leave:
const transitionValidation = validateWorkflowTransition(
  leave.status as any,
  body.status as any,
  currentStep?.status as any,
  body.status as any
)

if (!transitionValidation.valid) {
  return NextResponse.json(
    {
      error: 'Invalid workflow transition',
      errors: transitionValidation.errors,
      errorCode: 'INVALID_TRANSITION',
    },
    { status: 400 }
  )
}
```

---

## Implementation Checklist

- [ ] **Fix 1: Resubmission Workflow**
  - [ ] Update Prisma schema
  - [ ] Run migration
  - [ ] Create resubmit API endpoint
  - [ ] Update UI components
  - [ ] Test resubmission flow

- [ ] **Fix 2: Bulk Approval Validation**
  - [ ] Update bulk approval route
  - [ ] Add all required imports
  - [ ] Test bulk approval with validations
  - [ ] Test error handling

- [ ] **Fix 3: Desktop Offline Validation**
  - [ ] Update desktop API wrapper
  - [ ] Add offline checks
  - [ ] Update UI components
  - [ ] Test offline behavior

- [ ] **Fix 4: State Transition Validation**
  - [ ] Create state validator
  - [ ] Integrate in API routes
  - [ ] Test invalid transitions
  - [ ] Update error messages

---

## Testing Requirements

1. **Resubmission Testing**:
   - Reject a leave request
   - Verify resubmit button appears
   - Resubmit and verify new request created
   - Verify link to original request
   - Test resubmission limit (max 3)

2. **Bulk Approval Testing**:
   - Select multiple leave requests
   - Verify each request validated individually
   - Test with insufficient balance
   - Test with wrong role
   - Test with incomplete previous levels

3. **Desktop Offline Testing**:
   - Disconnect network
   - Attempt approval
   - Verify error message
   - Reconnect and verify approval works

4. **State Transition Testing**:
   - Attempt invalid transitions
   - Verify error messages
   - Test all valid transitions
   - Verify locked records cannot transition

---

**Priority**: High  
**Estimated Effort**: 2-3 days  
**Risk**: Low (additive changes, no breaking modifications)

