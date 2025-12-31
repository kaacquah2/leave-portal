# MoFA HR Staff Management & Leave Portal System
## Complete System Documentation

**Version**: 2.0  
**Last Updated**: December 2024  
**Organization**: Ministry of Fisheries and Aquaculture (MoFA), Ghana  
**Status**: Production Ready

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Organizational Structure](#2-organizational-structure)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Staff Management System](#4-staff-management-system)
5. [Leave Management System](#5-leave-management-system)
6. [Approval Workflows](#6-approval-workflows)
7. [Features & Capabilities](#7-features--capabilities)
8. [Technical Architecture](#8-technical-architecture)
9. [API Documentation](#9-api-documentation)
10. [Database Schema](#10-database-schema)
11. [Processes & Workflows](#11-processes--workflows)
12. [Security & Compliance](#12-security--compliance)
13. [Deployment & Operations](#13-deployment--operations)

---

## 1. System Overview

### 1.1 Purpose

The MoFA HR Staff Management & Leave Portal is a comprehensive digital solution designed to:

- **Digitize Staff Records** - Complete employee lifecycle management from onboarding to termination
- **Automate Leave Management** - Streamlined leave application, approval, and tracking workflows
- **Improve Transparency** - Clear audit trails, real-time updates, and comprehensive reporting
- **Reduce Administrative Burden** - Automated processes, notifications, and self-service capabilities
- **Ensure Compliance** - Policy enforcement, approval workflows, and audit logging aligned with Ghana Government Public Service standards

### 1.2 Key Features

- ✅ **Multi-Role Access Control** - 11 distinct roles with granular permissions
- ✅ **Leave Management** - 9 leave types with multi-level approval workflows
- ✅ **Staff Management** - Complete CRUD operations with organizational structure validation
- ✅ **Leave Policies** - Configurable policies with templates and approval levels
- ✅ **Holiday Calendar** - Public and organizational holiday management
- ✅ **Payslip Management** - Employee payslip viewing and management
- ✅ **Performance Reviews** - Employee performance tracking and reviews
- ✅ **Real-time Updates** - Server-Sent Events (SSE) for live notifications
- ✅ **Push Notifications** - Browser push notifications for important updates
- ✅ **Audit Logging** - Complete activity tracking for compliance
- ✅ **Mobile Support** - Responsive design and mobile app support

### 1.3 Technology Stack

- **Framework**: Next.js 15.5.6 (React 19)
- **Database**: Neon PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT with session management
- **Deployment**: Vercel (recommended)
- **Language**: TypeScript

---

## 2. Organizational Structure

### 2.1 MoFA Hierarchy

The system supports the complete MoFA organizational structure:

```
Chief Director (Top Level)
├── Office of the Minister (3 units)
│   ├── Ministerial Secretariat
│   ├── Protocol Unit
│   └── Public Affairs / Communications Unit
│
├── Office of the Chief Director (5 units)
│   ├── Policy, Planning, Monitoring & Evaluation (PPME) Unit
│   ├── Internal Audit Unit
│   ├── Legal Unit
│   ├── Research, Statistics & Information Management (RSIM) Unit
│   └── Procurement Unit
│
├── Finance & Administration Directorate (6 units)
│   ├── Human Resource Management Unit (HRMU) ⚠️ SPECIAL
│   ├── Accounts Unit
│   ├── Budget Unit
│   ├── Stores Unit
│   ├── Transport & Logistics Unit
│   └── Records / Registry Unit
│
└── Policy, Planning, Monitoring & Evaluation (PPME) Directorate (4 units)
    ├── Policy Analysis Unit
    ├── Monitoring & Evaluation Unit
    ├── Project Coordination Unit
    └── ICT Unit
```

**Total: 18 Units**

### 2.2 Organizational Levels

1. **Chief Director** - Top level authority
2. **Directorate** - Finance & Administration, PPME
3. **Unit** - 18 functional units
4. **Duty Station** - HQ, Region, District, Agency

### 2.3 Special Cases

- **HRMU (Human Resource Management Unit)**: Requires 5-level approval workflow (includes HR Director step)
- **Internal Audit Unit**: Unit Head role is AUDITOR (read-only access)
- **Chief Director Units**: Units reporting directly to Chief Director (no directorate assignment)

---

## 3. User Roles & Permissions

### 3.1 MoFA Role System

The system implements exact MoFA role codes:

| Role Code | Display Name | Approval Level | Key Permissions |
|-----------|--------------|---------------|----------------|
| `EMPLOYEE` | Employee | N/A | Submit leave, view own data, view balance |
| `SUPERVISOR` | Supervisor | Level 1 | Approve direct reports, view team data |
| `UNIT_HEAD` | Unit Head | Level 2 | Approve unit staff, view unit reports |
| `DIVISION_HEAD` | Division Head | Level 3 | Approve division staff, view division reports |
| `DIRECTOR` | Director | Level 4 | Approve directorate staff, view directorate reports |
| `REGIONAL_MANAGER` | Regional Manager | Regional | Approve regional staff, route to HQ |
| `HR_OFFICER` | HR Officer | Final | Final approval, manage policies, generate letters |
| `HR_DIRECTOR` | HR Director | Senior | Approve senior staff, override approvals |
| `CHIEF_DIRECTOR` | Chief Director | Executive | Approve Directors & HR Director |
| `AUDITOR` | Internal Auditor | Read-Only | View all records, audit logs, export reports |
| `SYS_ADMIN` | System Admin | System | User management, role assignment, system config |

### 3.2 Legacy Roles (Backward Compatibility)

- `employee`, `supervisor`, `manager`, `hr`, `hr_assistant`, `admin`, `deputy_director`

### 3.3 Permission Matrix

**Employee Permissions:**
- View own staff profile
- View own leave requests
- Create leave requests
- View own leave balance
- View own payslips
- View own performance reviews

**Manager/Supervisor Permissions:**
- All employee permissions
- View team staff profiles
- Approve team leave requests (Level 1)
- View team leave requests
- View team leave balances
- View team performance reviews

**HR Permissions:**
- All manager permissions
- Create/edit staff members
- View all staff
- Approve leave requests (Final level)
- Manage leave policies
- Manage holidays
- Manage leave templates
- View all leave requests
- Generate reports

**Admin Permissions:**
- All HR permissions
- User account management
- Role assignment
- System configuration
- Audit log access

---

## 4. Staff Management System

### 4.1 Staff Creation Process

#### Step 1: HR Officer Creates Staff Record

**Required Information:**

**Basic Personal Information:**
- Staff ID (unique, e.g., MFA-001)
- First Name
- Last Name
- Email (unique, format: email@mofa.gov.gh)
- Phone
- Join Date

**Organizational Structure:**
- Unit (from 18 approved MoFA units)
- Directorate (auto-set based on unit)
- Duty Station (HQ, Region, District, Agency)
- Division (optional, not commonly used)

**Employment Details:**
- Position
- Grade (PSS, SSS, DSS, USS, MSS, JSS 1-6)
- Level (1-12, government structure)
- Rank (Chief Director, Director, Principal Officer, etc.)
- Step (1-15, within grade)
- Department

**Reporting Structure:**
- Immediate Supervisor (Staff ID)
- Manager (Staff ID, for team assignment)

**Validation Rules:**
- ✅ Staff ID must be unique
- ✅ Email must be unique
- ✅ Unit must exist in MoFA approved units list
- ✅ Unit-directorate relationship must be correct
- ✅ If unit reports to Chief Director, directorate must be empty
- ✅ Manager/Supervisor must exist and be active
- ✅ Cannot assign self as supervisor

**What Gets Created:**
- ✅ StaffMember record
- ✅ LeaveBalance record (all balances initialized to 0)
- ✅ Audit log entry
- ❌ **NO User account** (created separately by Admin)

#### Step 2: Admin Creates Login Credentials

**Process:**
1. Admin navigates to User Management
2. Selects existing staff member
3. Creates user account with:
   - Email (must match staff email)
   - Password
   - Role (based on staff position)
4. System links user account to staff record via `staffId`

**API Endpoint:** `POST /api/admin/users/create-credentials`

### 4.2 Staff Update Process

**Who Can Update:**
- HR Officers
- HR Directors
- System Admins

**Updateable Fields:**
- Personal information (name, email, phone)
- Organizational structure (unit, directorate, duty station)
- Employment details (position, grade, level, rank, step)
- Reporting structure (manager, supervisor)
- Employment status (active, terminated, resigned, retired, suspended)
- Termination information (if applicable)

**Validation:**
- Same validation rules as creation
- Cannot change staffId (immutable)
- Termination date required if status is terminated/resigned/retired

### 4.3 Staff Termination Process

**Process:**
1. HR updates staff employment status to "terminated", "resigned", or "retired"
2. System requires termination date
3. Optional termination reason
4. Staff record marked as inactive
5. User account can be deactivated (separate action)
6. Audit log entry created

**Impact:**
- Staff can no longer submit leave requests
- Existing leave requests remain in system
- Leave balance preserved for historical records
- Staff appears in terminated staff reports

### 4.4 Staff Data Access

**Employee Access:**
- Can only view own staff record
- Cannot edit any information

**Manager Access:**
- Can view direct reports
- Can view team members (if managerId matches)
- Cannot edit staff information

**HR Access:**
- Can view all staff
- Can filter by unit, directorate, duty station
- Can create, update, and terminate staff

---

## 5. Leave Management System

### 5.1 Leave Types

The system supports 9 leave types:

1. **Annual Leave** - Standard annual vacation leave
2. **Sick Leave** - Medical leave with documentation
3. **Unpaid Leave** - Leave without pay
4. **Special Service Leave** - Special assignments or duties
5. **Training Leave** - Professional development and training
6. **Study Leave** - Educational leave
7. **Maternity Leave** - Maternity leave for female staff
8. **Paternity Leave** - Paternity leave for male staff
9. **Compassionate Leave** - Bereavement and family emergencies

### 5.2 Leave Request Process

#### Step 1: Employee Submits Leave Request

**Required Information:**
- Leave Type
- Start Date
- End Date
- Reason
- Officer Taking Over (MoFA compliance)
- Handover Notes (MoFA compliance)
- Declaration Acceptance (MoFA compliance)
- Attachments (optional, e.g., medical certificates)

**System Validations:**
- ✅ Leave balance must be sufficient
- ✅ Dates must be valid (end date after start date)
- ✅ No overlapping leave requests
- ✅ Required fields must be filled
- ✅ Declaration must be accepted

**What Happens:**
1. System calculates number of days (excluding holidays)
2. System checks leave balance
3. System determines approval workflow based on:
   - Staff organizational structure
   - Duty station
   - Unit assignment
   - Leave type and days
4. System creates LeaveRequest with status "pending"
5. System creates ApprovalSteps in database
6. System sends notifications to first-level approvers
7. System creates audit log entry

#### Step 2: Approval Workflow

See [Section 6: Approval Workflows](#6-approval-workflows) for detailed workflow information.

#### Step 3: Leave Balance Update

**When Approved:**
- Leave balance is automatically deducted
- Balance deduction logged in audit log
- Payroll impact flag set (if applicable)
- Leave request locked (cannot be edited)

**When Rejected:**
- Leave balance remains unchanged
- Rejection reason stored
- Employee notified

**When Cancelled:**
- If previously approved, balance is restored
- Cancellation reason stored
- Employee notified

### 5.3 Leave Balance Management

**Balance Fields:**
- Annual
- Sick
- Unpaid
- Special Service
- Training
- Study
- Maternity
- Paternity
- Compassionate

**Balance Features:**
- Automatic accrual tracking
- Carry-forward support
- Expiration tracking
- Accrual history
- Balance restoration on cancellation

**Who Can View:**
- Employees: Own balance only
- Managers: Team balances
- HR: All balances

**Who Can Update:**
- HR Officers only
- System Admins

### 5.4 Leave Policies

**Policy Configuration:**
- Leave type
- Maximum days
- Accrual rate (days per month)
- Accrual frequency (monthly, annual, quarterly)
- Carry-over allowed (yes/no)
- Maximum carry-over days
- Expiration (months after which unused leave expires)
- Requires approval (yes/no)
- Approval levels (1-5)

**Policy Management:**
- Only HR can create/update policies
- Policies can be activated/deactivated
- Policies apply to all staff (or can be department-specific)

### 5.5 Leave Templates

**Purpose:** Pre-configured leave request templates for common scenarios

**Template Fields:**
- Name
- Leave Type
- Default Days
- Default Reason
- Department (optional)
- Active Status

**Usage:**
- Employees can select template when creating leave request
- Template pre-fills form fields
- Employee can modify template values

---

## 6. Approval Workflows

### 6.1 Workflow Types

The system automatically determines workflow based on staff organizational structure:

#### Type A: HQ Staff - Standard Directorate Units (9 units)

**Workflow Pattern:**
```
EMPLOYEE submits
  ↓
SUPERVISOR (Level 1) - Immediate supervisor approval
  ↓
UNIT_HEAD (Level 2) - Unit head approval
  ↓
DIRECTOR (Level 3) - Directorate head approval
  ↓
HR_OFFICER (Level 4 - Final) - Final approval, balance deduction
```

**Units:**
- Accounts Unit
- Budget Unit
- Stores Unit
- Transport & Logistics Unit
- Records / Registry Unit
- Policy Analysis Unit
- Monitoring & Evaluation Unit
- Project Coordination Unit
- ICT Unit

#### Type B: HQ Staff - Chief Director Units (8 units)

**Workflow Pattern:**
```
EMPLOYEE submits
  ↓
SUPERVISOR (Level 1) - Immediate supervisor approval
  ↓
UNIT_HEAD (Level 2) - Unit head approval
  ↓
CHIEF_DIRECTOR (Level 3) - Chief Director approval
  ↓
HR_OFFICER (Level 4 - Final) - Final approval, balance deduction
```

**Units:**
- Ministerial Secretariat
- Protocol Unit
- Public Affairs / Communications Unit
- Policy, Planning, Monitoring & Evaluation (PPME) Unit
- Internal Audit Unit
- Legal Unit
- Research, Statistics & Information Management (RSIM) Unit
- Procurement Unit

#### Type C: HRMU Special Case (1 unit)

**Workflow Pattern:**
```
EMPLOYEE submits
  ↓
SUPERVISOR (Level 1) - Immediate supervisor approval
  ↓
UNIT_HEAD (Level 2) - Unit head approval
  ↓
DIRECTOR (Level 3) - Directorate head approval
  ↓
HR_DIRECTOR (Level 4) - HR Director approval (segregation of duties)
  ↓
HR_OFFICER (Level 5 - Final) - Final approval, balance deduction
```

**Special Requirements:**
- HRMU staff require HR Director approval before final HR Officer approval
- Ensures proper segregation of duties
- Only unit with 5-level workflow

#### Type D: Regional/District Staff

**Workflow Pattern:**
```
EMPLOYEE submits
  ↓
SUPERVISOR (Level 1) - Regional supervisor approval
  ↓
REGIONAL_MANAGER (Level 2) - Regional manager approval
  ↓
DIRECTOR (Level 3) - HQ Directorate approval (if applicable)
  ↓
HR_OFFICER (Level 4 - Final) - Final approval, balance deduction
```

#### Type E: Senior Staff/Directors

**Workflow Pattern:**
```
EMPLOYEE (Director/HR Director) submits
  ↓
HR_DIRECTOR (Level 1) - HR Director approval
  ↓
CHIEF_DIRECTOR (Level 2 - Final) - Chief Director approval
```

**Applies To:**
- Directors
- Deputy Directors
- Chief Director
- HR Director

### 6.2 Approval Process

#### Approval Steps

Each approval level creates an `ApprovalStep` record in the database:

**Step Fields:**
- `level`: Sequential approval level (1, 2, 3, ...)
- `approverRole`: Required MoFA role code
- `approverStaffId`: Specific staff ID assigned (if known)
- `approverUserId`: User ID of approver (when assigned)
- `status`: 'pending' | 'approved' | 'rejected' | 'delegated' | 'skipped'
- `approverName`: Name of approver (when approved/rejected)
- `approvalDate`: When approved/rejected
- `comments`: Approval/rejection comments
- `previousLevelCompleted`: Whether previous level is complete

#### Approval Rules

**Sequential Approval:**
- ✅ Cannot skip approval levels
- ✅ Previous level must be completed before next level
- ✅ Error code: `SEQUENTIAL_APPROVAL_REQUIRED`

**Self-Approval Prevention:**
- ✅ System prevents users from approving their own leave requests
- ✅ Validated at API level with RBAC middleware
- ✅ Error code: `SELF_APPROVAL_NOT_ALLOWED`

**Role-Based Hierarchy:**
- ✅ Approver role must match required role for step
- ✅ Specific approver assignment support
- ✅ Error codes: `ROLE_MISMATCH`, `NOT_ASSIGNED_APPROVER`

**Unit-Based Access Control:**
- ✅ Managers can only approve within their scope
- ✅ SUPERVISOR: Direct reports only
- ✅ UNIT_HEAD: Same unit
- ✅ DIVISION_HEAD: Same division
- ✅ DIRECTOR: Same directorate
- ✅ REGIONAL_MANAGER: Regional/district staff

### 6.3 Approval Actions

#### Approve

**Process:**
1. Approver reviews leave request
2. Approver clicks "Approve"
3. System validates:
   - Approver has correct role
   - Previous level is complete
   - Not self-approval
   - Within organizational scope
4. System updates ApprovalStep status to "approved"
5. System creates LeaveApprovalHistory entry
6. System checks if all levels approved:
   - If yes: Updates LeaveRequest status to "approved", deducts balance
   - If no: Moves to next approval level, notifies next approvers
7. System sends notifications:
   - To employee (if final approval)
   - To next approvers (if more levels)
   - To HR (if final approval)

#### Reject

**Process:**
1. Approver reviews leave request
2. Approver clicks "Reject" and provides reason
3. System validates (same as approve)
4. System updates ApprovalStep status to "rejected"
5. System updates LeaveRequest status to "rejected"
6. System creates LeaveApprovalHistory entry
7. System sends notification to employee
8. **Workflow stops** - no further approvals

#### Delegate

**Process:**
1. Approver delegates to another user
2. System validates delegate has appropriate role
3. System updates ApprovalStep with delegate information
4. System sends notification to delegate
5. Delegate can approve/reject on behalf of original approver

### 6.4 Leave Status

**Status Values:**
- `pending` - Awaiting approval
- `approved` - All levels approved, balance deducted
- `rejected` - Rejected at any level
- `cancelled` - Cancelled by employee or HR

**Status Transitions:**
- `pending` → `approved` (all levels approved)
- `pending` → `rejected` (any level rejected)
- `pending` → `cancelled` (employee/HR cancels)
- `approved` → `cancelled` (employee/HR cancels, balance restored)

---

## 7. Features & Capabilities

### 7.1 Staff Management Features

- ✅ **Complete Staff Profiles**
  - Personal information
  - Organizational assignment
  - Employment details
  - Reporting structure
  - Photo upload
  - Employment status tracking

- ✅ **Organizational Structure Validation**
  - Unit-directorate relationship validation
  - Chief Director unit detection
  - HRMU special case handling
  - Duty station management

- ✅ **Staff Search & Filtering**
  - Search by name, staff ID, email
  - Filter by unit, directorate, duty station
  - Filter by employment status
  - Filter by active/inactive

- ✅ **Bulk Operations**
  - Bulk manager assignment
  - Bulk status updates
  - Bulk export

### 7.2 Leave Management Features

- ✅ **Leave Request Management**
  - Create leave requests
  - View leave history
  - Cancel leave requests
  - View approval status
  - Download approval letters

- ✅ **Leave Balance Tracking**
  - Real-time balance updates
  - Accrual tracking
  - Carry-forward management
  - Expiration tracking
  - Balance history

- ✅ **Leave Calendar**
  - View all staff leave
  - Filter by unit, directorate
  - Export calendar
  - Holiday integration

- ✅ **Leave Templates**
  - Pre-configured templates
  - Department-specific templates
  - Quick leave submission

### 7.3 Approval Features

- ✅ **Multi-Level Approval**
  - Automatic workflow determination
  - Sequential approval enforcement
  - Parallel approval support (future)
  - Delegation support

- ✅ **Approval Dashboard**
  - Pending approvals list
  - Team approvals view
  - Approval history
  - Escalation alerts

- ✅ **Notifications**
  - In-app notifications
  - Email notifications
  - Push notifications
  - Escalation reminders

### 7.4 Reporting Features

- ✅ **Leave Reports**
  - Leave utilization by unit/directorate
  - Leave balance reports
  - Approval time reports
  - Leave type distribution

- ✅ **Compliance Reports**
  - Audit trail reports
  - Policy compliance reports
  - Approval chain reports

- ✅ **Analytics**
  - Leave trends
  - Approval patterns
  - Staff utilization
  - Policy effectiveness

### 7.5 Additional Features

- ✅ **Holiday Management**
  - Public holidays
  - Organizational holidays
  - Recurring holidays
  - Holiday calendar

- ✅ **Payslip Management**
  - Employee payslip viewing
  - Payslip history
  - PDF download

- ✅ **Performance Reviews**
  - Performance review tracking
  - Review history
  - Rating system

- ✅ **Audit Logging**
  - Complete activity tracking
  - User action logging
  - System event logging
  - Compliance reporting

---

## 8. Technical Architecture

### 8.1 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Web App    │  │  Mobile App  │  │ Desktop App  │ │
│  │  (Next.js)   │  │   (Expo)     │  │  (Electron)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└───────────────────────┬───────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────┐
│                  API Layer (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Auth API    │  │  Staff API    │  │  Leave API   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Policy API  │  │  Report API  │  │  Audit API   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└───────────────────────┬───────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────┐
│                Business Logic Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Workflow    │  │  Permissions │  │  Validation  │ │
│  │   Engine     │  │     RBAC     │  │    Rules     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└───────────────────────┬───────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────┐
│                  Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Prisma     │  │  PostgreSQL  │  │   Cache     │ │
│  │     ORM      │  │   (Neon)     │  │  (Redis)     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Key Components

**Frontend:**
- Next.js 15.5.6 with App Router
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui components

**Backend:**
- Next.js API Routes
- Prisma ORM
- JWT authentication
- Session management

**Database:**
- Neon PostgreSQL
- Connection pooling
- Migrations via Prisma

**Real-time:**
- Server-Sent Events (SSE)
- WebSocket support (future)

**Notifications:**
- In-app notifications
- Email notifications (SMTP)
- Push notifications (Web Push API)

### 8.3 Data Flow

**Leave Request Submission:**
```
Employee → Frontend → API Route → Validation → Workflow Engine → 
Database → Approval Steps → Notifications → Real-time Update
```

**Approval Process:**
```
Approver → Frontend → API Route → RBAC Check → Permission Validation → 
Approval Step Update → Workflow Check → Balance Update → Notifications
```

---

## 9. API Documentation

### 9.1 Authentication APIs

**POST /api/auth/login**
- Description: User login
- Body: `{ email, password }`
- Response: `{ user, token }`

**POST /api/auth/logout**
- Description: User logout
- Headers: `Authorization: Bearer <token>`
- Response: `{ message: "Logged out" }`

**GET /api/auth/me**
- Description: Get current user
- Headers: `Authorization: Bearer <token>`
- Response: `{ user, staff }`

### 9.2 Staff APIs

**GET /api/staff**
- Description: Get all staff (filtered by role)
- Roles: All authenticated users
- Query Params: `unit`, `directorate`, `dutyStation`, `active`
- Response: `StaffMember[]`

**POST /api/staff**
- Description: Create new staff member
- Roles: HR_OFFICER, HR_DIRECTOR, SYS_ADMIN
- Body: StaffMember data
- Response: `StaffMember`

**GET /api/staff/[id]**
- Description: Get single staff member
- Roles: All authenticated users (with scope restrictions)
- Response: `StaffMember`

**PATCH /api/staff/[id]**
- Description: Update staff member
- Roles: HR_OFFICER, HR_DIRECTOR, SYS_ADMIN
- Body: Partial StaffMember data
- Response: `StaffMember`

### 9.3 Leave APIs

**GET /api/leaves**
- Description: Get all leave requests (filtered by role)
- Roles: All authenticated users
- Query Params: `staffId`, `status`, `leaveType`, `startDate`, `endDate`
- Response: `LeaveRequest[]`

**POST /api/leaves**
- Description: Create leave request
- Roles: EMPLOYEE, HR_OFFICER, HR_DIRECTOR
- Body: LeaveRequest data
- Response: `LeaveRequest`

**GET /api/leaves/[id]**
- Description: Get single leave request
- Roles: All authenticated users (with scope restrictions)
- Response: `LeaveRequest`

**PATCH /api/leaves/[id]**
- Description: Approve/reject leave request
- Roles: Based on approval workflow
- Body: `{ status, comments, level }`
- Response: `LeaveRequest`

**POST /api/leaves/[id]/cancel**
- Description: Cancel leave request
- Roles: EMPLOYEE (own), HR_OFFICER, HR_DIRECTOR
- Response: `LeaveRequest`

### 9.4 Balance APIs

**GET /api/balances**
- Description: Get leave balances (filtered by role)
- Roles: All authenticated users
- Query Params: `staffId`
- Response: `LeaveBalance[]`

**POST /api/balances**
- Description: Create/update leave balance
- Roles: HR_OFFICER, HR_DIRECTOR, SYS_ADMIN
- Body: LeaveBalance data
- Response: `LeaveBalance`

**GET /api/balances/[staffId]**
- Description: Get balance for specific staff
- Roles: All authenticated users (with scope restrictions)
- Response: `LeaveBalance`

### 9.5 Policy APIs

**GET /api/leave-policies**
- Description: Get all leave policies
- Roles: All authenticated users
- Response: `LeavePolicy[]`

**POST /api/leave-policies**
- Description: Create leave policy
- Roles: HR_OFFICER, HR_DIRECTOR, SYS_ADMIN
- Body: LeavePolicy data
- Response: `LeavePolicy`

**PATCH /api/leave-policies/[id]**
- Description: Update leave policy
- Roles: HR_OFFICER, HR_DIRECTOR, SYS_ADMIN
- Body: Partial LeavePolicy data
- Response: `LeavePolicy`

### 9.6 Holiday APIs

**GET /api/holidays**
- Description: Get all holidays
- Roles: All authenticated users
- Query Params: `year`
- Response: `Holiday[]`

**POST /api/holidays**
- Description: Create holiday
- Roles: HR_OFFICER, HR_DIRECTOR, SYS_ADMIN
- Body: Holiday data
- Response: `Holiday`

### 9.7 Report APIs

**GET /api/reports/compliance**
- Description: Get compliance reports
- Roles: HR_OFFICER, HR_DIRECTOR, CHIEF_DIRECTOR, AUDITOR, SYS_ADMIN
- Query Params: `startDate`, `endDate`, `unit`, `directorate`
- Response: Compliance report data

**GET /api/reports/analytics**
- Description: Get analytics reports
- Roles: HR_OFFICER, HR_DIRECTOR, SYS_ADMIN
- Query Params: `startDate`, `endDate`, `groupBy`
- Response: Analytics data

---

## 10. Database Schema

### 10.1 Core Models

**User**
- Authentication and authorization
- Links to StaffMember via staffId
- Role-based access control
- Session management

**StaffMember**
- Complete staff information
- Organizational structure
- Employment details
- Reporting relationships

**LeaveRequest**
- Leave application data
- Approval workflow state
- MoFA compliance fields
- Attachments

**LeaveBalance**
- Leave balances by type
- Accrual tracking
- Carry-forward management
- Expiration tracking

**ApprovalStep**
- Approval workflow state
- Per-level approval tracking
- Delegation support
- Sequential enforcement

**LeaveApprovalHistory**
- Immutable audit trail
- All approval actions
- IP and user agent tracking
- Timestamp tracking

### 10.2 Supporting Models

- **LeavePolicy** - Leave policy configuration
- **LeaveRequestTemplate** - Pre-configured templates
- **Holiday** - Holiday calendar
- **Notification** - In-app notifications
- **AuditLog** - System audit trail
- **Payslip** - Employee payslips
- **PerformanceReview** - Performance reviews

### 10.3 Relationships

```
User ──(1:1)──> StaffMember
StaffMember ──(1:*)──> LeaveRequest
LeaveRequest ──(1:*)──> ApprovalStep
LeaveRequest ──(1:*)──> LeaveApprovalHistory
StaffMember ──(1:1)──> LeaveBalance
LeaveRequest ──(1:*)──> LeaveAttachment
```

---

## 11. Processes & Workflows

### 11.1 Staff Onboarding Process

1. **HR Creates Staff Record**
   - Fill staff information
   - Assign organizational structure
   - Set reporting relationships
   - System creates LeaveBalance (all zeros)

2. **Admin Creates User Account**
   - Link to staff record
   - Assign role
   - Set initial password
   - User can login

3. **Staff Completes Profile** (optional)
   - Upload photo
   - Update contact information
   - Review organizational assignment

### 11.2 Leave Request Process

1. **Employee Submits Request**
   - Select leave type
   - Enter dates
   - Provide reason
   - Complete MoFA compliance fields
   - Upload attachments (if required)

2. **System Validates**
   - Check balance
   - Validate dates
   - Check for overlaps
   - Determine workflow

3. **Approval Workflow**
   - Level 1: Supervisor
   - Level 2: Unit Head
   - Level 3: Director/Chief Director
   - Level 4: HR Director (HRMU only)
   - Final: HR Officer

4. **Balance Update**
   - Deduct balance on approval
   - Restore balance on cancellation

5. **Notifications**
   - Notify approvers
   - Notify employee
   - Send reminders

### 11.3 Staff Termination Process

1. **HR Updates Status**
   - Change employment status
   - Set termination date
   - Provide termination reason

2. **System Actions**
   - Mark staff as inactive
   - Preserve leave balance
   - Lock staff record
   - Create audit log

3. **User Account** (separate)
   - Admin can deactivate user account
   - User can no longer login
   - Historical data preserved

### 11.4 Year-End Leave Processing

1. **System Processes**
   - Calculate carry-forward
   - Expire unused leave
   - Reset accrual dates
   - Generate reports

2. **HR Reviews**
   - Review carry-forward amounts
   - Approve exceptions
   - Update balances manually (if needed)

3. **Notifications**
   - Notify staff of new balances
   - Notify of expired leave
   - Send balance reports

---

## 12. Security & Compliance

### 12.1 Authentication & Authorization

- **JWT Tokens**: Secure token-based authentication
- **Session Management**: Server-side session tracking
- **Password Security**: bcrypt hashing, password policies
- **Role-Based Access Control**: Granular permission system
- **Account Locking**: Failed login attempt protection

### 12.2 Data Security

- **HTTPS**: All communications encrypted
- **SQL Injection Protection**: Prisma ORM parameterized queries
- **XSS Protection**: React automatic escaping
- **CSRF Protection**: Token-based protection
- **Input Validation**: Server-side validation on all inputs

### 12.3 Audit & Compliance

- **Complete Audit Trail**: All actions logged
- **IP Tracking**: IP address logging
- **User Agent Tracking**: Browser/device tracking
- **Timestamp Tracking**: Precise action timing
- **Immutable History**: LeaveApprovalHistory cannot be modified

### 12.4 MoFA Compliance

- **Organizational Structure**: Validates against MoFA structure
- **Approval Workflows**: Implements MoFA approval chains
- **Handover Fields**: Officer taking over, handover notes
- **Declaration**: "I will not proceed on leave without approval"
- **Policy Enforcement**: Automatic policy application

### 12.5 Government Standards Compliance

- **PSC Leave Policy**: Aligned with Public Service Commission
- **OHCS Guidelines**: Follows Office of Head of Civil Service
- **Labour Act 651**: Compliant with Ghana Labour Act
- **Data Protection**: GDPR-inspired data protection

---

## 13. Deployment & Operations

### 13.1 Deployment

**Recommended: Vercel**
- Automatic deployments from Git
- Built-in Next.js optimization
- Easy environment variable management
- Serverless functions

**Database: Neon PostgreSQL**
- Serverless PostgreSQL
- Connection pooling
- Automatic backups
- Scalable

### 13.2 Environment Variables

**Required:**
- `DATABASE_URL` - Neon PostgreSQL connection string
- `DIRECT_URL` - Direct database connection (for migrations)

**Optional:**
- `NODE_ENV` - Environment (development/production)
- `NEXTAUTH_SECRET` - Authentication secret
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email configuration

### 13.3 Monitoring

- **Error Tracking**: Console logging, error monitoring
- **Performance Monitoring**: API response times
- **Audit Logging**: Complete activity tracking
- **Health Checks**: `/api/monitoring/health` endpoint

### 13.4 Backup & Recovery

- **Database Backups**: Neon automatic backups
- **Audit Logs**: Preserved for compliance
- **Data Export**: CSV/Excel export capabilities
- **Migration Rollback**: Prisma migration rollback support

### 13.5 Maintenance

**Regular Tasks:**
- Review audit logs
- Monitor system performance
- Update leave policies
- Process year-end leave
- Clean up expired sessions

**Updates:**
- Follow deployment workflow
- Test in development first
- Backup before migrations
- Monitor after deployment

---

## Appendix A: Quick Reference

### A.1 Role Codes

| Code | Name | Approval Level |
|------|------|----------------|
| EMPLOYEE | Employee | N/A |
| SUPERVISOR | Supervisor | Level 1 |
| UNIT_HEAD | Unit Head | Level 2 |
| DIVISION_HEAD | Division Head | Level 3 |
| DIRECTOR | Director | Level 4 |
| REGIONAL_MANAGER | Regional Manager | Regional |
| HR_OFFICER | HR Officer | Final |
| HR_DIRECTOR | HR Director | Senior |
| CHIEF_DIRECTOR | Chief Director | Executive |
| AUDITOR | Internal Auditor | Read-Only |
| SYS_ADMIN | System Admin | System |

### A.2 Leave Types

1. Annual
2. Sick
3. Unpaid
4. Special Service
5. Training
6. Study
7. Maternity
8. Paternity
9. Compassionate

### A.3 Leave Status

- `pending` - Awaiting approval
- `approved` - Approved and balance deducted
- `rejected` - Rejected at any level
- `cancelled` - Cancelled by employee or HR

### A.4 Workflow Types

- **Type A**: Standard Directorate Units (4 levels)
- **Type B**: Chief Director Units (4 levels)
- **Type C**: HRMU Special (5 levels)
- **Type D**: Regional/District Staff (4 levels)
- **Type E**: Senior Staff/Directors (2 levels)

---

## Appendix B: Contact & Support

**System Administrator**: Contact IT Department  
**HR Support**: Contact HR Department  
**Technical Issues**: Check documentation or contact development team

---

**Document Version**: 2.0  
**Last Updated**: December 2024  
**Next Review**: Quarterly

---

*This document is maintained by the MoFA IT Department. For updates or corrections, please contact the system administrator.*

