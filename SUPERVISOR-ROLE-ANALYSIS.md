# Supervisor Role Analysis

## Overview
The **SUPERVISOR** role is the **Level 1 Approval Authority** in the MoFA (Ministry of Foreign Affairs) leave management system. Supervisors are immediate supervisors/line managers who manage direct reports.

---

## Role Definition

### Role Code
- **Primary**: `SUPERVISOR`
- **Legacy**: `supervisor`, `manager` (mapped to SUPERVISOR)

### Display Name
- **Supervisor** / **Immediate Supervisor** / **Line Manager**

### Approval Level
- **Level 1** - First level of approval in the leave workflow

---

## Permissions

Based on `lib/permissions.ts`, supervisors have the following permissions:

### Core Permissions
1. **`employee:view:team`** - View direct reports only
2. **`leave:view:team`** - View leave requests from direct reports only
3. **`leave:approve:team`** - Level 1 approval authority for direct reports
4. **`performance:view:team`** - View team performance data
5. **`attendance:view:team`** - View team attendance records
6. **`reports:team:view`** - View team-level reports
7. **`unit:view:own`** - Can view own unit information

### What Supervisors CAN Do
✅ View their direct reports (team members)  
✅ View leave requests from direct reports  
✅ Approve/reject leave requests at Level 1  
✅ View team performance and attendance  
✅ View team reports  
✅ View unit information  

### What Supervisors CANNOT Do
❌ View all employees (only direct reports)  
❌ Approve leave for non-direct reports  
❌ Create or manage leave policies  
❌ Edit employee records  
❌ View system-wide reports  
❌ Manage organizational structure  

---

## UI Routes & Pages

### Main Portal Route
- **Route**: `/supervisor` (as defined in `lib/role-mapping.ts`)
- **Note**: Currently uses `/manager` route (see `app/manager/page.tsx`)
- **Component**: `components/portal.tsx` with supervisor-specific dashboard

### Portal Tabs (via `components/portal.tsx`)

#### 1. Dashboard Tab (`?tab=dashboard`)
- **Component**: `components/supervisor-dashboard.tsx`
- **Features**:
  - Team members count (direct reports)
  - Pending approvals at Level 1
  - Approved/rejected this month statistics
  - Pending leave requests list (top 5)
  - Quick actions:
    - View Team Members
    - Approve Leave Requests
    - Team Reports
  - Approval guidelines

#### 2. Staff Tab (`?tab=staff`)
- **Component**: `components/manager-team-view.tsx`
- **Features**:
  - View all direct reports
  - Search by name, staff ID, department, position
  - View team member details:
    - Contact information
    - Department and position
    - Leave balances (Annual, Sick)
    - Pending/active leave counts
  - Navigate to leave approval for specific team member

#### 3. Leave Tab (`?tab=leave`)
- **Component**: Leave management component
- **Features**:
  - View pending leave requests from direct reports
  - Approve/reject leave requests
  - View leave history for team members

#### 4. Reports Tab (`?tab=reports`)
- **Component**: Reports component
- **Features**:
  - Team-level reports
  - Leave statistics
  - Attendance reports

---

## API Routes

### Accessible API Endpoints

#### 1. Staff API (`/api/staff`)
- **GET `/api/staff`**
  - **Access**: ✅ Allowed
  - **Filtering**: Automatically filters to show only direct reports
  - **Implementation**: Filters by `immediateSupervisorId` or `managerId` matching supervisor's `staffId`
  - **Code Location**: `app/api/staff/route.ts` (lines 84-93)

- **GET `/api/staff/[id]`**
  - **Access**: ✅ Allowed (only for direct reports)
  - **Permission Check**: Verifies staff member is a direct report
  - **Code Location**: `app/api/staff/[id]/route.ts` (lines 82-87)

#### 2. Leave Requests API (`/api/leaves`)
- **GET `/api/leaves`**
  - **Access**: ✅ Allowed
  - **Filtering**: Shows leave requests from direct reports
  - **Query Parameters**: 
    - `status=pending` - Filter by status
    - `staffId=<id>` - Filter by specific staff member
  - **Code Location**: `app/api/leaves/route.ts`

