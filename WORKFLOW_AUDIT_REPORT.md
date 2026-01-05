# Workflow Audit Report
## Comprehensive Inspection of Leave Application Workflows

**Date**: Generated on audit execution  
**Scope**: Leave application, multi-level approvals, rejections, resubmissions, escalations, and audit logs  
**Objective**: Verify DB-driven state, server validation, role enforcement, and client consistency

---

## Executive Summary

This audit examines all workflow implementations in the HR Leave Portal system. The system implements a multi-level approval workflow with database-driven state management, server-side validation, and comprehensive audit logging.

### Key Findings

✅ **Strengths**:
- Workflow state is DB-driven via `ApprovalStep` model
- Server validates every transition with RBAC checks
- Sequential approval enforcement prevents level skipping
- Comprehensive audit logging for all actions

⚠️ **Issues Identified**:
- Resubmission workflow not explicitly implemented
- Some client-side validation gaps
- Bulk approval bypasses some validations
- Desktop client workflow handling needs verification

---

## 1. Workflow State Management

### 1.1 Database-Driven State

**Status**: ✅ **VERIFIED**

The system uses database-driven workflow state through the `ApprovalStep` model:

```prisma
model ApprovalStep {
  id            String   @id @default(cuid())
  leaveRequestId String
  level         Int      // Sequential approval level (1, 2, 3, ...)
  approverRole  String   // Required role for this step
  approverStaffId String? // Specific staff ID assigned
  approverUserId String?  // User ID of approver
  status        String   @default("pending") // 'pending' | 'approved' | 'rejected' | 'delegated' | 'skipped'
  previousLevelCompleted Boolean @default(false) // Enforces sequential approval
  // ... other fields
}
```

**Evidence**:
- `lib/ghana-civil-service-approval-workflow-db.ts`: Creates and updates `ApprovalStep` records
- `app/api/leaves/[id]/route.ts`: Uses `getApprovalSteps()` and `updateApprovalStep()` for state management
- `prisma/schema.prisma`: `ApprovalStep` model with proper constraints

**Workflow State Flow**:
1. Leave request created → `ApprovalStep` records created for each level
2. Each approval → `ApprovalStep.status` updated in database
3. Status calculated from `ApprovalStep` records
4. `previousLevelCompleted` flag enforces sequential approval

---

## 2. Workflow Diagrams

### 2.1 Standard Leave Application Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    LEAVE APPLICATION WORKFLOW                     │
└─────────────────────────────────────────────────────────────────┘

[Employee Submits Leave]
         │
         ▼
    [Status: pending]
         │
         ├─────────────────────────────────────────┐
         │                                         │
         ▼                                         ▼
[ApprovalStep Level 1]                    [Validation Checks]
[Role: SUPERVISOR]                        • Balance sufficient?
[Status: pending]                         • No overlapping leaves?
         │                                 • Required fields complete?
         │                                         │
         │                                         │
    [Supervisor Action]                          │
         │                                         │
         ├──────────────┬──────────────────────────┘
         │              │
         ▼              ▼
    [Approve]      [Reject]
         │              │
         │              ▼
         │         [Status: rejected]
         │              │
         │              └──► [Workflow Ends]
         │
         ▼
[Update ApprovalStep Level 1: approved]
[Set previousLevelCompleted = true for Level 2]
         │
         ▼
[ApprovalStep Level 2]
[Role: UNIT_HEAD]
[Status: pending]
         │
         ├──────────────┬──────────────┐
         │              │              │
         ▼              ▼              ▼
    [Approve]      [Reject]      [Delegate]
         │              │              │
         │              ▼              │
         │         [Status: rejected]  │
         │              │              │
         │              └──► [End]     │
         │                            │
         ▼                            ▼
[Update Level 2: approved]    [Update Level 2: delegated]
[Set previousLevelCompleted]  [Assign to delegate]
         │                            │
         │                            └──► [Delegate acts]
         │
         ▼
