# Role-Based Login Credentials

This document contains login credentials for all role-based users in the MoFAD HR Leave Portal system.

## Default Password

**All test users use the same password:** `Password123!`

⚠️ **IMPORTANT:** Change these passwords in production environments!

---

## MoFAD Exact Role Credentials

| Role | Email | Password | Staff ID | Description |
|------|-------|----------|----------|-------------|
| **EMPLOYEE** | employee@mofad.gov.gh | Password123! | MFA-002 | All confirmed MoFAD staff - Basic self-service access |
| **SUPERVISOR** | supervisor@mofad.gov.gh | Password123! | MFA-001 | Immediate Supervisor / Line Manager - Level 1 Approval |
| **UNIT_HEAD** | unithead@mofad.gov.gh | Password123! | MFA-003 | Head of functional unit - Level 2 Approval |
| **DIVISION_HEAD** | divisionhead@mofad.gov.gh | Password123! | MFA-004 | Head of division under directorate - Level 3 Approval |
| **DIRECTOR** | director@mofad.gov.gh | Password123! | MFA-005 | Director of MoFAD Directorate - Level 4 Approval |
| **REGIONAL_MANAGER** | regionalmanager@mofad.gov.gh | Password123! | MFA-006 | Head of MoFAD Regional Office - Regional Approval |
| **HR_OFFICER** | hrofficer@mofad.gov.gh | Password123! | MFA-008 | HR Officer (HRM) - Final approval authority |
| **HR_DIRECTOR** | hrdirector@mofad.gov.gh | Password123! | MFA-007 | Head of Human Resource Directorate - Senior HR authority |
| **CHIEF_DIRECTOR** | chiefdirector@mofad.gov.gh | Password123! | N/A | Chief Director / Ministerial Authority - Highest approval |
| **AUDITOR** | auditor@mofad.gov.gh | Password123! | N/A | Internal Auditor (IAA) - Read-only access |
| **SYS_ADMIN** | sysadmin@mofad.gov.gh | Password123! | N/A | System Administrator - Full system access |

---

## Legacy Role Credentials (Backward Compatibility)

| Role | Email | Password | Staff ID | Description |
|------|-------|----------|----------|-------------|
| **employee** | employee.legacy@mofad.gov.gh | Password123! | N/A | Legacy employee role |
| **supervisor** | supervisor.legacy@mofad.gov.gh | Password123! | N/A | Legacy supervisor role |
| **manager** | manager.legacy@mofad.gov.gh | Password123! | N/A | Legacy manager role |
| **hr** | hr.legacy@mofad.gov.gh | Password123! | N/A | Legacy HR role |
| **admin** | admin.legacy@mofad.gov.gh | Password123! | N/A | Legacy admin role |
| **hr_assistant** | hrassistant@mofad.gov.gh | Password123! | N/A | HR Assistant - Restricted HR access |
| **deputy_director** | deputydirector@mofad.gov.gh | Password123! | N/A | Deputy Director - Directorate-level access |

---

## Role Permissions Summary

### EMPLOYEE
- View own profile and information
- Submit leave requests
- View own leave history and balance
- View own payslips
- View own performance reviews

### SUPERVISOR
- All EMPLOYEE permissions
- View direct reports
- Approve leave for direct reports (Level 1)
- View team attendance and timesheets
- View team reports

### UNIT_HEAD
- All SUPERVISOR permissions
- View and manage unit staff
- Approve leave for unit staff (Level 2)
- Manage unit information

### DIVISION_HEAD
- All UNIT_HEAD permissions
- View division staff
- Approve leave for division staff (Level 3)
- View parent directorate

### DIRECTOR
- All DIVISION_HEAD permissions
- View directorate staff
- Approve leave for directorate staff (Level 4)
- Manage directorate information

### REGIONAL_MANAGER
- View regional/district staff
- Approve leave for regional staff
- Manage regional information
- Route approvals to HQ when needed

### HR_OFFICER
- View all employees
- Final approval authority for all leave requests
- Manage leave policies
- Create leave requests on behalf of staff
- View all attendance and timesheets
- Correct attendance records
- View HR reports

### HR_DIRECTOR
- All HR_OFFICER permissions
- Create and delete employees
- Approve senior staff/director leave
- Conduct performance reviews
- View system audit logs
- Manage organizational structure

### CHIEF_DIRECTOR
- View all employees and leave requests
- Final approval authority for Directors & HR Director
- View all performance reviews
- View system reports and audit logs
- View all organizational structure