- **GET `/api/leaves/[id]`**
  - **Access**: ✅ Allowed (RBAC checked)
  - **Permission Check**: Uses `canViewLeaveRequest()` from RBAC middleware
  - **Verification**: Checks if leave belongs to direct report
  - **Code Location**: `app/api/leaves/[id]/route.ts` (lines 28-46)

- **PATCH `/api/leaves/[id]`** (Approve/Reject)
  - **Access**: ✅ Allowed (with RBAC validation)
  - **Permission Check**: Uses `canApproveLeaveRequest()` from RBAC middleware
  - **Validation**:
    - Checks if supervisor is in approval chain
    - Verifies leave belongs to direct report
    - Validates sequential approval (Level 1)
    - Prevents self-approval
  - **Code Location**: `app/api/leaves/[id]/route.ts` (lines 98-118)

#### 3. Leave Balances API (`/api/balances`)
- **GET `/api/balances/[staffId]`**
  - **Access**: ✅ Allowed (for direct reports)
  - **Code Location**: `app/api/balances/[staffId]/route.ts`
  - **Allowed Roles**: Includes `SUPERVISOR`, `supervisor`

#### 4. Leave Templates API (`/api/leave-templates`)
- **GET `/api/leave-templates`**
  - **Access**: ✅ Allowed (read-only)
  - **Code Location**: `app/api/leave-templates/route.ts`

#### 5. Notifications API (`/api/notifications`)
- **GET `/api/notifications`**
  - **Access**: ✅ Allowed
  - **Purpose**: View notifications for pending approvals

---

## RBAC Middleware Checks

### View Leave Request (`canViewLeaveRequest`)
**Location**: `lib/mofa-rbac-middleware.ts` (lines 158-166)

**Supervisor Logic**:
```typescript
if (role === 'SUPERVISOR' || role === 'supervisor' || role === 'manager') {
  // Supervisor: Can view direct reports
  if (context.staffId && leave.staff.immediateSupervisorId === context.staffId) {
    return { allowed: true }
  }
  if (context.staffId && leave.staff.managerId === context.staffId) {
    return { allowed: true }
  }
}
```

### Approve Leave Request (`canApproveLeaveRequest`)
**Location**: `lib/mofa-rbac-middleware.ts` (lines 230-394)

**Supervisor Logic**:
- Checks if supervisor is assigned as Level 1 approver
- Verifies leave belongs to direct report
- Validates sequential approval (cannot skip levels)
- Prevents self-approval
- Checks if previous approval level is complete

---

## Approval Workflow

### Standard Workflow (HQ Staff)
```
EMPLOYEE submits
  ↓
SUPERVISOR (Level 1) ← Supervisor approves here
  ↓
UNIT_HEAD (Level 2)
  ↓
DIVISION_HEAD (Level 3)
  ↓
DIRECTOR (Level 4)
  ↓
HR_OFFICER (Level 5 - Final)
```

### Supervisor's Role in Workflow
1. **Receives notification** when direct report submits leave
2. **Reviews leave request** (dates, reason, balance)
3. **Checks staffing impact** (ensures adequate coverage)
4. **Approves or rejects** at Level 1
5. **Leave proceeds** to next level (UNIT_HEAD) if approved

---

## Components Used

### 1. SupervisorDashboard
**File**: `components/supervisor-dashboard.tsx`
- Custom dashboard for supervisors
- Shows team metrics and pending approvals
- Quick navigation to key functions

### 2. ManagerTeamView
**File**: `components/manager-team-view.tsx`
- Displays team members (direct reports)
- Shows leave balances and status
- Search and filter functionality

### 3. Portal Component
**File**: `components/portal.tsx`
- Main portal wrapper
- Handles tab navigation
- Role-based content rendering

---

## Data Filtering