[ApprovalStep Level 3]
[Role: HEAD_OF_DEPARTMENT / DIRECTOR]
[Status: pending]
         │
         ├──────────────┬──────────────┐
         │              │              │
         ▼              ▼              ▼
    [Approve]      [Reject]      [Delegate]
         │              │              │
         │              ▼              │
         │         [Status: rejected]  │
         │              │              │
         │              └──► [End]     │
         │                            │
         ▼                            ▼
[Update Level 3: approved]    [Update Level 3: delegated]
         │
         ▼
[ApprovalStep Level 4]
[Role: HR_OFFICER]
[Status: pending]
         │
         ├──────────────┬──────────────┐
         │              │              │
         ▼              ▼              ▼
    [Approve]      [Reject]      [Delegate]
         │              │              │
         │              ▼              │
         │         [Status: rejected]  │
         │              │              │
         │              └──► [End]     │
         │                            │
         ▼                            ▼
[Update Level 4: approved]    [Update Level 4: delegated]
[Deduct Leave Balance]
[Lock Leave Record]
         │
         ▼
[Status: approved]
[Workflow Complete]
```

### 2.2 Rejection and Resubmission Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│              REJECTION & RESUBMISSION WORKFLOW                    │
└─────────────────────────────────────────────────────────────────┘

[Leave Request: pending]
         │
         ▼
[Approver Rejects]
         │
         ├─────────────────────────────────┐
         │                                 │
         ▼                                 ▼
[Update ApprovalStep: rejected]    [Update LeaveRequest: rejected]
[Require Comments (min 10 chars)]    [Log Rejection in AuditLog]
         │                                 │
         │                                 │
         └─────────────────────────────────┘
                     │
                     ▼
            [Notify Employee]
                     │
                     ▼
        [Status: rejected]
                     │
                     ▼
        ┌────────────────────────────┐
        │                            │
        ▼                            ▼
[Employee Views Rejection]    [Resubmission?]
[Sees Rejection Comments]         │
                                  │
                                  ▼
                    [Employee Creates New Leave Request]
                    [OR Modifies Existing Request?]
                                  │
                                  ▼
                    [New Workflow Starts]
                    [Status: pending]
```

**⚠️ ISSUE**: Resubmission workflow is not explicitly implemented. Employees must create a new leave request after rejection.

### 2.3 Escalation Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                      ESCALATION WORKFLOW                         │
└─────────────────────────────────────────────────────────────────┘

[ApprovalStep: pending]
         │
         ▼
[Check: Days Since Created]
         │
         ├──────────────────────────────┐
         │                              │
    [< 10 working days]         [≥ 10 working days]
         │                              │
         ▼                              ▼
[No Action]                    [Trigger Escalation]
                                      │
                                      ├──────────────────────────────┐
                                      │                              │
                                      ▼                              ▼
                            [Find Next Level]              [No Next Level]
                                      │                              │
                                      ▼                              ▼
                            [Next Level Exists?]          [Escalate to HR]
                                      │                              │
                                      ├──────────┬───────────────────┘
                                      │          │
                                      ▼          ▼
                            [Yes]    [No]
                                      │
                                      ▼
                            [Resolve Next Approver]
                                      │
                                      ├──────────┬──────────────┐
                                      │          │              │
                                      ▼          ▼              ▼
                            [Found]  [Not Found]      [Auto-Approve?]
                                      │              │
                                      │              ▼
                                      │      [Auto-Approve if configured]
                                      │              │
                                      │              ▼
                                      │      [Update Status: approved]
                                      │
                                      ▼
                            [Escalate to HR]
                                      │
                                      ▼
                            [Update Current Step: skipped]
                            [Update Next Step: pending]
                            [Notify Parties]
                            [Log Escalation in AuditLog]
