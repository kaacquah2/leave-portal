# Leave Request & Approval Workflow - Complete Process

## 📋 Overview

This document describes the complete end-to-end process of how an employee requests leave and how it is processed through the approval workflow in the HR Staff Leave Portal system.

---

## 🔵 Phase 1: Leave Request Submission

### Step 1: Employee Initiates Leave Request

**Location**: Employee Portal → "Apply for Leave" button

**Process**:
1. Employee navigates to the leave request form
2. Employee fills out the following required fields:
   - **Staff ID**: Automatically populated (employees can only request for themselves)
   - **Leave Type**: 
     - Annual
     - Sick
     - Unpaid
     - Special Service
     - Training
     - Study
     - Maternity
     - Paternity
     - Compassionate
   - **Start Date**: First day of leave
   - **End Date**: Last day of leave
   - **Reason**: Description/justification for the leave
   - **Attachments** (optional): Supporting documents (max 10MB per file)

### Step 2: System Validation

**Backend Processing** (`app/api/leaves/route.ts`):

1. **Field Validation**:
   - Checks all required fields are present
   - Validates date format and logic (start date < end date)
   - Ensures employees can only create requests for themselves

2. **Date Calculation**:
   - Calculates working days (excluding holidays)
   - Uses `calculateLeaveDays()` function
   - Updates the `days` field automatically

3. **Leave Balance Validation** (for paid leave types):
   - Checks if employee has sufficient leave balance
   - Validates using `validateLeaveBalance()` function
   - Returns error if insufficient balance with:
     - Current available balance
     - Requested days
     - Error message

4. **Leave Policy Lookup**:
   - Retrieves active leave policy for the selected leave type
   - Determines number of approval levels required
   - Builds approval level structure

### Step 3: Approval Levels Creation

**Based on Leave Policy** (`app/api/leaves/route.ts` lines 125-141):

- If policy has `approvalLevels > 0`:
  - Creates array of approval levels
  - **Level 1**: Manager approval (status: `pending`)
  - **Level 2+**: HR approval (status: `pending`)
  - Each level includes:
    - `level`: Sequential number (1, 2, 3...)
    - `approverRole`: Role responsible for approval
    - `status`: Initial status (`pending`)

- If no policy or `approvalLevels = 0`:
  - Single-level approval (direct to HR/Manager)

### Step 4: Leave Request Creation

**Database Record Created** (`prisma/schema.prisma`):

