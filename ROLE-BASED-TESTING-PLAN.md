# Role-Based Access Control Testing Plan
**Date**: December 2024  
**System**: HR Staff Leave Portal (MoFA)

---

## Overview

This document provides a comprehensive testing plan for verifying role-based access control (RBAC) across all 12 user roles in the system. Each role should be tested to ensure proper access boundaries and permissions.

---

## Testing Methodology

### Test Environment Setup

1. **Create Test Users** for each role:
   - Use seed script or manual creation
   - Ensure each user has associated staff record
   - Verify user is active and has correct role assigned

2. **Test Data Preparation**:
   - Create sample leave requests
   - Create sample staff records
   - Create sample documents
   - Set up organizational hierarchy

3. **Test Execution**:
   - Login as each role
   - Verify dashboard access
   - Test all navigation items
   - Test CRUD operations
   - Verify permission boundaries

---

## Role Testing Matrix

### 1. EMPLOYEE Role

**Expected Permissions**:
- ✅ View own profile
- ✅ View own leave requests
- ✅ Create leave requests
- ✅ View own leave balance
- ✅ View own payslips
- ✅ View own performance reviews
- ❌ Cannot view other employees' data
- ❌ Cannot approve leaves
- ❌ Cannot create/edit staff

**Test Cases**:

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| EMP-001 | Login as EMPLOYEE | ✅ Should access employee portal | ⚠️ Manual Test |
| EMP-002 | View own dashboard | ✅ Should show own leave stats | ⚠️ Manual Test |
| EMP-003 | Submit leave request | ✅ Should create leave request | ⚠️ Manual Test |
| EMP-004 | View own leave history | ✅ Should show only own leaves | ⚠️ Manual Test |
| EMP-005 | View own leave balance | ✅ Should show own balance | ⚠️ Manual Test |
| EMP-006 | Try to view other employee's profile | ❌ Should be denied (403) | ⚠️ Manual Test |
| EMP-007 | Try to approve leave request | ❌ Should be denied (403) | ⚠️ Manual Test |
| EMP-008 | Try to access staff management | ❌ Should be denied (403) | ⚠️ Manual Test |
| EMP-009 | Download own approval letter | ✅ Should work if approved | ⚠️ Manual Test |
| EMP-010 | View own documents | ✅ Should show own documents | ⚠️ Manual Test |

---

### 2. SUPERVISOR Role

**Expected Permissions**:
- ✅ All EMPLOYEE permissions
- ✅ View direct reports' profiles
- ✅ Approve direct reports' leave requests (Level 1)
- ✅ View direct reports' leave balances
- ✅ View direct reports' performance reviews
- ❌ Cannot approve non-team leaves
- ❌ Cannot create staff

**Test Cases**:

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| SUP-001 | Login as SUPERVISOR | ✅ Should access manager portal | ⚠️ Manual Test |
| SUP-002 | View team dashboard | ✅ Should show team leave stats | ⚠️ Manual Test |
| SUP-003 | View direct reports | ✅ Should show only direct reports | ⚠️ Manual Test |
| SUP-004 | Approve direct report's leave | ✅ Should approve (Level 1) | ⚠️ Manual Test |
| SUP-005 | Reject direct report's leave | ✅ Should reject with reason | ⚠️ Manual Test |
| SUP-006 | View team leave requests | ✅ Should show team leaves only | ⚠️ Manual Test |
| SUP-007 | Try to approve non-team leave | ❌ Should be denied (403) | ⚠️ Manual Test |
| SUP-008 | Try to view other unit's staff | ❌ Should be denied (403) | ⚠️ Manual Test |
| SUP-009 | Try to create staff | ❌ Should be denied (403) | ⚠️ Manual Test |
| SUP-010 | View team performance reviews | ✅ Should show team reviews | ⚠️ Manual Test |

---

### 3. UNIT_HEAD Role

**Expected Permissions**:
- ✅ All SUPERVISOR permissions
- ✅ View all unit staff
- ✅ Approve unit staff leave requests (Level 2)
- ✅ View unit reports
- ✅ Manage own unit information
- ❌ Cannot approve non-unit leaves
- ❌ Cannot create staff