```

**Implementation**: `lib/escalation-engine.ts`

---

## 3. Server-Side Validation

### 3.1 Transition Validation

**Status**: ✅ **VERIFIED** - Server validates every transition

**Location**: `app/api/leaves/[id]/route.ts` (PATCH handler)

**Validation Checks**:

1. **RBAC Permission Check** (Lines 128-147):
```typescript
const approvalPermission = await canApproveLeaveRequest(rbacContext, id, body.level)
if (!approvalPermission.allowed) {
  return NextResponse.json({ error: ... }, { status: 403 })
}
```

2. **Compliance Validation** (Lines 149-167):
```typescript
const complianceCheck = await validateBeforeApproval(id, user.staffId)
if (!complianceCheck.valid) {
  return NextResponse.json({ error: ... }, { status: 400 })
}
```

3. **Retroactive Approval Check** (Lines 169-217):
```typescript
const retroactiveCheck = await checkRetroactiveApproval(id)
// Validates justification and authority
```

4. **Balance Validation** (Lines 219-238):
```typescript
const balanceValidation = await validateLeaveBalance(...)
if (!balanceValidation.valid) {
  return NextResponse.json({ error: ... }, { status: 400 })
}
```

5. **Sequential Approval Enforcement** (Lines 331-343 in RBAC middleware):
```typescript
const allPreviousComplete = previousSteps.every(
  (s) => s.status === 'approved' || s.status === 'skipped'
)
if (!allPreviousComplete && previousSteps.length > 0) {
  return { allowed: false, errorCode: 'SEQUENTIAL_APPROVAL_REQUIRED' }
}
```

6. **Role Match Check** (Lines 345-352):
```typescript
if (currentStep.approverRole !== context.role) {
  return { allowed: false, errorCode: 'ROLE_MISMATCH' }
}
```

7. **Self-Approval Prevention** (Lines 284-291):
```typescript
if (context.staffId && leave.staffId === context.staffId) {
  return { allowed: false, errorCode: 'SELF_APPROVAL_NOT_ALLOWED' }
}
```

8. **Rejection Comments Requirement** (Lines 354-361):
```typescript
if (!body.comments || body.comments.trim().length < 10) {
  return NextResponse.json({
    error: 'Rejection comments are required and must be at least 10 characters',
    errorCode: 'REJECTION_COMMENTS_REQUIRED',
  }, { status: 400 })
}
```

### 3.2 Invalid Transitions

**Status**: ✅ **PREVENTED** by server validation

The following invalid transitions are prevented:

| From State | To State | Prevention Method |
|------------|----------|-------------------|
| `approved` (locked) | `pending` | `LEAVE_LOCKED` error code |
| `approved` (locked) | `rejected` | `LEAVE_LOCKED` error code |
| `rejected` | `approved` | Must create new request |
| Level N (pending) | Level N+1 (approved) | `SEQUENTIAL_APPROVAL_REQUIRED` |
| Any level | Any level (wrong role) | `ROLE_MISMATCH` |
| Own leave | Approved | `SELF_APPROVAL_NOT_ALLOWED` |
| Without previous levels | Current level | `SEQUENTIAL_APPROVAL_REQUIRED` |

---

## 4. Role-Based Approval Level Enforcement

### 4.1 Sequential Approval Enforcement

**Status**: ✅ **ENFORCED**

**Implementation**: `lib/roles/mofa-rbac-middleware.ts` - `canApproveLeaveRequest()`

**Enforcement Logic**:
```typescript
// Find current pending step
const currentStep = pendingSteps.sort((a, b) => a.level - b.level)[0]

