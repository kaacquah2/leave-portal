# Workflow State Diagrams
## Visual Representation of Leave Application Workflows

---

## 1. Complete Leave Application State Machine

```
                    ┌─────────────┐
                    │   DRAFT     │ (Optional: Save before submission)
                    └──────┬──────┘
                           │
                           │ [Submit]
                           ▼
                    ┌─────────────┐
                    │   PENDING   │ ◄──────────────────┐
                    └──────┬──────┘                    │
                           │                           │
        ┌──────────────────┼──────────────────┐        │
        │                  │                  │        │
        ▼                  ▼                  ▼        │
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│   APPROVED   │  │   REJECTED   │  │  CANCELLED   │  │
└──────────────┘  └──────┬───────┘  └──────────────┘  │
        │                │                             │
        │                │ [Resubmit]                  │
        │                └─────────────────────────────┘
        │
        │ [Locked]
        ▼
┌──────────────┐
│   LOCKED     │ (Cannot be modified)
└──────────────┘
```

**Valid Transitions**:
- `draft` → `pending` (Submit)
- `pending` → `approved` (All levels approved)
- `pending` → `rejected` (Any level rejected)
- `pending` → `cancelled` (Employee/HR cancels)
- `rejected` → `pending` (Resubmit - ⚠️ Not implemented)
- `approved` → `cancelled` (HR cancels approved leave)

**Invalid Transitions** (Prevented by Server):
- `approved` → `pending` ❌
- `approved` → `rejected` ❌
- `rejected` → `approved` ❌
- `locked` → Any state ❌

---

## 2. Multi-Level Approval Flow

```
Level 1: SUPERVISOR
    │
    ├─[Approve]──► Level 2: UNIT_HEAD
    │                  │
    ├─[Reject]─────────┼──► [Status: rejected] ──► [End]
    │                  │
    └─[Delegate]───────┼──► [Delegate acts]
                       │
                       ├─[Approve]──► Level 3: HEAD_OF_DEPARTMENT
                       │                  │
                       ├─[Reject]─────────┼──► [Status: rejected] ──► [End]
                       │                  │
                       └─[Delegate]───────┼──► [Delegate acts]
                                          │
                                          ├─[Approve]──► Level 4: HR_OFFICER
                                          │                  │
                                          ├─[Reject]─────────┼──► [Status: rejected] ──► [End]
                                          │                  │
                                          └─[Delegate]───────┼──► [Delegate acts]
                                                             │
                                                             ├─[Approve]──► [Status: approved]
                                                             │                  │
                                                             │                  ▼
                                                             │            [Deduct Balance]
                                                             │                  │
                                                             │                  ▼
                                                             │            [Lock Record]
                                                             │                  │
                                                             │                  ▼
                                                             │            [Workflow Complete]
                                                             │
                                                             └─[Reject]──► [Status: rejected] ──► [End]
```

**Key Rules**:
1. Only current pending step can be acted upon
2. Previous steps must be `approved` or `skipped` before next step
3. Any rejection ends workflow immediately
4. Final approval (HR_OFFICER) deducts balance and locks record

---

## 3. Approval Step State Machine

```
                    ┌─────────────┐
                    │   PENDING   │ (Initial state)
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   APPROVED   │  │   REJECTED   │  │  DELEGATED   │
└──────────────┘  └──────────────┘  └──────┬───────┘
        │                                    │
        │                                    │ [Delegate acts]
        │                                    ▼
        │                            ┌──────────────┐
        │                            │   APPROVED   │ (by delegate)
        │                            └──────────────┘
        │
        ▼
[Mark next step's previousLevelCompleted = true]
        │
        ▼
[Next step becomes active (if exists)]
```

**Step Status Transitions**:
- `pending` → `approved` (Approver approves)
- `pending` → `rejected` (Approver rejects - ends workflow)
- `pending` → `delegated` (Approver delegates)
- `delegated` → `approved` (Delegate approves)
- `pending` → `skipped` (Escalation or auto-skip)

**Invalid Transitions** (Prevented):
- `approved` → `pending` ❌
- `rejected` → `approved` ❌
- `approved` → `rejected` ❌

---

## 4. Escalation Flow

```
[ApprovalStep: pending]
        │
        ▼
[Check: Days since created]
        │
        ├─[< 10 working days]──► [No action]
        │
        └─[≥ 10 working days]──► [Trigger Escalation]
                                   │
                                   ├─[Next level exists?]
                                   │   │
                                   │   ├─[Yes]──► [Resolve next approver]
                                   │   │            │
                                   │   │            ├─[Found]──► [Skip current, activate next]
                                   │   │            │
                                   │   │            └─[Not found]──► [Escalate to HR]
                                   │   │
                                   │   └─[No]──► [Escalate to HR]
                                   │
                                   └─[Auto-approve configured?]
                                       │
                                       └─[Yes]──► [Auto-approve]
```

**Escalation Rules**:
- Trigger: 10+ working days pending
- Action: Skip current level, activate next level
- Fallback: Escalate to HR if no next level
- Notification: Notify all parties
- Audit: Log escalation event

