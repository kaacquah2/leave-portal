# HR Staff Management & Leave Portal
## Ministry of Fisheries and Aquaculture Development, Ghana

---

## 1. Purpose of the Web App

The system is designed to:

* **Digitize staff records** - Complete employee lifecycle management
* **Automate leave applications and approvals** - Streamlined multi-level approval workflow
* **Improve transparency and accountability** - Clear audit trails and reporting
* **Reduce paperwork and delays** - Digital processes for faster turnaround
* **Support reporting for management and audits** - Comprehensive analytics and export capabilities

---

## 2. User Roles

The system supports **role-based access control** with the following roles:

### a) Staff (Employees)

**Role Code:** `employee`

**Primary Responsibilities:**
* View personal profile and employment details
* Apply for leave requests
* Track leave application status
* View leave balance (annual, sick, study, maternity/paternity, compassionate)
* Download approval letters and documents
* View payslips
* Access performance reviews
* Update personal contact information

**Key Features:**
* My Profile
* Apply for Leave
* My Leave History
* Leave Balance Dashboard
* Notifications Center
* Document Downloads

**Permissions:**
* ✅ View own profile
* ✅ Update own contact information
* ✅ Create own leave requests
* ✅ View own leave history and balance
* ✅ View own payslips
* ✅ View own performance reviews
* ❌ Cannot approve leaves
* ❌ Cannot view other staff records

---

### b) Supervisors / Directors

**Role Code:** `manager`

**Primary Responsibilities:**
* Review leave requests from team members
* Approve or reject leave requests
* Add comments or recommendations on leave applications
* View team leave schedules and calendar
* Monitor team leave balances
* Access team reports and analytics
* View team member information

**Key Features:**
* Dashboard with pending approvals
* Approve Leaves (primary function)
* Team Leave Calendar
* Team Reports
* Team Member Directory

**Permissions:**
* ✅ View team members only (filtered by department/team)
* ✅ Approve/reject team leave requests
* ✅ Add comments to leave requests
* ✅ View team leave calendar
* ✅ View team reports
* ✅ View team performance data
* ❌ Cannot edit staff records
* ❌ Cannot change leave policies
* ❌ Cannot see other departments

---

### c) HR Officers

**Role Code:** `hr`

**Primary Responsibilities:**
* Manage all staff records (create, update, view, delete)
* Define and configure leave policies
* Oversee leave approvals (if required by policy)
* Generate comprehensive reports
* Manage departments and organizational units
* Configure holidays and leave templates
* Handle staff onboarding and offboarding
* Manage disciplinary actions
* Upload and manage staff documents

**Key Features:**
* HR Dashboard
* Staff Records Management (full CRUD)
* Leave Policy Management
* Leave Management (organization-wide)
* Approval Oversight
* Reports & Analytics
* Department & Unit Management
* Holiday Calendar Management
* Leave Templates
* Document Management

**Permissions:**
* ✅ Full staff management (create, update, delete)
* ✅ View all leaves across organization
* ✅ Approve any leave (if needed by policy)
* ✅ Manage leave policies and templates
* ✅ Configure holidays
* ✅ Generate all reports
* ✅ Manage departments and units
* ✅ Upload staff documents
* ✅ Handle disciplinary actions
* ✅ System configuration (HR-related)

---

### d) System Administrator (IT)

**Role Code:** `admin`

**Primary Responsibilities:**
* Manage users and user accounts
* Configure role and permission settings
* Manage system-wide configuration
* View and manage audit logs
* Handle backup and data recovery
* Security and access control management
* System monitoring and maintenance

**Key Features:**
* Admin Dashboard
* User Management
* Role & Permission Settings
* System Configuration
* Audit Logs Viewer
* Backup & Data Recovery
* Security Settings

**Permissions:**
* ✅ Full system access
* ✅ User account management
* ✅ Role and permission configuration
* ✅ System settings management
* ✅ Audit log access
* ✅ Backup and recovery operations
* ✅ Security configuration