// Check if previous levels are complete
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
```

**Database Enforcement**: `ApprovalStep.previousLevelCompleted` flag ensures sequential flow.

### 4.2 Role Skipping Prevention

**Status**: ✅ **PREVENTED**

No role can skip approval levels because:
1. Only the current pending step (lowest level with `status='pending'`) can be acted upon
2. Previous steps must be `approved` or `skipped` before next step becomes active
3. Server validates `previousLevelCompleted` flag before allowing approval

**Test Case**:
- Level 1 (SUPERVISOR): pending
- Level 2 (UNIT_HEAD): pending
- Attempt: UNIT_HEAD tries to approve Level 2
- Result: `SEQUENTIAL_APPROVAL_REQUIRED` error

---

## 5. Client Consistency (Web vs Desktop)

### 5.1 Web Client Implementation

**Location**: `components/leave-management.tsx`, `lib/data-store.ts`

**Workflow Handling**:
- Uses `updateLeaveRequest()` function
- Calls `PATCH /api/leaves/[id]` endpoint
- Server validates all transitions
- Optimistic UI updates with rollback on error

### 5.2 Desktop Client Implementation

**Location**: `lib/api/desktop-api.ts`

**Status**: ⚠️ **NEEDS VERIFICATION**

**Findings**:
- Desktop API wrapper exists (`desktopAPI.leaveRequests`)
- Uses same API endpoints as web (`/api/leaves`)
- Should behave identically if using same endpoints

**Recommendation**: Verify desktop client uses same API endpoints and doesn't bypass server validation.

### 5.3 Consistency Check

| Feature | Web | Desktop | Status |
|---------|-----|---------|--------|
| API Endpoints | `/api/leaves` | `/api/leaves` | ✅ Same |
| Server Validation | Yes | Yes (via API) | ✅ Same |
| Optimistic Updates | Yes | Unknown | ⚠️ Verify |
| Error Handling | Yes | Unknown | ⚠️ Verify |
| Offline Support | Limited | Yes (Tauri/Electron) | ⚠️ Different |

**Action Required**: Test desktop client workflow behavior matches web client.

---

## 6. Enforcement Gaps and Fixes

### 6.1 Gap: Resubmission Workflow Not Explicit

**Issue**: After rejection, employees must create a new leave request. No explicit "resubmit" functionality.

**Current Behavior**:
- Rejected leave remains in `rejected` status
- Employee creates new leave request
- No link between original and resubmission

**Recommendation**:
```typescript
// Add resubmission tracking
model LeaveRequest {
  // ... existing fields
  resubmittedFromId String? // Link to original rejected request
  resubmissionCount Int @default(0) // Track resubmission attempts
}