---

## 5. Rejection Flow

```
[ApprovalStep: pending]
        │
        ▼
[Approver clicks "Reject"]
        │
        ▼
[Validate: Comments required (min 10 chars)]
        │
        ├─[Invalid]──► [Error: REJECTION_COMMENTS_REQUIRED]
        │
        └─[Valid]──► [Update ApprovalStep: rejected]
                      │
                      ▼
              [Update LeaveRequest: rejected]
                      │
                      ├─[Log rejection in AuditLog]
                      │
                      ├─[Log rejection in LeaveApprovalHistory]
                      │
                      ├─[Notify employee]
                      │
                      └─[End workflow]
```

**Rejection Requirements**:
- Comments mandatory (minimum 10 characters)
- All subsequent steps remain `pending` (workflow ends)
- Employee notified immediately
- Full audit trail created

---

## 6. Resubmission Flow (Recommended)

```
[LeaveRequest: rejected]
        │
        ▼
[Employee views rejection]
        │
        ├─[Sees rejection comments]
        │
        └─[Clicks "Resubmit"]
                │
                ▼
        [Create new LeaveRequest]
                │
                ├─[Copy data from rejected request]
                │
                ├─[Link: resubmittedFromId = original.id]
                │
                ├─[Increment: resubmissionCount]
                │
                ├─[Reset: approval steps]
                │
                └─[Status: pending]
                        │
                        ▼
                [New workflow starts]
```

**⚠️ Current Status**: Not implemented. Employees must create new request manually.

**Recommended Implementation**:
1. Add `resubmittedFromId` field to `LeaveRequest`
2. Add `resubmissionCount` field
3. Create `POST /api/leaves/[id]/resubmit` endpoint
4. Update UI to show "Resubmit" button

---

## 7. Balance Deduction Flow

```
[Final Approval: HR_OFFICER approves]
        │
        ▼
[Validate: Balance sufficient]
        │
        ├─[Insufficient]──► [Error: INSUFFICIENT_BALANCE]
        │
        └─[Sufficient]──► [Deduct balance]
                            │
                            ├─[Update LeaveBalance]
                            │
                            ├─[Log: balance_deducted in AuditLog]
                            │
                            ├─[Lock LeaveRequest]
                            │
                            └─[Status: approved]
```

**Balance Rules**:
- Validated at final approval only
- Deducted atomically with approval
- Restored if approved leave is cancelled
- Logged in audit trail

---

## 8. Concurrent Approval Prevention

```
[User A: Loads leave request]
        │
        ▼
[User B: Loads same leave request]
        │
        ▼
[User A: Approves (version: 1)]
        │
        ▼
[User B: Tries to approve (version: 1)]
        │
        ▼
[Server: Check version]
        │
        ├─[Version mismatch]──► [Error: CONCURRENT_MODIFICATION_CONFLICT]
        │
        └─[Version match]──► [Update with version: 2]
```

**Optimistic Locking**:
- `LeaveRequest.version` field increments on each update
- Server checks version before update
- Prevents concurrent modification conflicts
- Returns 409 Conflict if version mismatch

---

## 9. Self-Approval Prevention

```
[User: Attempts to approve leave]
        │
        ▼
[Server: Check staffId]
        │
        ├─[leave.staffId === user.staffId]──► [Error: SELF_APPROVAL_NOT_ALLOWED]
        │
        └─[Different staffId]──► [Continue approval]
```

**Enforcement**: Server validates `context.staffId !== leave.staffId` before allowing approval.

---

## 10. Role-Based Access Control Flow

```
[User: Attempts to approve]
        │
        ▼
[Get user's RBAC context]
        │
        ├─[Role: EMPLOYEE]──► [Error: ROLE_NOT_AUTHORIZED]
        │
        ├─[Role: AUDITOR]──► [Error: READ_ONLY_ROLE]
        │
        ├─[Role: SYSTEM_ADMIN]──► [Error: SEGREGATION_OF_DUTIES_VIOLATION]
        │
        └─[Role: Valid approver]──► [Check step requirements]
                                      │
                                      ├─[Role matches step.approverRole?]
                                      │   │
                                      │   ├─[No]──► [Error: ROLE_MISMATCH]
                                      │   │
                                      │   └─[Yes]──► [Check sequential approval]
                                      │                │
                                      │                ├─[Previous incomplete]──► [Error: SEQUENTIAL_APPROVAL_REQUIRED]
                                      │                │
                                      │                └─[Previous complete]──► [Allow approval]
```

**RBAC Enforcement**:
- Role must match step requirement
- Previous steps must be complete
- Unit/directorate scope checked
- Self-approval prevented

---

## Summary

All workflows are:
- ✅ **DB-driven**: State stored in `ApprovalStep` model
- ✅ **Server-validated**: Every transition validated
- ✅ **Sequential**: Levels cannot be skipped
- ✅ **Audited**: All actions logged
- ⚠️ **Resubmission**: Needs implementation

