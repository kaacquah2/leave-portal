# MoFAD Staff Creation Guide
## Complete Process Following State Organization Rules

**Version**: 1.0  
**Last Updated**: December 2024  
**Status**: ✅ **Fully Implemented**

---

## 📋 Overview

This guide explains how to add and create new staff members in the MoFAD Leave Management System, following:
- ✅ MoFAD organizational structure
- ✅ Ghana Government Public Service standards
- ✅ State organization rules and regulations
- ✅ Proper organizational hierarchy validation

---

## 🏛️ MoFAD Organizational Structure

### **Hierarchy Levels:**

1. **Chief Director** (Top Level)
   - Units that report directly to Chief Director
   - No directorate assignment

2. **Directorate Level**
   - Finance & Administration Directorate
   - Policy, Planning, Monitoring & Evaluation (PPME) Directorate

3. **Unit Level** (18 Units Total)
   - Each unit belongs to a directorate OR reports to Chief Director
   - Units are the primary organizational assignment

4. **Duty Station**
   - HQ (Headquarters)
   - Region
   - District
   - Agency

---

## 📝 Required Information for Staff Creation

### **1. Basic Personal Information** (Required)

- **Staff ID**: Unique identifier (e.g., MFA-001)
  - Format: Must be unique across all staff
  - Validation: Checked for duplicates
  
- **First Name**: Staff member's first name
- **Last Name**: Staff member's last name
- **Email**: Official email address
  - Must be unique
  - Format: email@mofad.gov.gh (or similar)
  
- **Phone**: Contact phone number
- **Join Date**: Date of employment/joining MoFAD

### **2. MoFAD Organizational Structure** (Required)

#### **Unit Assignment** (Primary)
- **Unit**: Select from 18 approved MoFAD units
  - System validates unit exists in MoFAD structure
  - Auto-sets directorate if unit belongs to one
  - If unit reports to Chief Director, directorate must be empty

**Available Units:**
- **Office of the Minister** (Reports to Chief Director):
  - Ministerial Secretariat
  - Protocol Unit
  - Public Affairs / Communications Unit

- **Office of the Chief Director** (Reports to Chief Director):
  - Policy, Planning, Monitoring & Evaluation (PPME) Unit
  - Internal Audit Unit
  - Legal Unit
  - Research, Statistics & Information Management (RSIM) Unit
  - Procurement Unit

- **Finance & Administration Directorate**:
  - Human Resource Management Unit (HRMU)
  - Accounts Unit
  - Budget Unit
  - Stores Unit
  - Transport & Logistics Unit
  - Records / Registry Unit

- **Policy, Planning, Monitoring & Evaluation (PPME) Directorate**:
  - Policy Analysis Unit
  - Monitoring & Evaluation Unit
  - Project Coordination Unit
  - ICT Unit

#### **Directorate Assignment** (Auto-set or Manual)
- **Directorate**: 
  - Auto-set when unit is selected (if unit belongs to directorate)
  - Must be empty if unit reports to Chief Director
  - System validates unit-directorate relationship

**Available Directorates:**
- Finance & Administration Directorate
- Policy, Planning, Monitoring & Evaluation (PPME) Directorate
- (Empty = Reports to Chief Director)

#### **Duty Station** (Required)
- **Duty Station**: Location of work
  - HQ (Headquarters)
  - Region
  - District
  - Agency

### **3. Employment Details** (Required)

#### **Position & Grade**
- **Position**: Job title/position name
  - e.g., "Senior Fisheries Officer", "Principal Officer"
  
- **Grade**: Ghana Government Public Service Grade
  - **SSS** (Senior Staff Service): SSS 1-6
  - **PSS** (Principal Staff Service): PSS 1-6
  - **DSS** (Deputy Staff Service): DSS 1-6
  - **USS** (Upper Staff Service): USS 1-6
  - **MSS** (Middle Staff Service): MSS 1-6
  - **JSS** (Junior Staff Service): JSS 1-6

- **Level**: Government level (1-12)
  - Level 1 = Entry level
  - Level 12 = Senior management

- **Rank**: Government rank
  - Chief Director
  - Deputy Chief Director
  - Director
  - Deputy Director
  - Principal Officer
  - Senior Officer
  - Officer
  - Assistant Officer
  - Senior Staff
  - Staff
  - Junior Staff

- **Step**: Step within grade (1-15)
  - Progression step within the grade
  - Used for salary determination