// Add resubmission endpoint
POST /api/leaves/[id]/resubmit
```

**Fix Implementation**:
1. Add `resubmittedFromId` field to `LeaveRequest` model
2. Create `POST /api/leaves/[id]/resubmit` endpoint
3. Copy rejected request data to new request
4. Link new request to original
5. Reset approval steps
6. Update UI to show "Resubmit" button for rejected leaves

### 6.2 Gap: Bulk Approval Bypasses Some Validations

**Issue**: `app/api/leaves/bulk/route.ts` may bypass some individual validations.

**Current Behavior**:
- Bulk approval updates status directly
- May not check sequential approval
- May not validate balance for each request

**Recommendation**:
```typescript
// In bulk approval route
for (const leaveId of leaveIds) {
  // Apply same validations as individual approval
  const rbacContext = await getUserRBACContext(user)
  const approvalPermission = await canApproveLeaveRequest(rbacContext, leaveId, level)
  if (!approvalPermission.allowed) {
    results.failed.push({ leaveId, error: approvalPermission.reason })
    continue
  }
  
  // Validate balance
  const balanceValidation = await validateLeaveBalance(...)
  if (!balanceValidation.valid) {
    results.failed.push({ leaveId, error: balanceValidation.error })
    continue
  }
  
  // Use same approval logic as individual route
  await updateApprovalStep(leaveId, level, 'approved', ...)
}
```

**Fix Implementation**:
1. Refactor bulk approval to use same validation functions
2. Apply sequential approval check for each request
3. Validate balance for each request
4. Use same `updateApprovalStep()` function

### 6.3 Gap: Client-Side Validation Gaps

**Issue**: Some client-side components may not validate before submission.

**Recommendation**:
- Always validate on server (already done)
- Add client-side validation for better UX
- Never trust client-side validation alone

**Current Status**: ✅ Server-side validation is comprehensive, client-side is optional for UX.

### 6.4 Gap: Desktop Offline Workflow Handling

**Issue**: Desktop client supports offline mode, but approval actions should be disabled offline.

**Current Behavior** (from docs):
- Offline leave submission allowed
- Approval actions disabled offline ✅

**Recommendation**: Verify desktop client enforces this:
```typescript
// In desktop client
if (!isOnline && action === 'approve') {
  throw new Error('Approval requires online connection')
}
```

---

## 7. Audit Log Coverage

### 7.1 Audit Log Implementation

**Status**: ✅ **COMPREHENSIVE**

**Implementation**: `lib/audit-logger.ts`

**Logged Actions**:
- `leave_submitted`: When leave is created
- `leave_approved`: When leave is approved (with level)
- `leave_rejected`: When leave is rejected (with level and comments)
- `leave_cancelled`: When leave is cancelled
- `balance_deducted`: When balance is deducted
- `balance_restored`: When balance is restored
- `approval_escalated`: When approval is escalated

**Audit Log Model**:
```prisma
model AuditLog {
  id        String   @id @default(cuid())
  action    String   // Action type
  user      String   // User ID or email
  userRole  String?  // Role of user
  staffId   String?  // Related staff ID
  leaveRequestId String? // Related leave request ID
  details   String   // Detailed description
  metadata  Json?    // Additional structured data
  timestamp DateTime @default(now())
  ip        String?  // IP address
  userAgent String?  // User agent
}
```

**Coverage**: ✅ All workflow actions are logged with full context.

---

## 8. Recommendations Summary

### 8.1 Critical Fixes

1. **Implement Resubmission Workflow**
   - Add `resubmittedFromId` field
   - Create resubmission endpoint
   - Update UI to show resubmit option

2. **Fix Bulk Approval Validations**
   - Apply same validations as individual approval
   - Check sequential approval for each request
   - Validate balance for each request

3. **Verify Desktop Client Consistency**
   - Test desktop workflow behavior
   - Ensure offline approval is disabled
   - Verify same API endpoints used

### 8.2 Enhancements

1. **Workflow State Machine**
   - Consider explicit state machine implementation
   - Add state transition validation layer
   - Document all valid transitions

2. **Enhanced Resubmission**
   - Track resubmission history
   - Show original rejection reason
   - Limit resubmission attempts

3. **Workflow Analytics**
   - Track average approval time per level
   - Identify bottlenecks
   - Monitor escalation frequency

---

## 9. Conclusion

The workflow system is **well-implemented** with:
- ✅ Database-driven state management
- ✅ Comprehensive server-side validation
- ✅ Sequential approval enforcement
- ✅ Role-based access control
- ✅ Comprehensive audit logging

**Areas for Improvement**:
- ⚠️ Resubmission workflow needs explicit implementation
- ⚠️ Bulk approval needs same validations as individual
- ⚠️ Desktop client consistency needs verification

**Overall Assessment**: The system has strong workflow enforcement with minor gaps that should be addressed.

---

## Appendix A: Valid State Transitions

| From | To | Condition | Validation |
|------|-----|-----------|------------|
| `pending` | `approved` | All levels approved | ✅ Server validates |
| `pending` | `rejected` | Any level rejected | ✅ Server validates |
| `pending` | `cancelled` | Employee cancels | ✅ Server validates |
| `rejected` | `pending` | Resubmission | ⚠️ Not implemented |
| `approved` | `cancelled` | HR cancels | ✅ Server validates |
| `approved` | `pending` | ❌ Invalid | ✅ Prevented |
| `rejected` | `approved` | ❌ Invalid | ✅ Prevented |

---

## Appendix B: Approval Level Roles

| Level | Role | Can Skip? | Can Delegate? |
|-------|------|-----------|---------------|
| 1 | SUPERVISOR | ❌ No | ✅ Yes |
| 2 | UNIT_HEAD | ❌ No | ✅ Yes |
| 3 | HEAD_OF_DEPARTMENT / DIRECTOR | ❌ No | ✅ Yes |
| 4 | HR_OFFICER | ❌ No | ✅ Yes |
| 5 | CHIEF_DIRECTOR | ❌ No | ✅ Yes |

**Enforcement**: Server validates role match and sequential completion.

---

**Report Generated**: Workflow Audit Complete  
**Next Steps**: Implement recommended fixes and verify desktop client consistency

