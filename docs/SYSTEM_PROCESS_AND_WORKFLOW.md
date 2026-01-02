# HR Staff & Leave Portal - Complete System Process & Workflow Documentation

**Version**: 1.1  
**Last Updated**: December 2024  
**Organization**: Ministry of Fisheries and Aquaculture (MoFA), Ghana

> **IMPORTANT NOTE**: For the purposes of this system documentation, "MoFA" refers to the **Ministry of Fisheries and Aquaculture**, Ghana. The organizational structure, approval workflows, and role hierarchies described herein are configurable per MDA (Ministry, Department, or Agency) and align with Ghana Government Public Service standards including PSC Leave Policy and OHCS HRMIS guidelines.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [User Roles & Hierarchy](#user-roles--hierarchy)
3. [Staff Management Process](#staff-management-process)
4. [Leave Portal Workflow](#leave-portal-workflow)
5. [Role-Based User Workflows](#role-based-user-workflows)
6. [Role-Specific UI Components](#role-specific-ui-components)
7. [Approval Workflow Details](#approval-workflow-details)
8. [System Features by Role](#system-features-by-role)
9. [Offline & Synchronization Behavior](#offline--synchronization-behavior)
10. [Acting Appointments & Delegation](#acting-appointments--delegation)
11. [Edge Cases & Escalation](#edge-cases--escalation)
12. [Data Retention & Legal Compliance](#data-retention--legal-compliance)
13. [Disaster Recovery & Data Loss Prevention](#disaster-recovery--data-loss-prevention)

---

## 🎯 System Overview

The HR Staff & Leave Portal is a comprehensive system designed for the Ministry of Fisheries and Aquaculture (MoFA) to manage staff information and leave requests. The system implements Ghana Government Public Service standards including PSC Leave Policy and OHCS HRMIS guidelines.

### Key Features:
- **Staff Management**: Complete employee lifecycle management
- **Leave Management**: Multi-level approval workflow
- **Role-Based Access Control (RBAC)**: Granular permissions per role
- **Organizational Structure**: Supports MoFA hierarchy (Units, Divisions, Directorates, Regions)
- **Real-time Updates**: Live notifications and data synchronization
- **Offline Support**: Electron-based desktop application with offline capabilities

---

## 👥 User Roles & Hierarchy

The system supports the following roles in the MoFA organizational hierarchy:

### 1. **EMPLOYEE** (Base Role)
- All confirmed MoFA staff members
- Can view own information and apply for leave
- No approval authority

### 2. **SUPERVISOR** (Level 1 Approval)
- Immediate Supervisor / Line Manager
- Approves direct reports' leave requests
- Views team members only

### 3. **UNIT_HEAD** (Level 2 Approval)
- Head of functional unit
- Approves unit-level leave requests
- Manages unit staff

### 4. **DIVISION_HEAD** (Level 3 Approval)
- Head of division under directorate
- Approves division-level leave requests
- Manages division staff

### 5. **DIRECTOR** (Level 4 Approval)
- Director of MoFA Directorate
- Approves directorate-level leave requests
- Manages directorate staff

### 6. **REGIONAL_MANAGER** (Regional Approval)
- Head of MoFA Regional Office
- Approves regional/district staff leave requests
- Manages regional staff

### 7. **HR_OFFICER** (Final Approval Authority)
- HR Officer (HRM)
- Final approval authority for all leave requests
- Manages all staff records
- Configures leave policies

### 8. **HR_DIRECTOR** (Strategic HR)
- Head of Human Resource Directorate
- Can approve senior staff/director leave
- Manages organizational structure
- Full HR management capabilities

### 9. **CHIEF_DIRECTOR** (Executive Authority)
- Chief Director / Ministerial Authority
- Highest approval authority
- Approves Directors & HR Director leave
- Executive oversight

### 10. **AUDITOR** (Read-Only)
- Internal Auditor (IAA)
- Read-only access to all data
- Audit log access
- Compliance monitoring

### 11. **SYSTEM_ADMIN** (Technical)
- System Administrator
- Technical configuration
- User management
- System maintenance
- **Cannot approve leave** (segregation of duties)

### 12. **SECURITY_ADMIN** (Security)
- Security Administrator
- Audit logs and access review
- Compliance monitoring
- **Cannot approve leave** (segregation of duties)

### 13. **ACTING_ROLE** (Temporary Authority)
- Acting appointments for temporary role coverage
- Formally recognized by PSC
- Full scope of acting role during appointment period
- Must have authority source (appointment letter reference)
- Automatically expires on end date
- **Note**: Different from delegation - acting appointment assumes full role authority

---

## 👨‍💼 Staff Management Process

### Creating Staff Members

**Who Can Create**: HR_OFFICER, HR_DIRECTOR, SYSTEM_ADMIN

**Process**:
1. Navigate to "Staff Management" (HR UI)
2. Click "Add Staff" button
3. Fill in required information:
   - **Personal Details**: Name, Email, Phone
   - **Employment Details**: Department, Position, Grade, Level, Rank, Step
   - **Organizational Structure**: Directorate, Division, Unit, Duty Station
   - **Dates**: Join Date, Confirmation Date
   - **Manager Assignment**: Immediate Supervisor, Manager ID
4. System automatically:
   - Creates user account
   - Creates initial leave balance (all types set to 0)
   - Links staff to user account
   - Creates audit log entry

**UI Location**: `components/staff-management.tsx`

### Editing Staff Information

**Who Can Edit**:
- **HR_OFFICER, HR_DIRECTOR**: Can edit all fields including salary
- **SYSTEM_ADMIN**: Can edit basic info (segregation of duties)
- **EMPLOYEE**: Can edit own personal info (with HR approval)

**Process**:
1. Find staff member in list
2. Click "Edit" button
3. Update information
4. Save changes
5. System creates audit log entry

### Viewing Staff

**Access Levels**:
- **HR Roles**: View all staff organization-wide
- **DIRECTOR**: View all staff in own directorate
- **UNIT_HEAD**: View all staff in own unit
- **SUPERVISOR**: View direct reports only
- **EMPLOYEE**: View own record only
- **REGIONAL_MANAGER**: View regional/district staff only

**UI Filtering**:
- Staff list is automatically filtered based on:
  - User's role
  - User's organizational unit/directorate/region
  - Manager assignment relationships

### Staff Record Versioning & History

**Government Requirement**: Certain staff fields must maintain historical records for audit purposes.

**Versioned Fields**:
- Grade
- Rank
- Position
- Salary Step
- Department
- Directorate
- Unit

**Implementation**:
- Staff history tables with effective-from and effective-to dates
- Immutable snapshots created at:
  - Leave approval time
  - Performance review time
  - Promotion time
  - Any audit-critical event

**Audit Query Support**:
- System can answer: "What was this officer's grade when leave was approved?"
- Historical records are read-only
- Changes create new version entries, not overwrites

**UI Location**: Historical records accessible via staff profile view

### Terminating Staff

**Who Can Terminate**: HR_OFFICER, HR_DIRECTOR

**Process**:
1. Find staff member
2. Click "Terminate" button
3. Enter:
   - Termination date
   - Termination reason
4. Confirm termination
5. System:
   - Sets employment status to "terminated"
   - Deactivates user account
   - Prevents leave requests
   - Creates audit log

### Manager Assignment

**Who Can Assign**: HR_OFFICER, HR_DIRECTOR

**Process**:
1. Navigate to "Manager Assignment"
2. Choose assignment mode:
   - **Single Assignment**: One staff to one manager
   - **Bulk Assignment**: Multiple staff to one manager
3. Select staff member(s)
4. Select manager
5. Save assignment
6. System updates `immediateSupervisorId` and `managerId` fields

**UI Location**: `components/manager-assignment.tsx`

---

## 📝 Leave Portal Workflow

### Leave Request Submission (Employee)

**Step-by-Step Process**:

1. **Employee Navigates to "Apply for Leave"**
   - UI: `components/employee-portal.tsx` → "Apply for Leave" tab
   - Form: `components/leave-form.tsx`

2. **Fill Leave Application Form**:
   - Select **Leave Type**: Annual, Sick, Unpaid, Special Service, Training, Study, Maternity, Paternity, Compassionate
   - Select **Start Date** and **End Date**
   - System automatically:
     - Calculates number of days (excluding weekends and holidays)
     - Checks available balance
     - Validates no overlapping leaves
   - Enter **Reason** (required)
   - Upload **Attachments** (optional):
     - Medical certificates (Sick/Maternity)
     - Training letters (Training)
     - Official memos (Special Service)
   - **Handover Information** (for certain leave types):
     - Officer taking over duties
     - Handover notes
   - **Declaration**: "I will not proceed on leave without approval" (must accept)

3. **Submit Leave Request**:
   - System validates:
     - Sufficient balance
     - No overlapping dates
     - Required fields completed
   - System determines approval workflow based on:
     - Staff organizational structure (Unit, Directorate, Duty Station)
     - Leave type and duration
     - Senior staff status
   - Creates leave request with status "pending"
   - Creates approval steps in database
   - Sends notification to first approver

**API Endpoint**: `POST /api/leaves`

### Approval Workflow Determination

The system automatically determines the approval workflow based on staff organizational structure:

**For HQ/Directorate Staff**:
```
Employee → Supervisor → Unit Head → Directorate Head → HR Officer (Final)
```

**For Regional/District Staff**:
```
Employee → Supervisor → Regional Manager → Directorate (HQ) → HR Officer (Final)
```

**For Senior Staff/Directors**:
```
Employee → HR Director → Chief Director
```

**Special Case - HRMU Staff**:
```
Employee → Supervisor → Unit Head → Directorate Head → HR Director → HR Officer (Final)
```
(Additional HR Director approval for segregation of duties)

**Implementation**: `lib/mofa-approval-workflow.ts`

### Dynamic Approver Resolution & Fallback Logic

**Edge Case Handling**: The system must handle scenarios where approvers are unavailable.

**Dynamic Approver Resolution**:
- System resolves approver at approval time, not submission time
- If assigned approver is unavailable:
  - Checks for acting appointment
  - Checks for delegation
  - Falls back to role-based approver search
  - Escalates if no approver found

**Fallback Approver Logic**:
1. **Primary**: Assigned approver (immediateSupervisorId)
2. **Secondary**: Acting appointment for that role
3. **Tertiary**: Delegated approver
4. **Quaternary**: Next level approver (escalation)

**Escalation Timers**:
- If approval not acted upon in **5 working days**:
  - System sends reminder to approver
  - If no action after **10 working days**:
    - Escalates to next authority level
    - Notifies original approver and employee
    - Creates audit log entry

**Organizational Structure Changes**:
- If org structure changes mid-approval:
  - System preserves original workflow
  - New approvals use new structure
  - Historical approvals maintain original approver chain

**Approver Retirement/Transfer**:
- If approver retires/transfers mid-process:
  - System automatically reassigns to acting appointment
  - If no acting appointment, escalates to next level
  - Original approver's partial approval (if any) is preserved

**Implementation**: `lib/mofa-approval-workflow.ts` → `resolveApprover()`, `escalateApproval()`

### Approval Process (Multi-Level)

**Sequential Approval**:
- Each level must be approved before the next level can act
- System prevents skipping levels
- Each approver can:
  - **Approve**: Move to next level
  - **Reject**: Stop workflow, notify employee
  - **Delegate**: Assign to another approver temporarily

**Approval Steps**:

1. **First Level (SUPERVISOR)**:
   - Receives notification
   - Reviews leave request
   - Checks employee balance
   - Approves or rejects
   - If approved: Moves to next level

2. **Subsequent Levels** (UNIT_HEAD, DIVISION_HEAD, DIRECTOR, REGIONAL_MANAGER):
   - Only becomes active after previous level is approved
   - Reviews request
   - Approves or rejects
   - If approved: Moves to next level

3. **Final Level (HR_OFFICER)**:
   - Final approval authority
   - Reviews all previous approvals
   - Validates balance one final time
   - Approves or rejects
   - If approved:
     - Deducts leave balance
     - Updates leave status to "approved"
     - Locks leave record (prevents editing)
     - Sends notification to employee
     - Updates calendar

**UI Location**: `components/unified-leave-management.tsx`

**API Endpoint**: `PATCH /api/leaves/[id]/approve`

### Leave Balance Management

**Automatic Deduction**:
- Balance is deducted when HR_OFFICER approves leave
- System validates balance before approval
- Prevents approval if balance insufficient

**Leave Accrual**:
- Runs automatically on 1st of each month
- Can be triggered manually by HR
- Processes accrual for all active staff
- Based on leave policy configuration

**Year-End Processing**:
- Runs at end of year (December)
- Processes carry-forward and forfeiture
- Based on leave policy rules

**UI Location**: `components/employee-leave-balances.tsx`

### Offline Leave Submission Rules

**Critical Government-Safe Rule**: Offline behavior must prevent conflicts and data corruption.

**Allowed Offline**:
- ✅ **Employee Leave Submission**: Employees can submit leave requests offline
  - Request is queued locally
  - Synced when connection restored
  - Duplicate prevention on sync

**Disabled Offline**:
- ❌ **Approval Actions**: All approvers (Supervisor, Unit Head, Director, HR Officer) **cannot approve offline**
  - Approval buttons disabled when offline
  - Clear status message: "Approval requires online connection"
  - Prevents conflicting approvals
  - Prevents balance corruption

- ❌ **Final HR Approval**: HR Officer cannot finalize approval offline
  - Balance deduction requires online validation
  - Prevents double-deduction scenarios

**Sync Requirements**:
- System must sync before allowing any approval action
- Automatic sync check on approval page load
- Manual sync trigger available
- Sync status indicator visible to all users

**Conflict Resolution**:
- Server is authoritative source
- Local changes are queued and applied in order
- Conflicts resolved by timestamp (server wins)
- User notified of any conflicts

**Implementation**: `lib/offline-sync.ts`, `components/offline-indicator.tsx`

---

## 🔄 Role-Based User Workflows

### EMPLOYEE Workflow

**UI Portal**: `components/employee-portal.tsx`

**Available Tabs**:
1. **Dashboard** (`employee-dashboard.tsx`):
   - Pending leave requests count
   - Approved leaves count
   - Leave balances overview
   - Recent notifications
   - Quick actions: Apply for Leave, View History

2. **Apply for Leave** (`leave-form.tsx`):
   - Leave application form
   - Balance check
   - Date selection
   - Attachment upload

3. **Leave Balances** (`employee-leave-balances.tsx`):
   - View all leave types
   - Available days
   - Used days
   - Carry-forward information

4. **Leave History** (`employee-leave-history.tsx`):
   - All past and current leave requests
   - Status tracking
   - Approval history
   - Download approval letters

5. **Profile** (`employee-profile-view.tsx`):
   - Personal information
   - Employment details
   - Bank account
   - Tax information
   - Emergency contacts

6. **Documents** (`employee-documents.tsx`):
   - View own documents
   - Upload documents

7. **Payslips** (`employee-payslips.tsx`):
   - View payslip history
   - Download payslip PDFs

8. **Notifications** (`notification-center.tsx`):
   - View all notifications
   - Leave approval/rejection notifications
   - Balance updates

**Workflow**:
1. Login → Employee Portal
2. View Dashboard → See leave status
3. Apply for Leave → Fill form → Submit
4. Receive notification when approved/rejected
5. View Leave History → Track status
6. View Leave Balances → Check available days

---

### SUPERVISOR Workflow

**UI Portal**: `components/portal.tsx` → Supervisor Dashboard

**Available Tabs**:
1. **Dashboard** (`supervisor-dashboard.tsx`):
   - Team size
   - Pending approvals count
   - Team leave calendar
   - Team statistics

2. **My Team** (`manager-team-view.tsx`):
   - View all direct reports
   - Team member details
   - Leave balances
   - Recent leave requests

3. **Approve Leaves** (`unified-leave-management.tsx`):
   - View pending leave requests from team
   - Approve/Reject with comments
   - View approval history

4. **Leave Calendar** (`team-leave-calendar.tsx`):
   - Team leave calendar view
   - Filter by leave type
   - Export calendar

5. **Delegation** (`delegation-management.tsx`):
   - Delegate approvals to another manager
   - Set delegation dates
   - Revoke delegation

6. **Reports** (`reports.tsx`):
   - Team leave utilization
   - Team balance report
   - Export reports

**Workflow**:
1. Login → Supervisor Dashboard
2. View Dashboard → See pending approvals
3. Navigate to "Approve Leaves"
4. Review leave request details
5. Check employee balance
6. Approve or Reject with comments
7. System moves to next approval level (if approved)
8. View Team Calendar → See approved leaves

---

### UNIT_HEAD Workflow

**UI Portal**: `components/portal.tsx` → Unit Head Dashboard

**Available Tabs**:
1. **Dashboard** (`unit-head-dashboard.tsx`):
   - Unit staff count
   - Pending approvals
   - Unit leave calendar
   - Unit statistics

2. **My Team** (`manager-team-view.tsx`):
   - View all unit staff
   - Staff details
   - Leave balances

3. **Approve Leaves** (`unified-leave-management.tsx`):
   - View pending leave requests from unit
   - Approve/Reject
   - View approval chain

4. **Leave Calendar** (`team-leave-calendar.tsx`):
   - Unit leave calendar

5. **Reports** (`reports.tsx`):
   - Unit-level reports

**Workflow**:
Similar to Supervisor, but at unit level. Receives leave requests after Supervisor approval.

---

### DIRECTOR Workflow

**UI Portal**: `components/portal.tsx` → Director Dashboard

**Available Tabs**:
1. **Dashboard** (`director-dashboard.tsx`):
   - Directorate staff count
   - Pending approvals
   - Directorate leave calendar
   - Directorate statistics

2. **My Team** (`manager-team-view.tsx`):
   - View all directorate staff

3. **Approve Leaves** (`unified-leave-management.tsx`):
   - View pending leave requests from directorate
   - Approve/Reject

4. **Organizational Structure** (`organizational-structure.tsx`):
   - View directorate structure
   - Units and divisions

5. **Reports** (`reports.tsx`):
   - Directorate-level reports

**Workflow**:
Receives leave requests after Unit Head approval. Can view entire directorate.

---

### REGIONAL_MANAGER Workflow

**UI Portal**: `components/portal.tsx` → Manager Portal

**Available Tabs**:
1. **Dashboard**: Regional staff overview
2. **My Team**: Regional/district staff
3. **Approve Leaves**: Regional staff leave requests
4. **Leave Calendar**: Regional leave calendar
5. **Reports**: Regional reports

**Workflow**:
Receives leave requests from regional/district staff after Supervisor approval. Routes to HQ Directorate if needed.

---

### HR_OFFICER Workflow

**UI Portal**: `components/portal.tsx` → HR Officer Dashboard

**Available Tabs**:
1. **Dashboard** (`hr-officer-dashboard.tsx`):
   - Total staff count
   - Pending leaves (all organization)
   - Leave statistics
   - System alerts

2. **Staff Management** (`staff-management.tsx`):
   - View all staff
   - Add/Edit/Terminate staff
   - Bulk operations

3. **Manager Assignment** (`manager-assignment.tsx`):
   - Assign managers to staff
   - Bulk assignment

4. **Leave Management** (`unified-leave-management.tsx`):
   - View all leave requests organization-wide
   - Final approval authority
   - Filter by status, department, type
   - Bulk approve/reject

5. **Leave Policies** (`leave-policy-management.tsx`):
   - Configure leave types
   - Set accrual rates
   - Configure carry-forward rules
   - Set approval levels

6. **Holidays** (`holiday-calendar.tsx`):
   - Add/Edit holidays
   - Mark recurring holidays
   - Regional holidays

7. **Leave Templates** (`leave-templates.tsx`):
   - Create leave templates
   - Pre-fill common leave requests

8. **Year-End Processing** (`year-end-processing.tsx`):
   - Run year-end accrual
   - Process carry-forward
   - Process forfeiture

9. **Reports** (`reports.tsx`):
   - Organization-wide reports
   - Leave utilization
   - Balance reports
   - Custom reports

10. **Organizational Structure** (`organizational-structure.tsx`):
    - View entire organization
    - Units, divisions, directorates

**Workflow**:
1. Login → HR Officer Dashboard
2. View Dashboard → See pending leaves
3. Navigate to "Leave Management"
4. Review leave requests (filter as needed)
5. Check approval chain
6. Final approve or reject
7. System deducts balance (if approved)
8. Manage staff records
9. Configure leave policies
10. Generate reports

---

### HR_DIRECTOR Workflow

**UI Portal**: `components/portal.tsx` → HR Director Dashboard

**Available Tabs**:
Similar to HR_OFFICER, plus:
- **System Audit** (`audit-log-viewer.tsx`):
  - View audit logs
  - Compliance monitoring

- **Organizational Management**:
  - Manage organizational structure
  - Create/edit directorates, units

**Workflow**:
Similar to HR_OFFICER, but with additional authority:
- Can approve senior staff/director leave
- Can manage organizational structure
- Full audit access

---

### CHIEF_DIRECTOR Workflow

**UI Portal**: `components/portal.tsx` → Chief Director Dashboard

**Available Tabs**:
1. **Dashboard** (`chief-director-dashboard.tsx`):
   - Executive overview
   - Organization-wide statistics
   - High-level reports

2. **Staff Directory**:
   - View all staff (read-only)

3. **Approve Leaves**:
   - Approve Directors & HR Director leave
   - View all leave requests (read-only)

4. **Reports**:
   - Executive reports
   - System reports

5. **Audit Logs**:
   - View audit logs

**Workflow**:
1. Login → Chief Director Dashboard
2. View executive overview
3. Approve senior staff leave (Directors, HR Director)
4. Review reports
5. Monitor compliance

---

### AUDITOR Workflow

**UI Portal**: `components/auditor-portal.tsx`

**Available Tabs**:
1. **Dashboard**: Read-only overview
2. **Staff Directory**: View all staff (read-only)
3. **Leave Requests**: View all leave requests (read-only)
4. **Audit Logs** (`audit-log-viewer.tsx`):
   - Full audit log access
   - Filter by user, action, date
   - Export audit logs

5. **Reports**: View all reports (read-only)

**Workflow**:
1. Login → Auditor Portal
2. View all data (read-only)
3. Review audit logs
4. Generate compliance reports
5. Export data for audit purposes

**Restrictions**:
- Cannot approve leave
- Cannot edit staff records
- Cannot modify any data
- Read-only access to all features

---

### SYSTEM_ADMIN Workflow

**UI Portal**: `components/admin-portal.tsx`

**Available Tabs**:
1. **Dashboard** (`admin-dashboard.tsx`):
   - System health
   - User statistics
   - System alerts

2. **User Management** (`admin-user-management.tsx`):
   - Create/edit user accounts
   - Assign roles
   - Activate/deactivate users

3. **System Settings** (`admin-system-settings.tsx`):
   - Configure system settings
   - Email settings
   - Notification settings

4. **Audit Logs** (`admin-audit-logs.tsx`):
   - View system audit logs
   - User activity logs

5. **Password Reset Requests** (`admin-password-reset-requests.tsx`):
   - Manage password reset requests

6. **System Health** (`system-health.tsx`):
   - Monitor system status
   - Database health
   - API status

**Workflow**:
1. Login → Admin Portal
2. Manage user accounts
3. Configure system settings
4. Monitor system health
5. Review audit logs

**Restrictions**:
- **Cannot approve leave** (segregation of duties)
- **Cannot edit staff salary/contracts** (segregation of duties)
- Can create staff for system setup only

---

## 🎨 Role-Specific UI Components

### Employee UI

**Navigation**: `components/employee-navigation.tsx`
- Blue gradient background
- Icons: Dashboard, Apply Leave, Balances, History, Profile, Documents, Payslips, Notifications

**Dashboard**: `components/employee-dashboard.tsx`
- Cards showing: Pending, Approved, Balances
- Quick actions
- Recent notifications

**Leave Form**: `components/leave-form.tsx`
- Date picker
- Leave type selector
- Balance display
- Attachment upload
- Handover fields
- Declaration checkbox

### Manager/Supervisor UI

**Navigation**: `components/navigation.tsx` (manager role)
- Amber/gold theme
- Icons: Dashboard, My Team, Approve Leaves, Calendar, Delegation, Reports

**Team View**: `components/manager-team-view.tsx`
- Staff list with filters
- Staff details modal
- Leave balances per staff
- Recent leave requests

**Leave Approval**: `components/unified-leave-management.tsx`
- Leave request list
- Filter by status, type, date
- Approval/rejection buttons
- Comments field
- Approval history view

### HR UI

**Navigation**: `components/navigation.tsx` (hr role)
- Green theme
- Icons: Dashboard, Staff Management, Leave Management, Policies, Holidays, Reports, Organizational Structure

**Staff Management**: `components/staff-management.tsx`
- Staff list with search/filter
- Add/Edit/Terminate buttons
- Bulk operations
- Role-based filtering

**Leave Management**: `components/unified-leave-management.tsx`
- All leave requests
- Advanced filters
- Bulk approve/reject
- Approval chain view

**Leave Policies**: `components/leave-policy-management.tsx`
- Policy list
- Edit policy form
- Accrual configuration
- Carry-forward rules

### Admin UI

**Navigation**: `components/admin-navigation.tsx`
- Dark theme
- Icons: Dashboard, Users, Settings, Audit Logs, System Health

**User Management**: `components/admin-user-management.tsx`
- User list
- Create/Edit user
- Role assignment
- Account activation

---

## 🔐 Approval Workflow Details

### Workflow Determination Logic

**File**: `lib/mofa-approval-workflow.ts`

**Rules**:

1. **Senior Staff Detection**:
   - If position contains "Director" or grade includes "Director"
   - Workflow: HR_DIRECTOR → CHIEF_DIRECTOR

2. **HQ Staff**:
   - If dutyStation is "HQ" or null
   - Workflow: SUPERVISOR → UNIT_HEAD → (DIVISION_HEAD if exists) → DIRECTOR/CHIEF_DIRECTOR → (HR_DIRECTOR if HRMU) → HR_OFFICER

3. **Regional/District Staff**:
   - If dutyStation is "Region" or "District"
   - Workflow: SUPERVISOR → REGIONAL_MANAGER → DIRECTOR → HR_OFFICER

4. **HRMU Special Case**:
   - If unit is HRMU (Human Resource Management Unit)
   - Additional HR_DIRECTOR approval for segregation of duties

### Approval Step Tracking

**Database Model**: `ApprovalStep` (Prisma schema)

**Fields**:
- `level`: Sequential approval level (1, 2, 3, ...)
- `approverRole`: Required role for this step
- `approverStaffId`: Specific staff ID (if assigned)
- `status`: pending | approved | rejected | delegated | skipped
- `approvalDate`: When approved/rejected
- `comments`: Approval/rejection comments
- `previousLevelCompleted`: Whether previous level is complete

**Sequential Enforcement**:
- System checks `previousLevelCompleted` before allowing approval
- Cannot approve if previous level is not approved
- Prevents skipping levels

### Approval Permissions

**File**: `lib/mofa-rbac-middleware.ts`

**Checks**:
1. **Role Match**: User role must match `approverRole` for the step
2. **Sequential Approval**: Previous level must be approved
3. **Self-Approval Prevention**: Cannot approve own leave
4. **Unit Scope**: Manager roles can only approve within their scope
5. **Balance Validation**: System validates balance before final approval

---

## 📊 System Features by Role

### Employee Features
- ✅ View own profile
- ✅ Apply for leave
- ✅ View leave balances
- ✅ View leave history
- ✅ Upload documents
- ✅ View payslips
- ✅ Receive notifications
- ❌ Cannot approve leave
- ❌ Cannot view other staff

### Supervisor Features
- ✅ View direct reports
- ✅ Approve team leave (Level 1)
- ✅ View team calendar
- ✅ Delegate approvals
- ✅ View team reports
- ❌ Cannot approve own leave
- ❌ Cannot view other units

### Unit Head Features
- ✅ View unit staff
- ✅ Approve unit leave (Level 2)
- ✅ View unit calendar
- ✅ Manage unit
- ✅ View unit reports
- ❌ Cannot approve outside unit

### Director Features
- ✅ View directorate staff
- ✅ Approve directorate leave (Level 4)
- ✅ View directorate calendar
- ✅ Manage directorate
- ✅ View directorate reports
- ❌ Cannot approve outside directorate

### HR Officer Features
- ✅ View all staff
- ✅ Create/Edit/Terminate staff
- ✅ Final leave approval
- ✅ Manage leave policies
- ✅ Manage holidays
- ✅ Generate reports
- ✅ Manage organizational structure
- ❌ Cannot approve own leave

### HR Director Features
- ✅ All HR Officer features
- ✅ Approve senior staff leave
- ✅ Manage organizational structure
- ✅ View audit logs
- ✅ System reports

### Chief Director Features
- ✅ View all staff (read-only)
- ✅ Approve Directors & HR Director leave
- ✅ View executive reports
- ✅ View audit logs
- ❌ Cannot edit staff records

### Auditor Features
- ✅ View all data (read-only)
- ✅ View audit logs
- ✅ Generate compliance reports
- ✅ Export data
- ❌ Cannot approve leave
- ❌ Cannot edit any data

### System Admin Features
- ✅ Manage user accounts
- ✅ Configure system settings
- ✅ View audit logs
- ✅ Monitor system health
- ✅ Create staff (system setup only)
- ❌ Cannot approve leave (segregation of duties)
- ❌ Cannot edit staff salary/contracts

---

## 🔄 Complete Leave Request Lifecycle

### 1. Submission (Employee)
```
Employee fills form → Validates balance → Creates request → Status: "pending"
→ Creates approval steps → Notifies first approver
```

### 2. Level 1 Approval (Supervisor)
```
Supervisor receives notification → Reviews request → Approves/Rejects
→ If approved: Updates step status → Notifies next approver
→ If rejected: Updates request status → Notifies employee
```

### 3. Subsequent Levels (Unit Head, Division Head, Director, Regional Manager)
```
Approver receives notification → Reviews request → Approves/Rejects
→ If approved: Updates step status → Notifies next approver
→ If rejected: Updates request status → Notifies employee
```

### 4. Final Approval (HR Officer)
```
HR Officer receives notification → Reviews request → Approves/Rejects
→ If approved:
  - Deducts leave balance
  - Updates request status to "approved"
  - Locks leave record
  - Notifies employee
  - Updates calendar
→ If rejected: Updates request status → Notifies employee
```

### 5. Post-Approval
```
Employee receives notification → Views approved leave
→ Leave appears in calendar
→ Balance updated
→ Can download approval letter
```

---

## 📱 UI Navigation Structure

### Employee Portal
```
Dashboard
├── Apply for Leave
├── Leave Balances
├── Leave History
├── Profile
├── Documents
├── Payslips
└── Notifications
```

### Manager/Supervisor Portal
```
Dashboard
├── My Team
├── Approve Leaves
├── Leave Calendar
├── Delegation
└── Reports
```

### HR Portal
```
Dashboard
├── Staff Management
│   └── Manager Assignment
├── Leave Management
│   ├── Leave Policies
│   ├── Holidays
│   └── Leave Templates
├── Year-End Processing
├── Reports
└── Organizational Structure
```

### Admin Portal
```
Dashboard
├── User Management
├── System Settings
├── Audit Logs
├── Password Reset Requests
└── System Health
```

---

## 🔔 Notification System

### Notification Types

1. **Leave Approval**: When leave is approved
2. **Leave Rejection**: When leave is rejected
3. **Balance Update**: When balance is updated
4. **Approval Required**: When approver needs to act
5. **System Announcement**: General system notifications

### Notification Delivery

- **In-App**: Notification center in UI
- **Real-time**: WebSocket updates
- **Email**: Email notifications (if configured)
- **Push**: Browser push notifications (if enabled)

---

## 📈 Reporting Features

### Available Reports

1. **Leave Utilization Report**: Leave usage by staff/department
2. **Balance Report**: Current balances for all staff
3. **Approval Status Report**: Pending approvals by level
4. **Department Report**: Department-wise leave statistics
5. **Custom Report**: User-defined filters and fields

### Export Formats

- PDF
- Excel (XLSX)
- CSV

### Report Access

- **HR Roles**: All reports organization-wide
- **Managers**: Team-level reports only
- **Employees**: Own reports only

---

## 🔒 Security & Compliance

### Access Control

- **Role-Based Access Control (RBAC)**: Granular permissions per role
- **Unit-Based Scoping**: Managers can only access their scope
- **Self-Approval Prevention**: Cannot approve own leave
- **Sequential Approval**: Cannot skip approval levels

### Audit Trail

- All actions logged in audit log
- Includes: User, Action, Timestamp, IP Address, User Agent
- Immutable audit records
- Full audit log access for AUDITOR and HR_DIRECTOR

### Segregation of Duties

- **SYSTEM_ADMIN**: Cannot approve leave
- **SYSTEM_ADMIN**: Cannot edit staff salary/contracts
- **HRMU Staff**: Additional HR Director approval required

---

## 🎯 Key System Files Reference

### Core Components
- `components/portal.tsx` - Main portal router
- `components/employee-portal.tsx` - Employee UI
- `components/admin-portal.tsx` - Admin UI
- `components/auditor-portal.tsx` - Auditor UI

### Dashboards
- `components/employee-dashboard.tsx`
- `components/supervisor-dashboard.tsx`
- `components/unit-head-dashboard.tsx`
- `components/director-dashboard.tsx`
- `components/hr-officer-dashboard.tsx`
- `components/hr-director-dashboard.tsx`
- `components/chief-director-dashboard.tsx`

### Management Components
- `components/staff-management.tsx`
- `components/unified-leave-management.tsx`
- `components/leave-form.tsx`
- `components/manager-assignment.tsx`

### Workflow Logic
- `lib/mofa-approval-workflow.ts` - Approval workflow determination
- `lib/mofa-rbac-middleware.ts` - Permission checks
- `lib/permissions.ts` - Permission definitions

### API Routes
- `app/api/staff/route.ts` - Staff CRUD
- `app/api/leaves/route.ts` - Leave CRUD
- `app/api/leaves/[id]/approve/route.ts` - Leave approval

---

## 📞 Support & Documentation

### User Manuals
- `docs/USER-MANUAL-EMPLOYEE.md`
- `docs/USER-MANUAL-MANAGER.md`
- `docs/USER-MANUAL-HR.md`

### Technical Documentation
- `docs/ELECTRON-OFFLINE-ARCHITECTURE.md`
- `PROJECT_AUDIT_REPORT.md`

---

---

## 🔄 Offline & Synchronization Behavior

### Offline Capabilities Matrix

| Action | Employee | Supervisor | Unit Head | Director | HR Officer | System Admin |
|--------|----------|------------|-----------|----------|------------|--------------|
| View Data | ✅ Offline | ✅ Offline | ✅ Offline | ✅ Offline | ✅ Offline | ✅ Offline |
| Submit Leave | ✅ Offline | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A |
| Approve Leave | ❌ N/A | ❌ **Online Only** | ❌ **Online Only** | ❌ **Online Only** | ❌ **Online Only** | ❌ N/A |
| Edit Staff | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A | ❌ **Online Only** | ❌ **Online Only** |
| View Reports | ✅ Offline | ✅ Offline | ✅ Offline | ✅ Offline | ✅ Offline | ✅ Offline |

### Synchronization Rules

**Automatic Sync Triggers**:
- On application startup
- Before any approval action
- Every 5 minutes when online
- On manual sync request

**Sync Conflict Resolution**:
- **Server is authoritative** for all critical data
- Local changes queued with timestamps
- Last-write-wins for non-critical fields
- Critical fields (balance, approvals) require server validation

**Data Integrity Checks**:
- Balance validation on sync
- Approval step validation
- Duplicate detection
- Orphaned record cleanup

**Offline Queue Management**:
- Maximum queue size: 1000 items
- Queue persisted to local database
- Failed syncs retried with exponential backoff
- User notified of sync failures

**Implementation**: `electron/offline-sync.js`, `lib/use-offline.ts`

---

## 👔 Acting Appointments & Delegation

### Acting Appointments (Formal Authority)

**Definition**: Acting appointments are **formally recognized by PSC** and grant full role authority temporarily.

**Key Characteristics**:
- **Full Role Scope**: Acting appointee has complete authority of the role
- **Formal Recognition**: Must have appointment letter reference
- **Time-Bounded**: Effective date and end date required
- **Audit Trail**: All actions logged with "ACTING" prefix

**Use Cases**:
- Unit Head on extended leave → Acting Unit Head appointed
- Director on training → Acting Director appointed
- Supervisor on secondment → Acting Supervisor appointed

**Implementation**:
- `ActingAppointment` model in database
- Fields: `role`, `staffId`, `effectiveDate`, `endDate`, `authoritySource` (letter reference)
- System automatically resolves approvers to acting appointments
- Acting appointments override normal role assignments

**UI Location**: `components/acting-appointment-management.tsx` (HR only)

### Delegation (Temporary Permission)

**Definition**: Delegation grants **temporary permission to approve** but does not assume full role.

**Key Characteristics**:
- **Limited Scope**: Only approval permissions delegated
- **Temporary**: Start and end dates
- **Revocable**: Can be revoked anytime by delegator
- **Specific**: Can delegate specific leave types or all types

**Use Cases**:
- Supervisor on short leave → Delegates to another supervisor
- Unit Head on conference → Delegates to deputy
- Director on travel → Delegates to division head

**Differences from Acting Appointment**:
- Acting = Full role authority
- Delegation = Approval permission only
- Acting = Formal PSC recognition
- Delegation = Internal arrangement

**Implementation**: `components/delegation-management.tsx`

### Approval Priority Resolution

When multiple authorities exist, system resolves in this order:

1. **Acting Appointment** (highest priority)
2. **Delegation**
3. **Assigned Approver** (immediateSupervisorId)
4. **Role-Based Approver** (anyone with matching role in scope)
5. **Escalation** (next level authority)

---

## ⚠️ Edge Cases & Escalation

### Edge Case Handling

#### 1. Approver on Leave

**Scenario**: Supervisor is on leave when employee submits leave request.

**Resolution**:
- System checks for acting appointment
- If acting appointment exists → Routes to acting supervisor
- If no acting appointment → Checks for delegation
- If no delegation → Escalates to Unit Head
- Employee and original supervisor notified

#### 2. Approver Retires/Transfers Mid-Process

**Scenario**: Director retires while leave request is pending at their level.

**Resolution**:
- System detects approver status change
- Automatically reassigns to acting director
- If no acting director → Escalates to HR Director
- Original approval chain preserved in audit log
- Employee notified of reassignment

#### 3. Organizational Structure Changes

**Scenario**: Unit is reorganized while leave request is pending.

**Resolution**:
- System preserves original workflow structure
- Historical approvals maintain original approver chain
- New approvals use new organizational structure
- Audit log shows both old and new structure

#### 4. Multiple Pending Approvals for Same Employee

**Scenario**: Employee has multiple leave requests pending simultaneously.

**Resolution**:
- System validates total days against balance
- Prevents over-allocation
- Approvals processed in submission order
- Balance updated sequentially

#### 5. Balance Insufficient After Approval

**Scenario**: Balance becomes insufficient due to concurrent approvals.

**Resolution**:
- System validates balance at each approval level
- Final HR approval validates balance one last time
- If insufficient at final approval → Rejection with reason
- Previous approvals remain valid (workflow integrity)

### Escalation Rules

**Automatic Escalation Triggers**:
- No action after **5 working days** → Reminder sent
- No action after **10 working days** → Escalates to next level
- Approver unavailable (on leave, retired) → Immediate escalation

**Escalation Path**:
- Supervisor → Unit Head
- Unit Head → Division Head (if exists) or Director
- Director → HR Director
- Regional Manager → Directorate (HQ) → HR Officer

**Escalation Notifications**:
- Original approver notified
- Employee notified
- New approver notified
- Audit log entry created

**Implementation**: `lib/escalation-engine.ts`

---

## 📜 Data Retention & Legal Compliance

### Data Retention Policy (Ghana Data Protection Act Compliance)

**Retention Periods**:

| Data Type | Retention Period | Post-Retention Action |
|-----------|----------------|---------------------|
| Leave Requests | **7 years** | Archive to cold storage |
| Staff Records (Active) | **Indefinite** | Maintain while active |
| Staff Records (Terminated) | **10 years** | Archive, then delete |
| Audit Logs | **10 years** | Archive, then delete |
| Payslips | **7 years** | Archive, then delete |
| Performance Reviews | **7 years** | Archive, then delete |

**Archival Process**:
- Data moved to read-only archive database
- Compressed and encrypted
- Accessible for audit purposes only
- Cannot be modified

**Deletion Rules**:
- Automatic deletion after retention period
- Requires HR Director approval for early deletion
- Audit log entry for all deletions
- Legal hold can prevent deletion

### Legal Hold

**Purpose**: Freeze records during investigations or legal proceedings.

**Implementation**:
- HR Director or Chief Director can place legal hold
- Prevents deletion or modification
- Extends retention period automatically
- Audit log entry created
- Notification to relevant parties

**UI Location**: `components/legal-hold-management.tsx` (HR Director only)

### Export Control

**Who Can Export What**:

| Role | Staff Data | Leave Data | Audit Logs | Reports |
|------|------------|------------|------------|---------|
| Employee | Own only | Own only | ❌ | Own only |
| Supervisor | Team only | Team only | ❌ | Team only |
| HR Officer | All | All | ❌ | All |
| HR Director | All | All | ✅ | All |
| Auditor | All (read-only) | All (read-only) | ✅ | All |
| System Admin | All | All | ✅ | All |

**Export Formats**:
- PDF (for official documents)
- Excel (for data analysis)
- CSV (for system import)
- JSON (for technical purposes)

**Export Audit**:
- All exports logged
- Includes: User, Data Type, Date Range, Record Count
- Exported files watermarked with export metadata

**Implementation**: `app/api/export/route.ts`

### Privacy & Data Protection

**Personal Data Handling**:
- Encryption at rest and in transit
- Access logs for sensitive data
- Right to access (employees can request their data)
- Right to rectification (employees can request corrections)
- Data minimization (only collect necessary data)

**Compliance**:
- Ghana Data Protection Act, 2012 (Act 843)
- PSC Data Handling Guidelines
- OHCS HRMIS Security Standards

---

## 💾 Disaster Recovery & Data Loss Prevention

### Backup Strategy

**Server-Side Backups**:
- **Full Database Backup**: Daily at 2:00 AM
- **Incremental Backup**: Every 6 hours
- **Transaction Log Backup**: Every 15 minutes
- **Retention**: 30 days full, 7 days incremental, 24 hours transaction logs

**Local (Electron) Backups**:
- **Encrypted Local Backup**: Daily when online
- **Backup Location**: User's Documents folder (encrypted)
- **Backup Retention**: 7 days local backups
- **Automatic Cleanup**: Old backups removed automatically

**Backup Verification**:
- Automated backup integrity checks
- Monthly restore tests
- Backup encryption validation

### Data Loss Prevention

**Server-Side Authoritative Recovery**:
- Server is **single source of truth**
- Local data can be recovered from server
- Corrupted local data can be reset
- No data loss if server is intact

**Corruption Recovery**:
- Automatic corruption detection
- Local database integrity checks on startup
- Automatic repair attempts
- Manual reset option (with server sync)

**Device Loss Scenario**:
- User reports device loss to HR
- HR can:
  - Revoke device access
  - Force password reset
  - Clear local data (if device recovered)
- User can restore from server on new device
- No data loss (all data on server)

**Sync Conflict Resolution**:
- Server always wins for critical data
- Local changes queued and validated
- User notified of conflicts
- Manual resolution option for non-critical conflicts

### Recovery Procedures

**Full System Recovery**:
1. Restore from latest full backup
2. Apply incremental backups in order
3. Apply transaction logs
4. Verify data integrity
5. Test critical workflows

**Point-in-Time Recovery**:
- Can restore to any point within retention period
- Requires HR Director approval
- Audit log entry created
- Notification to affected users

**Local Data Recovery**:
1. User reports issue
2. System validates local database
3. If corrupted → Reset local database
4. Sync from server
5. User data restored

**Implementation**: `scripts/backup-restore.ts`, `electron/backup-manager.js`

### Business Continuity

**High Availability**:
- Server redundancy (primary + secondary)
- Automatic failover
- Load balancing
- Database replication

**Disaster Recovery Plan**:
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 15 minutes
- Off-site backup storage
- Documented recovery procedures

**Testing**:
- Quarterly disaster recovery drills
- Annual full system recovery test
- Monthly backup restore verification

---

## 🎨 UX Enhancements for Disabled States

### Offline Status Indicators

**Visual Indicators**:
- **Online**: Green dot with "Online" text
- **Offline**: Red dot with "Offline" text
- **Syncing**: Yellow dot with "Syncing..." text
- **Sync Error**: Red dot with "Sync Failed" text

**Location**: Top-right corner of all pages

**Tooltips**:
- Hover over status shows:
  - Last sync time
  - Queued items count
  - Connection status

### Disabled Action Explanations

**Approval Buttons (When Offline)**:
- Button disabled with tooltip: "Approval requires online connection. Please connect to the internet and sync."
- Status banner: "You are currently offline. Some actions are unavailable."

**Permission-Based Disabling**:
- Tooltip: "You don't have permission to perform this action. Required role: [Role Name]"
- Status message: "This action requires [Permission] permission."

**Balance-Based Disabling**:
- Tooltip: "Insufficient leave balance. Available: [X] days, Required: [Y] days"
- Clear error message in form

**Implementation**: `components/offline-indicator.tsx`, `components/permission-tooltip.tsx`

---

## 📊 Notification Queue & Deduplication

### Offline Notification Handling

**Notification Queue**:
- Notifications generated offline are queued locally
- Queued notifications synced when online
- Maximum queue size: 500 notifications
- Old notifications expire after 30 days

**Deduplication Logic**:
- Server assigns unique notification IDs
- Local queue checks for duplicates before adding
- Sync process prevents duplicate delivery
- User sees each notification once

**Notification Delivery Priority**:
1. Critical (approval required) - Immediate
2. Important (balance update) - Within 1 hour
3. Informational (system announcement) - Within 24 hours

**Implementation**: `lib/notification-queue.ts`

---

**End of System Process & Workflow Documentation**

**Document Version History**:
- **v1.0**: Initial comprehensive documentation
- **v1.1**: Added offline behavior, acting appointments, edge cases, data retention, disaster recovery, and UX enhancements per government audit review