---

## 3. Core Features

### 3.1 Staff Management

**Comprehensive Employee Records:**
* **Biodata:**
  * Full name, staff ID, employee number
  * Grade and level
  * Department and position
  * Photo/profile picture
  
* **Employment Details:**
  * Appointment date
  * Contract type (permanent, temporary, contract)
  * Employment status (active, inactive, terminated)
  * Supervisor/Manager assignment
  
* **Contact Information:**
  * Email address
  * Phone number
  * Physical address
  * Emergency contact details
  
* **Document Management:**
  * Appointment letters
  * ID documents
  * Certificates and qualifications
  * Contract documents
  * Promotion letters
  * Disciplinary documents
  
* **History Tracking:**
  * Transfer history
  * Promotion history
  * Salary adjustments
  * Training records
  * Performance reviews

---

### 3.2 Leave Management

**Leave Application System:**
* **Leave Application Form:**
  * Select leave type
  * Choose start and end dates
  * Automatic calculation of leave days
  * Reason/justification field
  * Attach supporting documents (medical certificates, etc.)
  * Submit for approval

* **Automatic Leave Balance Calculation:**
  * Real-time balance updates
  * Accrual tracking
  * Carryover management
  * Balance warnings

* **Multi-Level Approval Workflow:**
  1. Staff submits leave request
  2. Supervisor/Manager reviews and approves/rejects
  3. Director/Head of Department approves (if required)
  4. HR confirms and records
  5. Staff receives notification

* **Leave Types:**
  * **Annual Leave** - Standard vacation leave
  * **Sick Leave** - Medical leave with documentation
  * **Study Leave** - Educational/training leave
  * **Maternity/Paternity Leave** - Parental leave
  * **Compassionate Leave** - Bereavement/family emergency
  * **Special Service Leave** - Official duties
  * **Training Leave** - Professional development
  * **Unpaid Leave** - Extended leave without pay

* **Document Attachments:**
  * Medical certificates
  * Supporting letters
  * Training invitations
  * Other relevant documents

* **Notifications:**
  * Email notifications on submission
  * SMS notifications (optional)
  * In-app notifications
  * Approval/rejection alerts

---

### 3.3 Approval Workflow

**Multi-Level Approval Process:**

1. **Staff Submission:**
   - Staff fills leave application form
   - System validates leave balance
   - Request submitted with status "pending"

2. **Supervisor Review:**
   - Supervisor receives notification
   - Reviews leave request details
   - Checks team coverage
   - Approves or rejects with comments

3. **Director/Head Approval (if required):**
   - For certain leave types or durations
   - Director reviews supervisor's recommendation
   - Final approval or rejection

4. **HR Confirmation:**
   - HR verifies leave balance
   - Records approved leave
   - Updates leave balance
   - Generates approval letter

5. **Staff Notification:**
   - Staff receives approval/rejection notification
   - Can download approval letter
   - Leave added to calendar

**Approval Levels Configuration:**
* Single-level (Supervisor only)
* Two-level (Supervisor + Director)
* Three-level (Supervisor + Director + HR)
* Configurable per leave type

---

### 3.4 Dashboard & Analytics

**Role-Specific Dashboards:**

**Staff Dashboard:**
* Leave balance summary
* Pending leave requests
* Upcoming approved leaves
* Recent notifications
* Quick actions (Apply for Leave)

**Supervisor/Director Dashboard:**
* Pending leave approvals (highlighted)
* Team members count
* Team leave statistics
* Approved leaves this month
* Team leave calendar overview

**HR Dashboard:**
* Total staff count
* Active staff count
* Staff on leave today
* Pending leave requests (organization-wide)
* Leave utilization statistics
* Department-wise summaries
* Recent staff activities

**Admin Dashboard:**
* System health metrics
* User activity statistics
* Security alerts
* System configuration status
* Audit log summary

