# Quick Login Reference

## Default Password
**Password123!** (for all test users)

---

## Most Common Roles

| Role | Email | Use Case |
|------|-------|----------|
| **Employee** | employee@mofad.gov.gh | Test employee self-service features |
| **Supervisor** | supervisor@mofad.gov.gh | Test Level 1 approval workflow |
| **HR Officer** | hrofficer@mofad.gov.gh | Test HR portal and final approvals |
| **System Admin** | sysadmin@mofad.gov.gh | Test admin features and user management |
| **Auditor** | auditor@mofad.gov.gh | Test read-only audit access |

---

## All MoFAD Roles

| Email | Role |
|-------|------|
| employee@mofad.gov.gh | EMPLOYEE |
| supervisor@mofad.gov.gh | SUPERVISOR |
| unithead@mofad.gov.gh | UNIT_HEAD |
| divisionhead@mofad.gov.gh | DIVISION_HEAD |
| director@mofad.gov.gh | DIRECTOR |
| regionalmanager@mofad.gov.gh | REGIONAL_MANAGER |
| hrofficer@mofad.gov.gh | HR_OFFICER |
| hrdirector@mofad.gov.gh | HR_DIRECTOR |
| chiefdirector@mofad.gov.gh | CHIEF_DIRECTOR |
| auditor@mofad.gov.gh | AUDITOR |
| sysadmin@mofad.gov.gh | SYS_ADMIN |

---

## Legacy Roles

| Email | Role |
|-------|------|
| employee.legacy@mofad.gov.gh | employee |
| supervisor.legacy@mofad.gov.gh | supervisor |
| manager.legacy@mofad.gov.gh | manager |
| hr.legacy@mofad.gov.gh | hr |
| admin.legacy@mofad.gov.gh | admin |
| hrassistant@mofad.gov.gh | hr_assistant |
| deputydirector@mofad.gov.gh | deputy_director |

---

## Setup

Run the seed script to create all users:
```bash
npm run db:seed
```

---

For detailed information, see `ROLE-BASED-LOGIN-CREDENTIALS.md`

