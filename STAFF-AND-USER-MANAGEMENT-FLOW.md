# Staff and User Management Flow

## Overview

This document explains how HR adds new staff members and how Admin creates login credentials in the MoFAD Leave Management System.

---

## 🔄 Two-Step Process

The system uses a **two-step process** for staff onboarding:

1. **Step 1: HR Creates Staff Record** - Creates the staff member profile
2. **Step 2: Admin Creates Login Credentials** - Creates user account for login access

This separation allows:
- HR to add staff records without needing to set passwords
- Admin to control who gets system access
- Better security and access control

---

## 📋 Step 1: HR Adds New Staff

### Who Can Do This?
- **HR_OFFICER** (HR Officer)
- **HR_DIRECTOR** (HR Director)
- **SYS_ADMIN** (System Administrator)
- Legacy roles: `hr`, `admin`

### How It Works

1. **HR navigates to**: Staff Management → Add New Staff
2. **HR fills out the staff form** with:
   - Basic Information:
     - Staff ID (e.g., MFA-001)
     - First Name, Last Name
     - Email, Phone
     - Join Date
   - MoFAD Organizational Structure:
     - Directorate (optional - null if reports to Chief Director)
     - Unit (e.g., "Human Resource Management Unit (HRMU)")
     - Duty Station (HQ, Region, District, Agency)
   - Employment Details:
     - Department, Position
     - Grade, Level
     - Rank, Step
     - Photo (optional)
3. **System creates**:
   - ✅ StaffMember record in database
   - ✅ Initial LeaveBalance record (all balances set to 0)
   - ❌ **NO User account** (staff cannot login yet)

### API Endpoint

**POST** `/api/staff`

**Request Body:**
```json
{
  "staffId": "MFA-001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@mofad.gov.gh",
  "phone": "+233 XX XXX XXXX",
  "department": "Fisheries",
  "position": "Senior Officer",
  "grade": "Grade A",
  "level": "Level 1",
  "rank": "Senior Officer",
  "step": "Step 3",
  "directorate": "Finance & Administration Directorate",
  "unit": "Accounts Unit",
  "dutyStation": "HQ",
  "joinDate": "2024-01-15",
  "active": true,
  "employmentStatus": "active"
}
```

**Response:**
```json
{
  "id": "...",
  "staffId": "MFA-001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@mofad.gov.gh",
  ...
}
```

### What Happens After?
- Staff record is created
- Staff member appears in staff directory
- **Staff member CANNOT login** (no user account yet)
- Admin can now create login credentials for this staff member

---

## 🔐 Step 2: Admin Creates Login Credentials

### Who Can Do This?
- **SYS_ADMIN** (System Administrator)
- **HR_OFFICER** (HR Officer)
- **HR_DIRECTOR** (HR Director)
- Legacy roles: `admin`, `hr`

### Two Options for Admin

#### Option A: Create Credentials for Existing Staff

**Use Case**: Staff member already exists (created by HR), but needs login access.

1. **Admin navigates to**: User Management → "Create Credentials for Existing Staff"
2. **Admin selects**:
   - Staff member from dropdown (only shows staff without accounts)
   - Email address (pre-filled from staff record, can be changed)
   - Password (min 8 characters)
   - Role (Employee, Supervisor, Unit Head, Director, HR Officer, etc.)
   - Account Active status
3. **System creates**:
   - ✅ User account linked to staff member
   - ✅ Updates staff email if different
   - ✅ Creates LeaveBalance if it doesn't exist
   - ✅ Sends email with login credentials (if email service configured)
   - ✅ Creates audit log entry

**API Endpoint:**

**POST** `/api/admin/users/create-credentials`

**Request Body:**
```json
{
  "staffId": "MFA-001",
  "email": "john.doe@mofad.gov.gh",
  "password": "SecurePassword123!",
  "role": "employee",
  "active": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login credentials created successfully",
  "user": {
    "id": "...",
    "email": "john.doe@mofad.gov.gh",
    "role": "employee",
    "staffId": "MFA-001",
    "active": true,
    "staff": {
      "staffId": "MFA-001",
      "firstName": "John",
      "lastName": "Doe",
      "department": "Fisheries"
    }
  },
  "emailSent": true
}
```

#### Option B: Create New Staff & User Account Together

**Use Case**: Creating both staff record and login credentials in one step.

1. **Admin navigates to**: User Management → "Add New Staff & User"
2. **Admin fills out**:
   - All staff information (same as HR form)
   - User account information:
     - Email
     - Password
     - Role
     - Account Active status
3. **System creates**:
   - ✅ StaffMember record
   - ✅ User account
   - ✅ LeaveBalance record
   - ✅ Sends email with credentials
   - ✅ Creates audit log entry

**API Endpoint:**

**POST** `/api/admin/users`

**Request Body:**
```json
{
  "staffId": "MFA-001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@mofad.gov.gh",
  "phone": "+233 XX XXX XXXX",
  "department": "Fisheries",
  "position": "Senior Officer",
  "grade": "Grade A",
  "level": "Level 1",
  "joinDate": "2024-01-15",
  "password": "SecurePassword123!",
  "role": "employee",
  "active": true
}
```