**Analytics Features:**
* Leave utilization trends
* Department-wise leave analysis
* Leave type distribution
* Approval turnaround times
* Staff attendance patterns

---

### 3.5 Reporting

**Comprehensive Reporting System:**

**Leave Reports:**
* Individual leave history per staff
* Monthly leave reports
* Annual leave summaries
* Departmental leave analysis
* Leave type utilization reports
* Approval status reports

**Staff Reports:**
* Staff directory
* Department-wise staff listing
* Staff on leave reports
* Staff attendance reports
* Performance summary reports

**Management Reports:**
* Executive dashboards
* Leave trends and patterns
* Compliance reports
* Audit-ready reports

**Export Capabilities:**
* Export to PDF
* Export to Excel/CSV
* Printable formats
* Scheduled report generation

---

### 3.6 Notifications

**Multi-Channel Notification System:**

**Notification Types:**
* **Leave Submission Alerts** - Notify supervisors when leave is submitted
* **Approval/Rejection Notifications** - Notify staff of decision
* **Leave Start Reminders** - Remind staff before leave starts
* **Return-to-Work Reminders** - Remind staff to return
* **Balance Warnings** - Alert when leave balance is low
* **System Notifications** - General announcements

**Notification Channels:**
* In-app notifications (real-time)
* Email notifications
* SMS notifications (optional, configurable)

**Notification Preferences:**
* User-configurable notification settings
* Role-based notification rules
* Priority levels

---

## 4. Pages / Screens Structure

### Public / Authentication Pages

* **Login Page**
  * Email/password authentication
  * Role-based redirect after login
  * Password strength indicator
  
* **Password Reset**
  * Forgot password flow
  * Email-based reset link
  * Secure password reset
  
* **Help / Support Contact**
  * Contact information
  * FAQ section
  * User guides

---

### Staff Portal Pages

* **Dashboard**
  * Personal leave balance
  * Pending requests
  * Upcoming leaves
  * Quick actions
  
* **My Profile**
  * Personal information
  * Employment details
  * Contact information
  * Document access
  
* **Apply for Leave**
  * Leave application form
  * Leave type selection
  * Date picker
  * Document upload
  * Balance check
  
* **My Leave History**
  * All leave requests
  * Status tracking
  * Approval history
  * Download approval letters
  
* **Leave Balance**
  * Current balances by type
  * Accrual history
  * Carryover information
  * Balance projections
  
* **Notifications**
  * All notifications
  * Mark as read
  * Filter by type
  * Notification preferences

---

### Supervisor / Director Pages

* **Dashboard**
  * Pending approvals (highlighted)
  * Team statistics
  * Team leave calendar overview
  * Quick approval actions
  
* **Pending Approvals**
  * List of pending requests
  * Filter and search
  * Detailed request view
  * Approve/Reject actions
  * Add comments
  
* **Team Leave Calendar**
  * Visual calendar view
  * Team members on leave
  * Leave conflicts detection
  * Export calendar
  
* **Approved Leave Records**
  * History of approved leaves
  * Search and filter
  * Export options
  
* **Comments & Recommendations**
  * View all comments
  * Add recommendations
  * Communication log

---

### HR Pages

* **HR Dashboard**
  * Organization-wide metrics
  * Staff statistics
  * Leave statistics
  * Recent activities
  
* **Staff Records Management**
  * Staff directory
  * Add/Edit staff
  * Staff search and filter
  * Bulk operations
  
* **Add/Edit Staff**
  * Complete staff form
  * Document upload
  * Employment details
  * Assignment to departments
  
* **Leave Policy Management**
  * Create/edit leave policies
  * Configure leave types
  * Set accrual rates
  * Approval level configuration
  
* **Approval Oversight**
  * View all leave requests
  * Approve/reject if needed
  * Override approvals
  * Bulk actions
  
* **Reports & Analytics**
  * Generate reports
  * Custom report builder
  * Export options
  * Scheduled reports
  