**Test Cases**:

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| UH-001 | Login as UNIT_HEAD | ✅ Should access manager portal | ⚠️ Manual Test |
| UH-002 | View unit dashboard | ✅ Should show unit stats | ⚠️ Manual Test |
| UH-003 | View all unit staff | ✅ Should show unit staff only | ⚠️ Manual Test |
| UH-004 | Approve unit staff leave | ✅ Should approve (Level 2) | ⚠️ Manual Test |
| UH-005 | View unit leave requests | ✅ Should show unit leaves | ⚠️ Manual Test |
| UH-006 | View unit reports | ✅ Should show unit reports | ⚠️ Manual Test |
| UH-007 | Try to approve other unit's leave | ❌ Should be denied (403) | ⚠️ Manual Test |
| UH-008 | Try to view other unit's staff | ❌ Should be denied (403) | ⚠️ Manual Test |
| UH-009 | Manage unit information | ✅ Should work for own unit | ⚠️ Manual Test |
| UH-010 | View parent directorate | ✅ Should have read access | ⚠️ Manual Test |

---

### 4. DIVISION_HEAD Role

**Expected Permissions**:
- ✅ All UNIT_HEAD permissions
- ✅ View division staff
- ✅ Approve division staff leave requests (Level 3)
- ✅ View division reports
- ❌ Cannot approve non-division leaves

**Test Cases**:

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| DH-001 | Login as DIVISION_HEAD | ✅ Should access manager portal | ⚠️ Manual Test |
| DH-002 | View division dashboard | ✅ Should show division stats | ⚠️ Manual Test |
| DH-003 | View division staff | ✅ Should show division staff | ⚠️ Manual Test |
| DH-004 | Approve division leave | ✅ Should approve (Level 3) | ⚠️ Manual Test |
| DH-005 | View division reports | ✅ Should show division reports | ⚠️ Manual Test |
| DH-006 | Try to approve other division's leave | ❌ Should be denied (403) | ⚠️ Manual Test |
| DH-007 | View parent directorate | ✅ Should have read access | ⚠️ Manual Test |

---

### 5. DIRECTOR Role

**Expected Permissions**:
- ✅ All DIVISION_HEAD permissions
- ✅ View directorate staff
- ✅ Approve directorate staff leave requests (Level 4)
- ✅ Manage own directorate
- ✅ View directorate reports
- ❌ Cannot approve non-directorate leaves

**Test Cases**:

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| DIR-001 | Login as DIRECTOR | ✅ Should access director portal | ⚠️ Manual Test |
| DIR-002 | View directorate dashboard | ✅ Should show directorate stats | ⚠️ Manual Test |
| DIR-003 | View directorate staff | ✅ Should show directorate staff | ⚠️ Manual Test |
| DIR-004 | Approve directorate leave | ✅ Should approve (Level 4) | ⚠️ Manual Test |
| DIR-005 | Manage directorate | ✅ Should work for own directorate | ⚠️ Manual Test |
| DIR-006 | View directorate reports | ✅ Should show directorate reports | ⚠️ Manual Test |
| DIR-007 | Try to approve other directorate's leave | ❌ Should be denied (403) | ⚠️ Manual Test |
| DIR-008 | Approve senior staff leave | ✅ Should work for directorate | ⚠️ Manual Test |

---

### 6. REGIONAL_MANAGER Role

**Expected Permissions**:
- ✅ View regional/district staff
- ✅ Approve regional staff leave requests
- ✅ View regional reports
- ✅ Manage own region
- ❌ Cannot approve HQ staff leaves

**Test Cases**:

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| RM-001 | Login as REGIONAL_MANAGER | ✅ Should access manager portal | ⚠️ Manual Test |
| RM-002 | View regional dashboard | ✅ Should show regional stats | ⚠️ Manual Test |
| RM-003 | View regional staff | ✅ Should show regional staff | ⚠️ Manual Test |
| RM-004 | Approve regional leave | ✅ Should approve regional leaves | ⚠️ Manual Test |
| RM-005 | Route to HQ if needed | ✅ Should route to HQ | ⚠️ Manual Test |
| RM-006 | View regional reports | ✅ Should show regional reports | ⚠️ Manual Test |
| RM-007 | Try to approve HQ staff leave | ❌ Should be denied (403) | ⚠️ Manual Test |

---

### 7. HR_OFFICER Role

**Expected Permissions**:
- ✅ View all staff
- ✅ Create/edit staff records
- ✅ View all leave requests
- ✅ Approve all leave requests (Final approval)
- ✅ Manage leave policies
- ✅ Manage holidays
- ✅ Generate reports
- ❌ Cannot manage system settings
- ❌ Cannot assign roles