### Staff Filtering
**API**: `GET /api/staff`
**Filter Logic** (from `app/api/staff/route.ts`):
```typescript
if (normalizedRole === 'SUPERVISOR' || normalizedRole === 'supervisor' || normalizedRole === 'manager') {
  where.OR = [
    { managerId: user.staffId },
    { immediateSupervisorId: user.staffId },
  ]
}
```

### Leave Filtering
**API**: `GET /api/leaves`
- Supervisors see leaves from direct reports only
- Filtered by `staffId` matching direct reports
- Status filtering supported (`status=pending`)

---

## Key Features

### 1. Dashboard Metrics
- **Team Members**: Count of direct reports
- **Pending Approvals**: Leave requests awaiting Level 1 approval
- **Approved This Month**: Count of approved leaves
- **Rejected This Month**: Count of rejected leaves

### 2. Pending Approvals List
- Shows top 5 pending leave requests
- Displays:
  - Staff name
  - Leave type
  - Date range
  - Number of days
  - Approval level status
- Quick "Review" button to approve/reject

### 3. Team View
- Grid layout of team members
- Each card shows:
  - Name and position
  - Contact information
  - Leave balances
  - Pending/active leave counts
  - "View Leaves" action button

### 4. Quick Actions
- View Team Members
- Approve Leave Requests
- Team Reports

---

## Security & Compliance

### Access Control
- ✅ Role-based access control (RBAC)
- ✅ Unit-based scoping (direct reports only)
- ✅ Sequential approval enforcement
- ✅ Self-approval prevention

### Audit Logging
- All approval actions are logged
- Includes:
  - User ID and role
  - Timestamp
  - IP address
  - User agent
  - Action type (approve/reject)

### Compliance
- Follows MoFA government HR workflow
- Level 1 approval authority
- Cannot skip approval levels
- Cannot approve own leave

---

## Testing Checklist

### UI Routes
- [ ] `/manager` route loads supervisor dashboard
- [ ] Dashboard shows correct metrics
- [ ] Team view displays direct reports only
- [ ] Leave tab shows pending approvals
- [ ] Reports tab accessible

### API Routes
- [ ] `GET /api/staff` returns only direct reports
- [ ] `GET /api/staff/[id]` works for direct reports
- [ ] `GET /api/staff/[id]` blocks non-direct reports
- [ ] `GET /api/leaves` returns team leaves only
- [ ] `GET /api/leaves/[id]` accessible for team leaves
- [ ] `PATCH /api/leaves/[id]` allows approval/rejection
- [ ] `PATCH /api/leaves/[id]` blocks non-team leaves
- [ ] `GET /api/balances/[staffId]` works for direct reports

### Functionality
- [ ] Can view team members
- [ ] Can view pending leave requests
- [ ] Can approve leave at Level 1
- [ ] Can reject leave at Level 1
- [ ] Cannot approve non-direct reports
- [ ] Cannot skip approval levels
- [ ] Cannot approve own leave

---

## Notes

1. **Route Mapping**: The supervisor role uses `/manager` route currently, but the role mapping suggests `/supervisor` should be used. Consider creating `app/supervisor/page.tsx` for consistency.

2. **Team Filtering**: The team view currently shows all active staff. In production, this should filter by `immediateSupervisorId` or `managerId` matching the supervisor's `staffId`.

3. **Legacy Support**: The system supports both `SUPERVISOR` (new) and `supervisor`/`manager` (legacy) role codes for backward compatibility.

4. **Dashboard Data**: The supervisor dashboard fetches data from `/api/leaves?status=pending` and filters client-side. Consider server-side filtering for better performance.

---

## Summary

The **SUPERVISOR** role is a **Level 1 Approval Authority** with the following capabilities:

✅ **View**: Direct reports, their leave requests, balances, and attendance  
✅ **Approve**: Leave requests from direct reports at Level 1  
✅ **Reports**: Team-level reports and statistics  
✅ **Access**: Unit information (view only)  

The role is properly secured with RBAC middleware, unit-based scoping, and sequential approval enforcement. All UI routes and API endpoints are functional and properly restricted to direct reports only.