* **Department & Unit Management**
  * Create/edit departments
  * Assign staff to departments
  * Department hierarchy
  * Unit management

---

### Admin Pages

* **User Management**
  * User list
  * Create/edit users
  * Assign roles
  * Activate/deactivate accounts
  * Password reset
  
* **Role & Permission Settings**
  * Define roles
  * Configure permissions
  * Permission matrix
  * Role assignments
  
* **System Configuration**
  * General settings
  * Email/SMS configuration
  * Notification settings
  * System parameters
  
* **Audit Logs**
  * View all system activities
  * Filter by user/action/date
  * Export audit logs
  * Security monitoring
  
* **Backup & Data Recovery**
  * Backup configuration
  * Manual backup trigger
  * Restore options
  * Backup history

---

## 5. Security & Compliance

**Security Features:**

* **Role-Based Access Control (RBAC)**
  * Granular permission system
  * Role-based page access
  * API endpoint protection
  
* **Strong Authentication**
  * Password-based authentication
  * Password complexity requirements
  * Optional two-factor authentication (2FA) support
  * Session management
  
* **Data Encryption**
  * Encrypted data transmission (HTTPS)
  * Encrypted password storage
  * Secure document storage
  
* **Activity/Audit Logs**
  * Complete activity tracking
  * User action logging
  * System change tracking
  * Compliance-ready audit trail
  
* **Data Protection**
  * Compliance with government data protection policies
  * Personal data privacy
  * Secure data handling
  * Data retention policies
  
* **Backup & Recovery**
  * Regular automated backups
  * Data recovery procedures
  * Disaster recovery plan
  * Backup verification

---

## 6. Technology Stack

**Current Implementation:**

* **Frontend:** Next.js 15.5.6 (React 19.2.0)
* **Backend:** Next.js API Routes (Node.js)
* **Database:** Neon PostgreSQL
* **ORM:** Prisma 7.0.0
* **Authentication:** JWT-based session management
* **UI Framework:** Tailwind CSS with Radix UI components
* **Form Handling:** React Hook Form with Zod validation

**Recommended Hosting:**
* Government data center (preferred for security)
* Secure cloud hosting (Vercel, AWS, Azure)
* On-premises deployment option

**Integration Capabilities:**
* Email gateway integration
* SMS gateway integration (optional)
* Document storage (local or cloud)
* Calendar integration (future)

---

## 7. Future Enhancements

**Planned Features:**

* **Attendance Management**
  * Clock in/clock out system
  * Attendance tracking
  * Attendance reports
  
* **Payroll Integration**
  * Salary processing
  * Leave deduction calculations
  * Payslip generation
  
* **Performance Appraisal Module**
  * Performance reviews
  * Goal setting
  * KPI tracking
  
* **Biometric Attendance Integration**
  * Biometric device integration
  * Automated attendance capture
  
* **Mobile App Version**
  * Native mobile applications
  * Push notifications
  * Mobile-optimized interface

---

## 8. Overall Look & Feel

**Design Principles:**

* **Clean Government-Standard Design**
  * Professional and formal appearance
  * Consistent with government standards
  * Accessible and user-friendly
  
* **Ministry Branding**
  * Ministry logo integration
  * Official color scheme
  * Brand consistency across pages
  
* **Simple Navigation**
  * Intuitive menu structure
  * Clear page hierarchy
  * Breadcrumb navigation
  * Quick access to common actions
  
* **Responsive Design**
  * Desktop-optimized interface
  * Mobile-responsive layout
  * Tablet compatibility
  * Cross-browser support
  
* **User-Friendly Interface**
  * Easy for non-technical users
  * Clear instructions and help text
  * Error messages and validation
  * Loading states and feedback

---

## 9. Current Implementation Status

**✅ Implemented Features:**

* User authentication and authorization
* Role-based access control (HR, Manager, Employee, Admin)
* Staff management (CRUD operations)
* Leave request system
* Leave approval workflow
* Leave balance tracking
* Leave policy management
* Holiday calendar
* Leave templates
* Notifications system
* Audit logging
* Reports generation
* Document management
* Performance reviews
* Attendance tracking
* Timesheet management