### AUDITOR
- **Read-only access** to all data
- View all employees, leave requests, and performance reviews
- View all attendance records
- View all reports
- Full audit log access
- View all organizational structure (read-only)

### SYS_ADMIN
- Full system configuration management
- User account management
- Role assignment
- System backup management
- All employee management permissions
- All leave management permissions
- All system reports access
- Full organizational structure management

---

## How to Use These Credentials

### 1. Run the Seed Script

First, ensure the database is seeded with staff members and user accounts:

```bash
npm run db:seed
```

This will create all staff members and user accounts with the credentials listed above.

### 2. Login to the Portal

1. Navigate to the login page
2. Enter the email address for the role you want to test
3. Enter the password: `Password123!`
4. Click "Login"

### 3. Test Different Roles

You can test different role functionalities by logging in with different credentials:

- **Employee Portal**: Use `employee@mofad.gov.gh`
- **Manager/Supervisor Portal**: Use `supervisor@mofad.gov.gh` or `manager.legacy@mofad.gov.gh`
- **HR Portal**: Use `hrofficer@mofad.gov.gh` or `hr.legacy@mofad.gov.gh`
- **Admin Portal**: Use `sysadmin@mofad.gov.gh` or `admin.legacy@mofad.gov.gh`
- **Auditor Portal**: Use `auditor@mofad.gov.gh`

---

## Staff Member Details

The following staff members are created by the seed script and linked to user accounts:

| Staff ID | Name | Position | Department | Linked User |
|----------|------|----------|------------|-------------|
| MFA-001 | John Mwangi | Senior Fisheries Officer | Fisheries Management | supervisor@mofad.gov.gh |
| MFA-002 | Mary Wanjiku | Aquaculture Specialist | Aquaculture Development | employee@mofad.gov.gh |
| MFA-003 | Peter Ochieng | Research Scientist | Research and Development | unithead@mofad.gov.gh |
| MFA-004 | Sarah Kamau | Policy Analyst | Policy and Planning | divisionhead@mofad.gov.gh |
| MFA-005 | David Kipchoge | Fisheries Officer | Fisheries Management | director@mofad.gov.gh |
| MFA-006 | Grace Njeri | Extension Officer | Aquaculture Development | regionalmanager@mofad.gov.gh |
| MFA-007 | James Omondi | Administrative Officer | Administration | hrdirector@mofad.gov.gh |
| MFA-008 | Lucy Wambui | HR Officer | Human Resources | hrofficer@mofad.gov.gh |

---

## Security Notes

1. **Default Password**: All test users share the same password for convenience during development. **This must be changed in production.**

2. **Password Requirements**: 
   - Minimum 8 characters
   - Should include uppercase, lowercase, numbers, and special characters in production

3. **Account Status**: All seeded accounts are set to `active: true` by default

4. **Email Verification**: All seeded accounts have `emailVerified: false`. Implement email verification in production.

5. **Staff Linking**: Some roles (like SYS_ADMIN, AUDITOR, CHIEF_DIRECTOR) may not be linked to staff records, which is acceptable for system-level roles.

---

## Troubleshooting

### User Not Found
- Ensure the seed script has been run: `npm run db:seed`
- Check that the email address is correct (case-sensitive)

### Invalid Password
- Default password is: `Password123!`
- Ensure Caps Lock is not enabled
- Check for typos

### Account Inactive
- All seeded accounts should be active by default
- Check the database if login fails: `npm run db:studio`

### Staff ID Not Found
- Some roles (SYS_ADMIN, AUDITOR, CHIEF_DIRECTOR) may not have staff IDs
- This is normal for system-level roles
- Other roles should have valid staff IDs from the seed script

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Implement password complexity requirements
- [ ] Enable email verification
- [ ] Set up password reset functionality
- [ ] Configure session timeout settings
- [ ] Enable two-factor authentication for admin roles
- [ ] Review and update role permissions
- [ ] Remove or secure test accounts
- [ ] Set up audit logging for credential changes
- [ ] Configure password expiration policies

---

## Additional Resources

- **Permissions System**: See `lib/permissions.ts` for detailed permission matrices
- **Role Mapping**: See `lib/role-mapping.ts` for role mapping utilities
- **Approval Workflow**: See `lib/mofad-approval-workflow.ts` for approval workflow logic
- **API Documentation**: See API routes in `app/api/` for authentication endpoints

---

**Last Updated**: Generated by seed script  
**Version**: 1.0  
**Environment**: Development/Testing