**Test Cases**:

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| HR-001 | Login as HR_OFFICER | ✅ Should access HR portal | ⚠️ Manual Test |
| HR-002 | View HR dashboard | ✅ Should show all stats | ⚠️ Manual Test |
| HR-003 | Create staff record | ✅ Should create staff | ⚠️ Manual Test |
| HR-004 | Edit staff record | ✅ Should update staff | ⚠️ Manual Test |
| HR-005 | View all leave requests | ✅ Should show all leaves | ⚠️ Manual Test |
| HR-006 | Approve leave (final) | ✅ Should approve (final level) | ⚠️ Manual Test |
| HR-007 | Manage leave policies | ✅ Should create/edit policies | ⚠️ Manual Test |
| HR-008 | Manage holidays | ✅ Should create/edit holidays | ⚠️ Manual Test |
| HR-009 | Generate reports | ✅ Should generate all reports | ⚠️ Manual Test |
| HR-010 | Try to access system settings | ❌ Should be denied (403) | ⚠️ Manual Test |
| HR-011 | Try to assign roles | ❌ Should be denied (403) | ⚠️ Manual Test |
| HR-012 | Upload documents | ✅ Should upload documents | ⚠️ Manual Test |

---

### 8. HR_DIRECTOR Role

**Expected Permissions**:
- ✅ All HR_OFFICER permissions
- ✅ Approve senior staff/director leave
- ✅ Override approvals
- ✅ View audit logs
- ✅ Manage organizational structure
- ❌ Cannot manage system settings
- ❌ Cannot assign roles

**Test Cases**:

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| HRD-001 | Login as HR_DIRECTOR | ✅ Should access HR portal | ⚠️ Manual Test |
| HRD-002 | Approve Director leave | ✅ Should approve director leave | ⚠️ Manual Test |
| HRD-003 | Override approval | ✅ Should override if needed | ⚠️ Manual Test |
| HRD-004 | View audit logs | ✅ Should view audit logs | ⚠️ Manual Test |
| HRD-005 | Manage org structure | ✅ Should manage structure | ⚠️ Manual Test |
| HRD-006 | Approve balance override | ✅ Should approve overrides | ⚠️ Manual Test |
| HRD-007 | Try to access system settings | ❌ Should be denied (403) | ⚠️ Manual Test |

---

### 9. CHIEF_DIRECTOR Role

**Expected Permissions**:
- ✅ View all staff
- ✅ View all leave requests
- ✅ Approve Directors & HR Director leave
- ✅ View all reports
- ✅ View audit logs
- ❌ Cannot create/edit staff
- ❌ Cannot manage policies

**Test Cases**:

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| CD-001 | Login as CHIEF_DIRECTOR | ✅ Should access portal | ⚠️ Manual Test |
| CD-002 | View executive dashboard | ✅ Should show all stats | ⚠️ Manual Test |
| CD-003 | Approve Director leave | ✅ Should approve director leave | ⚠️ Manual Test |
| CD-004 | Approve HR Director leave | ✅ Should approve HR director leave | ⚠️ Manual Test |
| CD-005 | View all reports | ✅ Should view all reports | ⚠️ Manual Test |
| CD-006 | View audit logs | ✅ Should view audit logs | ⚠️ Manual Test |
| CD-007 | Try to create staff | ❌ Should be denied (403) | ⚠️ Manual Test |
| CD-008 | Try to manage policies | ❌ Should be denied (403) | ⚠️ Manual Test |

---

### 10. AUDITOR Role

**Expected Permissions**:
- ✅ View all staff (read-only)
- ✅ View all leave requests (read-only)
- ✅ View all performance reviews (read-only)
- ✅ View all reports (read-only)
- ✅ View audit logs (full access)
- ✅ Export data
- ❌ Cannot edit any data
- ❌ Cannot approve leaves

**Test Cases**:

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| AUD-001 | Login as AUDITOR | ✅ Should access auditor portal | ⚠️ Manual Test |
| AUD-002 | View auditor dashboard | ✅ Should show read-only stats | ⚠️ Manual Test |
| AUD-003 | View all staff | ✅ Should view all staff (read-only) | ⚠️ Manual Test |
| AUD-004 | View all leave requests | ✅ Should view all leaves (read-only) | ⚠️ Manual Test |
| AUD-005 | View audit logs | ✅ Should view all audit logs | ⚠️ Manual Test |
| AUD-006 | Export reports | ✅ Should export data | ⚠️ Manual Test |
| AUD-007 | Try to edit staff | ❌ Should be denied (403) | ⚠️ Manual Test |
| AUD-008 | Try to approve leave | ❌ Should be denied (403) | ⚠️ Manual Test |
| AUD-009 | Try to create staff | ❌ Should be denied (403) | ⚠️ Manual Test |
| AUD-010 | View compliance reports | ✅ Should view compliance data | ⚠️ Manual Test |

---

### 11. SYSTEM_ADMIN Role

**Expected Permissions**:
- ✅ Full system access
- ✅ User management
- ✅ Role assignment
- ✅ System configuration
- ✅ Audit log access
- ✅ All HR permissions
- ✅ All management permissions