---

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    STAFF ONBOARDING FLOW                    │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│  HR Officer  │
└──────┬───────┘
       │
       │ 1. Creates Staff Record
       │    POST /api/staff
       │
       ▼
┌─────────────────────┐
│  StaffMember Record │  ✅ Created
│  - Basic Info       │  ✅ LeaveBalance Created
│  - MoFAD Structure  │  ❌ NO User Account
│  - Employment Data │
└──────────┬──────────┘
           │
           │ Staff appears in directory
           │ but CANNOT login
           │
           ▼
┌─────────────────────┐
│   System Admin      │
│   or HR Director    │
└──────────┬──────────┘
           │
           │ 2. Creates Login Credentials
           │    POST /api/admin/users/create-credentials
           │
           ▼
┌─────────────────────┐
│    User Account     │  ✅ Created
│    - Email          │  ✅ Linked to StaffMember
│    - Password       │  ✅ Credentials Email Sent
│    - Role           │  ✅ Audit Log Created
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Staff Can Now      │
│  Login to System    │  ✅ Full Access
└─────────────────────┘
```

---

## 🔍 Finding Staff Without User Accounts

In the Admin User Management interface:
- Click "Create Credentials for Existing Staff"
- Dropdown shows only staff members who don't have user accounts
- Count displayed: "X staff member(s) without user accounts"

---

## 📧 Email Notifications

When credentials are created:
- **Email sent to**: Staff member's email address
- **Subject**: "Your HR Leave Portal Account Credentials"
- **Content includes**:
  - Login URL
  - Email address
  - Password (plain text - only time it's sent)
  - Role assigned
  - Staff ID

**Note**: If email fails to send, the password is included in the API response for manual sharing.

---

## 🔐 Password Requirements

- **Minimum length**: 8 characters
- **Recommended**: 
  - Mix of uppercase and lowercase letters
  - Numbers
  - Special characters
  - Not easily guessable

---

## 🎭 Role Assignment

When creating credentials, admin can assign any of these roles:

### MoFAD Roles:
- `EMPLOYEE` - Employee
- `SUPERVISOR` - Supervisor
- `UNIT_HEAD` - Unit Head
- `DIVISION_HEAD` - Division Head
- `DIRECTOR` - Director
- `REGIONAL_MANAGER` - Regional Manager
- `HR_OFFICER` - HR Officer
- `HR_DIRECTOR` - HR Director
- `CHIEF_DIRECTOR` - Chief Director
- `AUDITOR` - Internal Auditor (read-only)
- `SYS_ADMIN` - System Administrator

### Legacy Roles (for backward compatibility):
- `employee`
- `manager`
- `hr`
- `admin`

---

## 🔒 Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt before storage
2. **Email Verification**: User accounts start with `emailVerified: false`
3. **Audit Logging**: All credential creation actions are logged
4. **Access Control**: Only authorized roles can create credentials
5. **Duplicate Prevention**: 
   - Email must be unique
   - Staff ID can only be linked to one user account
   - Staff member cannot have multiple user accounts

---

## 🚨 Error Handling

### Common Errors:

1. **"Staff member not found"**
   - Staff ID doesn't exist
   - Solution: Create staff record first

2. **"Staff member already has a user account"**
   - Staff ID is already linked to a user
   - Solution: Use update endpoint to modify credentials

3. **"Email is already in use"**
   - Email is already registered
   - Solution: Use a different email or update existing account

4. **"Password must be at least 8 characters long"**
   - Password too short
   - Solution: Use a password with 8+ characters

---

## 📝 Best Practices

1. **HR creates staff records first** - This ensures all staff data is captured
2. **Admin creates credentials after verification** - Ensures only authorized staff get access
3. **Use strong passwords** - Follow password requirements
4. **Verify email addresses** - Ensure correct email before sending credentials
5. **Assign appropriate roles** - Match role to staff member's position
6. **Keep audit trail** - All actions are logged for compliance

---

## 🔄 Alternative: One-Step Process (Admin Only)

For convenience, Admin can create both staff record and user account in one step:

**POST** `/api/admin/users`

This endpoint:
- Creates StaffMember record
- Creates User account
- Creates LeaveBalance
- Sends credentials email
- Creates audit log

**Use this when**: You need to onboard staff quickly and have all information ready.

---

## ✅ Summary

| Step | Who | Action | Result |
|------|-----|--------|--------|
| 1 | HR Officer | Create Staff Record | StaffMember created, no login access |
| 2 | Admin/HR Director | Create Login Credentials | User account created, staff can login |

**Key Points:**
- ✅ HR can add staff without creating passwords
- ✅ Admin controls who gets system access
- ✅ Two-step process provides better security
- ✅ Credentials are emailed automatically
- ✅ All actions are audited

---

**Last Updated**: 2024-12-26  
**Version**: 1.0