#### **Department**
- **Department**: Department name
  - Can be different from unit
  - e.g., "Fisheries", "Aquaculture", "Administration"

### **4. Reporting Structure** (Optional but Recommended)

#### **Immediate Supervisor**
- **Immediate Supervisor**: Staff ID of direct line manager
  - Used for leave approval workflow
  - Must be an active staff member
  - Cannot be self

#### **Manager (Team Assignment)**
- **Manager**: Staff ID of team/department manager
  - Used for team assignment
  - Must be an active staff member
  - Can be different from immediate supervisor

### **5. Additional Information** (Optional)

- **Photo**: Staff photo (JPG, PNG, GIF, max 5MB)
- **Active Status**: Whether staff is currently active
- **Employment Status**: 
  - active
  - terminated
  - resigned
  - retired
  - suspended

---

## ✅ Validation Rules

### **Organizational Structure Validation:**

1. **Unit Validation**:
   - ✅ Unit must exist in MoFAD approved units list
   - ✅ Unit-directorate relationship must be correct
   - ✅ If unit reports to Chief Director, directorate must be empty

2. **Directorate Validation**:
   - ✅ If directorate is set, unit must belong to that directorate
   - ✅ If unit reports to Chief Director, directorate must be empty

3. **Manager/Supervisor Validation**:
   - ✅ Manager/Supervisor must exist in system
   - ✅ Manager/Supervisor must be active
   - ✅ Cannot assign self as supervisor

### **Data Validation:**

1. **Staff ID**:
   - ✅ Must be unique
   - ✅ Cannot be empty

2. **Email**:
   - ✅ Must be unique
   - ✅ Must be valid email format

3. **Required Fields**:
   - ✅ Staff ID, First Name, Last Name, Email
   - ✅ Unit, Duty Station
   - ✅ Position, Grade, Level
   - ✅ Join Date

---

## 🔄 Complete Staff Creation Process

### **Step 1: HR Officer Creates Staff Record**

1. **Navigate to**: Staff Management → Add New Staff

2. **Fill Required Information**:
   ```
   Basic Info:
   - Staff ID: MFA-001
   - First Name: John
   - Last Name: Doe
   - Email: john.doe@mofad.gov.gh
   - Phone: +233 XX XXX XXXX
   - Join Date: 2024-01-15
   
   MoFAD Structure:
   - Unit: Accounts Unit
   - Directorate: (Auto-set to "Finance & Administration Directorate")
   - Duty Station: HQ
   
   Employment:
   - Position: Senior Accounts Officer
   - Grade: PSS 4
   - Level: 8
   - Rank: Senior Officer
   - Step: 3
   - Department: Finance
   
   Reporting:
   - Immediate Supervisor: MFA-050 (Select from dropdown)
   - Manager: MFA-045 (Select from dropdown)
   ```

3. **System Validates**:
   - ✅ Unit exists and belongs to correct directorate
   - ✅ Staff ID is unique
   - ✅ Email is unique
   - ✅ Manager/Supervisor are valid and active
   - ✅ Organizational structure is correct

4. **System Creates**:
   - ✅ StaffMember record
   - ✅ LeaveBalance record (all balances = 0)
   - ✅ Audit log entry
   - ❌ **NO User account** (created separately by Admin)

### **Step 2: Admin Creates Login Credentials**

See `STAFF-AND-USER-MANAGEMENT-FLOW.md` for details.

---

## 🎯 State Organization Rules Compliance

### **Ghana Government Public Service Standards:**

1. **✅ Grade Structure**: Uses official Ghana Government grade system
   - SSS, PSS, DSS, USS, MSS, JSS (1-6 each)

2. **✅ Level Structure**: Uses 12-level government structure
   - Level 1 (Entry) to Level 12 (Senior Management)

3. **✅ Rank Structure**: Uses standard government ranks
   - Chief Director → Junior Staff hierarchy

4. **✅ Organizational Hierarchy**: Follows MoFAD structure
   - Chief Director → Directorates → Units
   - Proper reporting relationships

5. **✅ Duty Station**: Supports government locations
   - HQ, Region, District, Agency

### **MoFAD-Specific Rules:**

1. **✅ Unit Assignment**: Must be from approved 18 units
2. **✅ Directorate Relationship**: Validated automatically
3. **✅ Reporting Structure**: Supports supervisor/manager assignment
4. **✅ Audit Trail**: All actions logged for compliance