**Test Cases**:

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| SYS-001 | Login as SYSTEM_ADMIN | ✅ Should access admin portal | ⚠️ Manual Test |
| SYS-002 | View admin dashboard | ✅ Should show system stats | ⚠️ Manual Test |
| SYS-003 | Manage users | ✅ Should create/edit/delete users | ⚠️ Manual Test |
| SYS-004 | Assign roles | ✅ Should assign roles | ⚠️ Manual Test |
| SYS-005 | System settings | ✅ Should configure system | ⚠️ Manual Test |
| SYS-006 | View audit logs | ✅ Should view all audit logs | ⚠️ Manual Test |
| SYS-007 | Create staff | ✅ Should create staff | ⚠️ Manual Test |
| SYS-008 | Approve leaves | ✅ Should approve all leaves | ⚠️ Manual Test |
| SYS-009 | Manage policies | ✅ Should manage policies | ⚠️ Manual Test |
| SYS-010 | View all reports | ✅ Should view all reports | ⚠️ Manual Test |

---

### 12. SECURITY_ADMIN Role

**Expected Permissions**:
- ✅ View all staff (read-only)
- ✅ View all leave requests (read-only)
- ✅ View audit logs (full access)
- ✅ View compliance reports
- ✅ View data access logs
- ❌ Cannot approve leaves
- ❌ Cannot edit staff records

**Test Cases**:

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| SEC-001 | Login as SECURITY_ADMIN | ✅ Should access portal | ⚠️ Manual Test |
| SEC-002 | View security dashboard | ✅ Should show security stats | ⚠️ Manual Test |
| SEC-003 | View audit logs | ✅ Should view all audit logs | ⚠️ Manual Test |
| SEC-004 | View data access logs | ✅ Should view access logs | ⚠️ Manual Test |
| SEC-005 | View compliance reports | ✅ Should view compliance | ⚠️ Manual Test |
| SEC-006 | View all staff (read-only) | ✅ Should view all staff | ⚠️ Manual Test |
| SEC-007 | Try to approve leave | ❌ Should be denied (403) | ⚠️ Manual Test |
| SEC-008 | Try to edit staff | ❌ Should be denied (403) | ⚠️ Manual Test |
| SEC-009 | Export audit data | ✅ Should export logs | ⚠️ Manual Test |

---

## Cross-Role Testing

### Multi-Level Approval Workflow

**Test Scenario**: Leave request requiring multiple approvals

1. **EMPLOYEE** submits leave request
2. **SUPERVISOR** approves (Level 1)
3. **UNIT_HEAD** approves (Level 2)
4. **HR_OFFICER** approves (Final)
5. **EMPLOYEE** receives notification and can download approval letter

**Expected Result**: All approval levels work correctly, proper notifications sent

---

## Security Testing

### Unauthorized Access Attempts

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| SEC-001 | EMPLOYEE tries to access admin routes | ❌ Should be denied (403) | ⚠️ Manual Test |
| SEC-002 | SUPERVISOR tries to approve non-team leave | ❌ Should be denied (403) | ⚠️ Manual Test |
| SEC-003 | HR tries to assign SYSTEM_ADMIN role | ❌ Should be denied (403) | ⚠️ Manual Test |
| SEC-004 | AUDITOR tries to edit data | ❌ Should be denied (403) | ⚠️ Manual Test |
| SEC-005 | Direct API access without auth | ❌ Should be denied (401) | ⚠️ Manual Test |

---

## Test Execution Checklist

### Pre-Testing
- [ ] All test users created
- [ ] Test data prepared
- [ ] Test environment configured
- [ ] Test plan reviewed

### During Testing
- [ ] Execute all test cases for each role
- [ ] Document any failures
- [ ] Take screenshots of issues
- [ ] Verify error messages are appropriate

### Post-Testing
- [ ] Compile test results
- [ ] Document findings
- [ ] Create bug reports for failures
- [ ] Update test plan based on findings

---

## Test Results Template

```
Role: [ROLE_NAME]
Tester: [NAME]
Date: [DATE]

Test Results:
- Test ID: [ID] - [PASS/FAIL] - [NOTES]
- Test ID: [ID] - [PASS/FAIL] - [NOTES]
...

Issues Found:
1. [ISSUE DESCRIPTION]
2. [ISSUE DESCRIPTION]

Overall Status: [PASS/FAIL]
```

---

## Notes

- All tests should be performed manually before production deployment
- Automated testing can be added later for regression testing
- Focus on permission boundaries and unauthorized access attempts
- Verify error messages are user-friendly and appropriate
- Test both UI and API endpoints

---

**Last Updated**: December 2024  
**Next Review**: After initial testing completion