```typescript
LeaveRequest {
  id: string (auto-generated)
  staffId: string
  staffName: string
  leaveType: string
  startDate: DateTime
  endDate: DateTime
  days: number
  reason: string
  status: "pending" (initial status)
  approvalLevels: JSON (array of approval levels)
  templateId?: string (if using template)
  attachments: LeaveAttachment[] (if any)
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Step 5: Initial Response

- Request appears immediately in employee's leave history
- Status badge: **"Pending"** (amber/yellow)
- Icon: ⏰ Clock icon
- Employee sees: "Awaiting [Role] approval" message

---

## 🟡 Phase 2: Approval Workflow

### Workflow Types

#### **Single-Level Approval**

**Flow**:
1. Employee submits → Status: `pending`
2. Manager/HR reviews → Status: `approved` or `rejected`
3. Employee receives notification immediately

**Approvers**:
- Manager
- HR Officer
- HR Assistant
- Deputy Director
- Admin

#### **Multi-Level Approval**

**Flow**:
1. Employee submits → Status: `pending`
2. **Level 1 (Manager)**:
   - Status: `pending` → Employee sees "Awaiting Manager approval"
   - Manager approves → Status: `approved` at Level 1 → Moves to Level 2
   - Manager rejects → Final status: `rejected` (workflow stops)
3. **Level 2 (HR Officer)**:
   - Status: `pending` → Employee sees "Awaiting HR Officer approval"
   - HR approves → Final status: `approved`
   - HR rejects → Final status: `rejected`

**Visual Example**:
```
Leave Request: Annual Leave (5 days)
├─ Level 1 (Manager): ✅ Approved by John Doe on Jan 15, 2024
└─ Level 2 (HR Officer): ⏳ Awaiting approval
```

### Step 1: Approver Notification

**When Leave is Submitted** (`app/api/leaves/route.ts` lines 192-197):

- System identifies next approvers using `getNextApprovers()`
- Notifications are created for approvers (in-app and email)
- Approvers see pending requests in their dashboard

**Approver Views**:
- **Managers**: `components/manager-leave-approval.tsx`
  - See all pending leave requests from their team
  - Filter by status (Pending, Approved, Rejected)
  - View leave details: staff name, leave type, dates, reason, attachments

- **HR Officers**: `components/leave-management.tsx`
  - See all leave requests across organization
  - Bulk approval/rejection capability
  - Advanced filtering and search

### Step 2: Approver Reviews Request

**Information Available to Approver**:
- Staff member details (name, department, position)
- Leave type and duration
- Date range (start/end dates)
- Reason/description
- Supporting attachments (if any)
- Current leave balance (for context)
- Approval workflow status (which level, who approved previous levels)

### Step 3: Approval Decision

**Approver Actions** (`app/api/leaves/[id]/route.ts` - PATCH endpoint):

**Option A: Approve**
- Click "Approve" button
- Optionally add comments
- System processes approval

**Option B: Reject**
- Click "Reject" button
- Add rejection reason/comments (recommended)
- System processes rejection

**Backend Processing** (`app/api/leaves/[id]/route.ts` lines 41-390):

1. **Permission Check**:
   - Verifies user role has approval permission
   - For managers: checks if they're assigned approver for current level
   - Returns 403 if unauthorized

2. **Leave Balance Validation** (before approval):
   - Validates sufficient balance exists
   - Returns error if insufficient (prevents approval)
   - Error includes current balance and requested days

3. **Approval Level Update**:
   - Updates specific approval level status
   - Records approver name and approval date
   - Stores comments (if provided)
   - Handles delegated approvals (if applicable)

4. **Overall Status Calculation**:
   - Uses `calculateApprovalStatus()` from `lib/approval-workflow.ts`
   - Logic:
     - If any level rejected → Final status: `rejected`
     - If all required levels approved → Final status: `approved`
     - If any level pending → Final status: `pending`

5. **Leave Balance Deduction** (when approved):
   - Only deducts when status changes from `pending` to `approved`
   - Uses `deductLeaveBalance()` function
   - Updates LeaveBalance record
   - Creates audit log entry

6. **Leave Balance Restoration** (when rejected):
   - If previously approved leave is rejected → restores balance
   - Uses `restoreLeaveBalance()` function
   - Creates audit log entry

7. **Audit Log Creation**:
   - Records approval/rejection action
   - Stores: approver, level, comments, timestamps
   - Links to leave request ID

### Step 4: Notification to Employee

**When Status Changes** (`app/api/leaves/[id]/route.ts` lines 283-374):

1. **In-App Notification**:
   - Created in `Notification` table
   - Type: `leave_approved` or `leave_rejected`
   - Title: "Leave Request Approved/Rejected"
   - Message: "Your [LeaveType] leave request for [X] day(s) has been [approved/rejected]."
   - Link: Direct link to leave request details
   - Badge: Red dot appears on notification icon

2. **Push Notification** (if enabled):
   - Sent via `sendPushNotification()`
   - Non-blocking (doesn't fail request if push fails)
   - Includes same information as in-app notification

3. **Email Notification** (if enabled):
   - Sent to employee's registered email
   - **Approved**: Uses `generateLeaveRequestApprovedEmail()`
     - Includes: staff name, leave type, dates, days, approver name, link to view
   - **Rejected**: Uses `generateLeaveRequestRejectedEmail()`
     - Includes: staff name, leave type, dates, days, approver name, rejection comments, link to view
   - Non-blocking (doesn't fail request if email fails)

---

## ✅ Phase 3: Approved Leave Processing

### When Leave is Approved

**Status Changes**:
- Badge: Changes from "Pending" (amber) to "Approved" (green)
- Icon: Changes from ⏰ clock to ✅ checkmark
- Overall status: `approved`

**Information Displayed to Employee**:
- ✅ Approval date
- ✅ Approver name
- ✅ All approval levels show "Approved" status
- ✅ Approval comments (if provided)

**Actions Available**:
- **Download Approval Letter**: Button appears for approved leaves
- **View Leave History**: See in leave history with approved status
- **Check Leave Balance**: Verify balance was deducted correctly

**Leave Balance Update**:
- Balance automatically deducted from employee's leave balance
- Updated balance visible in "Leave Balances" section
- Audit log created for balance deduction

---

## ❌ Phase 4: Rejected Leave Processing

### When Leave is Rejected

**Status Changes**:
- Badge: Changes from "Pending" (amber) to "Rejected" (red)
- Icon: Changes from ⏰ clock to ❌ X
- Overall status: `rejected`

**Information Displayed to Employee**:
- ❌ Rejection date
- ❌ Rejector name
- ❌ Rejection level (which level rejected it)
- ❌ Rejection comments (if provided by approver)

**Leave Balance**:
- **NOT deducted** (balance remains unchanged)
- Original balance preserved

**Employee Actions**:
- Can view rejection reason
- Can submit a new leave request (if needed)
- Can contact approver for clarification

---

## 🔄 Phase 5: Multi-Level Approval Flow

### Detailed Multi-Level Process

**Example: 2-Level Approval**

1. **Employee Submits**:
   ```
   Status: pending
   Level 1: pending (Manager)
   Level 2: pending (HR)
   ```

2. **Manager Approves Level 1**:
   ```
   Status: pending (still pending overall)
   Level 1: approved (Manager) ✅
   Level 2: pending (HR) ⏳
   Employee sees: "Awaiting HR Officer approval"
   ```

3. **HR Approves Level 2**:
   ```
   Status: approved ✅
   Level 1: approved (Manager) ✅
   Level 2: approved (HR) ✅
   Employee receives: "Leave Request Approved" notification
   Leave balance deducted
   ```

**Rejection at Any Level**:
- If Manager rejects → Status: `rejected`, workflow stops
- If HR rejects → Status: `rejected`, workflow stops
- Employee receives rejection notification immediately

---

## 📊 Phase 6: Status Tracking & Visibility

### Employee Dashboard View

**Key Metrics Cards**:
1. **Pending Requests**: Count of pending leave requests (amber)
2. **Approved Leaves**: Count of approved leaves for the year (green)

**Recent Leave Requests Section**:
- Shows 5 most recent requests
- Displays:
  - Leave type badge
  - Status badge with icon (✅/❌/⏰)
  - Date range (From/To)
  - Duration (number of days)
  - Current approval stage (if pending)
  - Approval date (if approved/rejected)
  - Approver name (if approved)

### Leave History Page

**Status Filtering**:
- **All**: Shows all requests
- **Pending**: Only pending requests
- **Approved**: Only approved requests
- **Rejected**: Only rejected requests

**Detailed Status Display**:
- Main status indicator (large badge with icon)
- Approval workflow visualization (step-by-step levels)
- Each level shows:
  - Level number
  - Approver role
  - Status badge (Approved/Rejected/Awaiting)
  - Approver name (if approved)
  - Approval date (if approved)
  - Comments (if provided)
- Current pending level highlighted (amber background)

---

## 🔔 Phase 7: Notifications & Alerts

### Notification Types

1. **Leave Submitted** (to approvers):
   - In-app notification
   - Email notification (if enabled)
   - Push notification (if enabled)

2. **Leave Approved** (to employee):
   - In-app notification with green checkmark
   - Email with approval details
   - Push notification
   - Badge count updates

3. **Leave Rejected** (to employee):
   - In-app notification with red X
   - Email with rejection details and comments
   - Push notification
   - Badge count updates

4. **Approval Reminders** (to approvers):
   - Sent if leave pending for X days
   - Configurable reminder intervals
   - Email and in-app notifications

### Notification Channels

- **In-App**: Notification center with badge count
- **Email**: HTML emails with full details
- **Push**: Real-time push notifications (if enabled)
- **SMS**: (Future enhancement)

---

## 🛠️ Technical Implementation Details

### Key Files

1. **Leave Request Creation**:
   - `app/api/leaves/route.ts` (POST endpoint)
   - `components/leave-form.tsx` (Frontend form)
   - `lib/data-store.ts` (State management)

2. **Approval Processing**:
   - `app/api/leaves/[id]/route.ts` (PATCH endpoint)
   - `lib/approval-workflow.ts` (Workflow engine)
   - `components/manager-leave-approval.tsx` (Manager view)
   - `components/leave-management.tsx` (HR view)

3. **Balance Management**:
   - `lib/leave-balance-utils.ts` (Balance validation/deduction)
   - `prisma/schema.prisma` (Database schema)

4. **Notifications**:
   - `lib/email.ts` (Email generation)
   - `lib/send-push-notification.ts` (Push notifications)
   - Database `Notification` model

### Database Schema

**LeaveRequest Model**:
```prisma
model LeaveRequest {
  id            String   @id @default(cuid())
  staffId       String
  staffName     String
  leaveType     String
  startDate     DateTime
  endDate       DateTime
  days          Int
  reason        String
  status        String   @default("pending") // 'pending' | 'approved' | 'rejected'
  approvedBy    String?
  approvalDate  DateTime?
  approvalLevels Json?   // Array of ApprovalLevel
  attachments   LeaveAttachment[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**ApprovalLevel Structure** (JSON):
```typescript
{
  level: number
  approverRole: 'manager' | 'hr' | 'hr_assistant' | 'deputy_director'
  status: 'pending' | 'approved' | 'rejected'
  approverName?: string
  approvalDate?: string
  comments?: string
}
```

### Workflow Engine

**Functions** (`lib/approval-workflow.ts`):
- `calculateApprovalStatus()`: Determines overall status from levels
- `getNextApprovers()`: Identifies who should approve next
- `areParallelApprovalsComplete()`: Checks parallel approval completion
- `checkApprovalConditions()`: Validates conditional approval requirements

---

## 📝 Summary: Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. EMPLOYEE SUBMITS LEAVE REQUEST                           │
│    - Fill form (type, dates, reason, attachments)           │
│    - System validates balance & dates                       │
│    - Creates LeaveRequest with status: "pending"            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. APPROVAL LEVELS CREATED                                  │
│    - Based on leave policy                                  │
│    - Level 1: Manager (pending)                            │
│    - Level 2+: HR (pending)                                │
│    - Notifications sent to approvers                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. APPROVER REVIEWS                                         │
│    - Manager/HR sees request in dashboard                  │
│    - Views details, attachments, balance                    │
│    - Makes decision: Approve or Reject                      │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│ 4a. APPROVED     │   │ 4b. REJECTED     │
│                  │   │                  │
│ - Update level   │   │ - Update level   │
│ - Check balance  │   │ - Status:        │
│ - Deduct balance │   │   rejected       │
│ - Calculate      │   │ - No balance     │
│   overall status │   │   deduction      │
│ - Send           │   │ - Send           │
│   notification   │   │   notification   │
└────────┬─────────┘   └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. EMPLOYEE NOTIFIED                                        │
│    - In-app notification                                    │
│    - Email notification                                     │
│    - Push notification                                      │
│    - Status visible in dashboard                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. FINAL STATUS                                             │
│    Approved:                                                │
│    - Balance deducted                                       │
│    - Can download approval letter                           │
│    - Visible in leave history                               │
│                                                             │
│    Rejected:                                                │
│    - Balance unchanged                                      │
│    - Rejection reason visible                               │
│    - Can submit new request                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Key Features

1. **Multi-Level Approval**: Supports sequential and parallel approvals
2. **Balance Validation**: Prevents approval if insufficient balance
3. **Automatic Balance Deduction**: Deducts on approval, restores on rejection
4. **Real-Time Notifications**: Multiple notification channels
5. **Audit Trail**: Complete history of all actions
6. **Offline Support**: Can submit requests offline (queued for sync)
7. **Attachment Support**: Upload supporting documents
8. **Holiday Exclusion**: Automatically excludes holidays from day count
9. **Template Support**: Pre-fill forms from templates
10. **Bulk Operations**: HR can approve/reject multiple requests

---

## 📍 Where to Find Information

**For Employees**:
- Dashboard → Recent Leave Requests
- Leave History → Full list with filters
- Notifications → Status change alerts
- Email → Status notifications

**For Approvers**:
- Manager Dashboard → Pending Approvals
- HR Dashboard → Leave Management
- Notifications → New leave requests
- Email → Approval reminders

---

## 🎯 Best Practices

**For Employees**:
1. Submit requests well in advance
2. Provide clear reason and supporting documents
3. Check leave balance before submitting
4. Monitor notifications for status updates
5. Download approval letters for records

**For Approvers**:
1. Review requests promptly
2. Provide comments when rejecting
3. Verify leave balance before approving
4. Check for conflicts with other leaves
5. Use bulk operations for efficiency

---

This workflow ensures transparency, accountability, and efficient processing of leave requests throughout the organization.