**🔄 In Progress / To Be Enhanced:**

* Additional leave types (Study, Maternity/Paternity, Compassionate)
* Enhanced approval workflow with multiple levels
* SMS notification integration
* Advanced reporting features
* Mobile responsiveness improvements
* Document download/approval letters

**📋 Planned Features:**

* Two-factor authentication (2FA)
* Payroll integration
* Biometric attendance
* Mobile app
* Advanced analytics dashboard

---

## 10. Getting Started

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   # Edit .env with your DATABASE_URL
   ```

3. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

4. **Generate Prisma client**
   ```bash
   npm run db:generate
   ```

5. **Seed initial data (optional)**
   ```bash
   npm run db:seed
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

### Creating Users

Create users via API or seed script:
- HR user: `POST /api/auth/register` with role `hr`
- Manager user: `POST /api/auth/register` with role `manager`
- Employee user: `POST /api/auth/register` with role `employee`
- Admin user: `POST /api/auth/register` with role `admin`

---

## 11. Key Workflows

### Leave Application Workflow

1. **Staff logs in** → Sees dashboard with leave balance
2. **Navigates to "Apply for Leave"** → Fills leave application form
3. **Submits request** → System validates balance and creates request
4. **Supervisor notified** → Reviews and approves/rejects
5. **Director notified** (if required) → Final approval
6. **HR confirms** → Updates leave balance and generates approval letter
7. **Staff notified** → Receives approval/rejection notification

### Staff Management Workflow

1. **HR logs in** → Sees dashboard with staff metrics
2. **Manages Staff**:
   - Add new staff members
   - Update staff information
   - View staff directory
   - Manage staff status (active/inactive)
3. **Configures Leave System**:
   - Set up leave policies
   - Create leave templates
   - Manage holidays
4. **Monitors Leaves**:
   - View all leave requests
   - Approve/reject if needed
   - Generate reports

---

## 12. Navigation Structure

### Staff Navigation
- Dashboard
- My Profile
- Apply for Leave
- My Leave History
- Leave Balance
- Notifications

### Supervisor/Director Navigation
- Dashboard
- Pending Approvals (primary feature)
- Team Leave Calendar
- Team Reports
- Approved Leave Records

### HR Navigation
- Dashboard
- Staff Management
- Leave Management
- Leave Calendar
- Leave Policies
- Holidays
- Leave Templates
- Reports

### Admin Navigation
- Dashboard
- User Management
- Role & Permission Settings
- System Configuration
- Audit Logs
- Backup & Data Recovery

---

## 13. Permissions Summary

### Staff Permissions
- ✅ View own profile
- ✅ Update own contact information
- ✅ Create own leave requests
- ✅ View own leave history and balance
- ✅ View own payslips
- ✅ View own performance reviews
- ❌ Cannot approve leaves
- ❌ Cannot view other staff records

### Supervisor/Director Permissions
- ✅ View team members only
- ✅ Approve/reject team leave requests
- ✅ View team leave calendar
- ✅ View team reports
- ❌ Cannot edit staff records
- ❌ Cannot change leave policies
- ❌ Cannot see other departments

### HR Permissions
- ✅ Full staff management
- ✅ View all leaves
- ✅ Approve any leave (if needed)
- ✅ Manage leave policies
- ✅ Configure holidays
- ✅ Generate reports
- ✅ System administration (HR-related)

### Admin Permissions
- ✅ Full system access
- ✅ User account management
- ✅ Role and permission configuration
- ✅ System settings management
- ✅ Audit log access
- ✅ Backup and recovery operations

---

**Version**: 2.0.0  
**Focus**: Comprehensive Staff Management & Leave Portal  
**Organization**: Ministry of Fisheries & Aquaculture Development, Ghana  
**Last Updated**: 2024
