# Seed Script Update Summary

## Overview
The seed script (`prisma/seed.ts`) has been comprehensively updated to match the current MoFA (Ministry of Fisheries and Aquaculture) Ghana Government HR system.

## Key Changes

### 1. Comprehensive Data Clearing ✅
- **Before**: Only cleared 8 tables
- **After**: Clears ALL 30+ tables in proper dependency order
- Includes: Users, Sessions, Notifications, Leave Approvals, Attachments, and all related data
- Prevents foreign key constraint violations

### 2. Updated to MoFA Ghana Structure ✅
- **Before**: Used Kenya structure (mofa.go.ke emails, Kenyan names)
- **After**: Uses Ghana structure (mofad.gov.gh emails, Ghanaian names)
- Updated all staff member data with proper MoFA organizational structure:
  - Directorate assignments
  - Unit assignments
  - Duty station (HQ/Region/District)
  - Rank and step within grade
  - Proper supervisor relationships

### 3. Enhanced Staff Members ✅
All staff members now include:
- **Ghanaian names**: Amoah, Asante, Mensah, Osei, Boateng, Darko, Adjei, Appiah
- **Proper emails**: `@mofa.gov.gh` domain
- **Ghana phone numbers**: `+233` format
- **Organizational structure**:
  - Directorates (Fisheries, Aquaculture, R&D, PPME, Finance & Administration)
  - Units (Marine Fisheries, Aquaculture Development, Research, Policy, HRMU)
  - Duty stations (HQ, Region)
  - Ranks and steps
- **Supervisor relationships**: Proper manager and immediate supervisor links

### 4. Complete Leave Policies ✅
- Added all 9 leave types (Annual, Sick, Unpaid, Special Service, Training, Study, Maternity, Paternity, Compassionate)
- Added `accrualFrequency` field
- Added `expiresAfterMonths` field
- Proper approval levels for each type

### 5. Enhanced Leave Balances ✅
- Includes all 9 leave types
- Added carry-forward tracking fields
- Added accrual tracking (lastAccrualDate, accrualPeriod)
- Proper expiration dates

### 6. Updated Leave Requests ✅
- Uses correct staff names
- Uses MoFA role codes (SUPERVISOR, HR_OFFICER) instead of legacy roles
- Includes `declarationAccepted` field
- Proper approval workflow structure

### 7. Updated Audit Logs ✅
- Uses correct user emails
- Includes `userRole` field for compliance
- Proper action tracking

### 8. User Accounts ✅
- All 18 role-based users created
- Linked to correct staff members
- Uses MoFA role codes
- Proper email addresses

## Staff Members Created

| Staff ID | Name | Position | Directorate | Unit | Duty Station |
|----------|------|----------|-------------|------|--------------|
| MFA-001 | John Amoah | Senior Fisheries Officer | Fisheries Directorate | Marine Fisheries Unit | HQ |
| MFA-002 | Mary Asante | Aquaculture Specialist | Aquaculture Directorate | Aquaculture Development Unit | HQ |
| MFA-003 | Peter Mensah | Research Scientist | R&D Directorate | Research Unit | HQ |
| MFA-004 | Sarah Osei | Policy Analyst | PPME Directorate | Policy Unit | HQ |
| MFA-005 | David Boateng | Director | Fisheries Directorate | - | HQ |
| MFA-006 | Grace Darko | Regional Manager | Aquaculture Directorate | - | Region |
| MFA-007 | James Adjei | HR Director | Finance & Administration | HRMU | HQ |
| MFA-008 | Lucy Appiah | HR Officer | Finance & Administration | HRMU | HQ |

## Data Cleared (In Order)

1. LeaveApprovalHistory
2. ApprovalStep
3. LeaveAttachment
4. LeaveRequest
5. LeaveAccrualHistory
6. LeaveBalance
7. LeaveRequestTemplate
8. AuditLog
9. Notification
10. Session
11. PasswordResetToken
12. PasswordResetRequest
13. PushSubscription
14. User
15. PerformanceReview
16. Payslip
17. AttendanceCorrection
18. Attendance
19. Timesheet
20. DisciplinaryAction
21. Document
22. SalaryStructure
23. TrainingAttendance
24. TrainingProgram
25. OnboardingChecklist
26. OffboardingChecklist
27. ProfileChangeRequest
28. ApprovalDelegation
29. Interview
30. Candidate
31. JobPosting
32. Payroll
33. Holiday
34. LeavePolicy
35. SystemSettings
36. StaffMember

## Leave Policies Created

1. **Annual** - 30 days, 2.5/month, carryover allowed (10 days max), expires after 12 months
2. **Sick** - 30 days, 2.5/month, no carryover, no expiration
3. **Unpaid** - 90 days, no accrual, requires approval
4. **Special Service** - 14 days, no accrual
5. **Training** - 10 days, no accrual
6. **Study** - 30 days, no accrual
7. **Maternity** - 90 days, no accrual
8. **Paternity** - 7 days, no accrual
9. **Compassionate** - 5 days, no accrual

## User Accounts Created

### MoFA Exact Roles (11)
- employee@mofa.gov.gh (EMPLOYEE)
- supervisor@mofa.gov.gh (SUPERVISOR)
- unithead@mofa.gov.gh (UNIT_HEAD)
- divisionhead@mofa.gov.gh (DIVISION_HEAD)
- director@mofa.gov.gh (DIRECTOR)
- regionalmanager@mofa.gov.gh (REGIONAL_MANAGER)
- hrofficer@mofa.gov.gh (HR_OFFICER)
- hrdirector@mofa.gov.gh (HR_DIRECTOR)
- chiefdirector@mofa.gov.gh (CHIEF_DIRECTOR)
- auditor@mofa.gov.gh (AUDITOR)
- sysadmin@mofa.gov.gh (SYS_ADMIN)

### Legacy Roles (7)
- employee.legacy@mofa.gov.gh (employee)
- supervisor.legacy@mofa.gov.gh (supervisor)
- manager.legacy@mofa.gov.gh (manager)
- hr.legacy@mofa.gov.gh (hr)
- admin.legacy@mofa.gov.gh (admin)
- hrassistant@mofa.gov.gh (hr_assistant)
- deputydirector@mofa.gov.gh (deputy_director)

**All users password**: `Password123!`

## How to Use

1. **Run the seed script**:
   ```bash
   npm run db:seed
   ```

2. **The script will**:
   - Clear all existing data
   - Create 8 staff members with full MoFA structure
   - Create 9 leave policies
   - Create 8 leave balances with all leave types
   - Create 13 Ghana public holidays
   - Create 4 leave request templates
   - Create 5 sample leave requests
   - Create 5 payslips
   - Create 3 performance reviews
   - Create 7 audit logs
   - Create 18 user accounts with login credentials

3. **Login with any role**:
   - Email: `{role}@mofa.gov.gh`
   - Password: `Password123!`

## Verification

After running the seed, verify:
- ✅ All staff members have proper organizational structure
- ✅ All leave policies are created
- ✅ All user accounts are active
- ✅ Supervisor relationships are correct
- ✅ Leave balances include all leave types
- ✅ Audit logs include userRole field

## Notes

- The seed script is **idempotent** - it clears all data first, so you can run it multiple times safely
- All data matches the current MoFA Ghana Government structure
- Staff emails match user account emails where applicable
- All foreign key relationships are properly maintained
- The script handles errors gracefully and continues with remaining data

---

**Last Updated**: 2024  
**Version**: 2.0  
**Status**: ✅ Complete and Ready for Use