---

## 📊 API Endpoint Details

### **POST /api/staff**

**Authorization**: HR_OFFICER, HR_DIRECTOR, SYS_ADMIN

**Request Body:**
```json
{
  "staffId": "MFA-001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@mofad.gov.gh",
  "phone": "+233 XX XXX XXXX",
  "department": "Finance",
  "position": "Senior Accounts Officer",
  "grade": "PSS 4",
  "level": "Level 8",
  "rank": "Senior Officer",
  "step": "3",
  "directorate": "Finance & Administration Directorate",
  "unit": "Accounts Unit",
  "dutyStation": "HQ",
  "joinDate": "2024-01-15",
  "managerId": "MFA-045",
  "immediateSupervisorId": "MFA-050",
  "active": true,
  "employmentStatus": "active"
}
```

**Validation Performed:**
1. ✅ Staff ID uniqueness
2. ✅ Email uniqueness
3. ✅ Unit exists in MoFAD structure
4. ✅ Unit-directorate relationship
5. ✅ Manager/Supervisor existence and active status
6. ✅ Self-assignment prevention

**Response:**
```json
{
  "id": "...",
  "staffId": "MFA-001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@mofad.gov.gh",
  "unit": "Accounts Unit",
  "directorate": "Finance & Administration Directorate",
  "dutyStation": "HQ",
  ...
}
```

**What Gets Created:**
- ✅ StaffMember record
- ✅ LeaveBalance record (initialized to 0)
- ✅ Audit log entry

---

## 🔍 Organizational Filtering

### **How Staff Visibility Works:**

Based on role and organizational position:

1. **HR Roles** (HR_OFFICER, HR_DIRECTOR):
   - ✅ Can view ALL staff members
   - ✅ No filtering applied

2. **Director**:
   - ✅ Can view staff in their directorate only
   - Filter: `directorate = user's directorate`

3. **Unit Head**:
   - ✅ Can view staff in their unit only
   - Filter: `unit = user's unit`

4. **Regional Manager**:
   - ✅ Can view staff in Region/District duty stations
   - Filter: `dutyStation IN ['Region', 'District']`

5. **Supervisor**:
   - ✅ Can view direct reports only
   - Filter: `managerId = user's staffId OR immediateSupervisorId = user's staffId`

6. **Employee**:
   - ✅ Can view own record only
   - Filter: `staffId = user's staffId`

---

## ⚠️ Common Errors and Solutions

### **Error: "Unit is not a valid MoFAD unit"**
- **Cause**: Unit name doesn't match approved MoFAD units
- **Solution**: Select from the dropdown list of approved units

### **Error: "Unit belongs to [Directorate], not [Other Directorate]"**
- **Cause**: Unit-directorate mismatch
- **Solution**: System auto-corrects, or clear directorate if unit reports to Chief Director

### **Error: "Manager with Staff ID not found"**
- **Cause**: Manager Staff ID doesn't exist
- **Solution**: Verify manager Staff ID or leave field empty

### **Error: "Staff member cannot be their own supervisor"**
- **Cause**: Self-assignment attempted
- **Solution**: Select a different supervisor

### **Error: "Staff ID already exists"**
- **Cause**: Duplicate Staff ID
- **Solution**: Use a unique Staff ID

---

## 📋 Best Practices

1. **✅ Always select Unit first** - System will auto-set directorate
2. **✅ Verify organizational structure** - Ensure unit-directorate relationship is correct
3. **✅ Assign supervisors** - Important for leave approval workflow
4. **✅ Use proper grades** - Follow Ghana Government grade structure
5. **✅ Complete all required fields** - Ensures proper record keeping
6. **✅ Verify Staff ID format** - Use consistent format (e.g., MFA-XXX)

---

## 🎯 Summary

The staff creation process:

1. ✅ **Follows MoFAD organizational structure** - 18 approved units, proper directorate relationships
2. ✅ **Complies with Ghana Government standards** - Grade, level, rank structures
3. ✅ **Validates organizational hierarchy** - Unit-directorate relationships enforced
4. ✅ **Supports reporting structure** - Supervisor/manager assignment
5. ✅ **Enforces state organization rules** - Proper validation and audit trail
6. ✅ **Creates complete records** - Staff member + leave balance + audit log

**Status**: ✅ **Ready for Production Use**

---

**Last Updated**: 2024-12-26  
**Version**: 1.0

