# Test Credentials - MoFA Staff Management & Leave Portal

**Default Password for ALL Test Users**: `Password123!`

**Note**: All users from `@mofa.gov.gh` domain are seeded users and exempt from password expiration.

---

## Quick Reference by Role

### Executive Level

| Role | Email | Staff ID | Directorate | Unit | Route |
|------|-------|----------|-------------|------|-------|
| **Chief Director** | `chiefdirector@mofa.gov.gh` | `MoFA-CD-001` | Office of Chief Director | - | `/chief-director` |
| **System Admin** | `system.admin@mofa.gov.gh` | `MoFA-SYS-ADMIN-001` | IT | ICT Unit | `/admin` |

### HR Roles

| Role | Email | Staff ID | Directorate | Unit | Route |
|------|-------|----------|-------------|------|-------|
| **HR Director** | `director.hrmd@mofa.gov.gh` | `MoFA-DIR-HRMD` | HRMD | - | `/hr-director` |
| **HR Officer** | `hr.hrmd01@mofa.gov.gh` | `MoFA-HR-HRMD-01` | HRMD | HRMU | `/hr` |
| **HR Officer (PPBME)** | `hr.ppbme01@mofa.gov.gh` | `MoFA-HR-PPBME-01` | PPBME | - | `/hr` |

### Directorate Level

| Role | Email | Staff ID | Directorate | Unit | Route |
|------|-------|----------|-------------|------|-------|
| **Director PPBME** | `director.ppbme@mofa.gov.gh` | `MoFA-DIR-PPBME` | PPBME | - | `/director` |

### Unit Head Level

| Role | Email | Staff ID | Directorate | Unit | Route |
|------|-------|----------|-------------|------|-------|
| **Unit Head Policy** | `unithead.policy@mofa.gov.gh` | `MoFA-UH-PPBME-POLICY` | PPBME | Policy Coordination Unit | `/unit-head` |
| **Unit Head Planning** | `unithead.planning@mofa.gov.gh` | `MoFA-UH-PPBME-PB` | PPBME | Planning & Budgeting Unit | `/unit-head` |
| **Unit Head Monitoring** | `unithead.monitoring@mofa.gov.gh` | `MoFA-UH-PPBME-ME` | PPBME | Monitoring & Evaluation Unit | `/unit-head` |
| **Unit Head Fisheries** | `unithead.fisheries@mofa.gov.gh` | `MoFA-UH-PPBME-FMA` | PPBME | Fisheries Management & Aquaculture Development Unit | `/unit-head` |
| **Sub-Unit Head Culture** | `subunithead.culture@mofa.gov.gh` | `MoFA-SUBUH-PPBME-CCF` | PPBME | Culture & Capture Fisheries Sub-Unit | `/unit-head` |
| **Sub-Unit Head Post-Harvest** | `subunithead.postharvest@mofa.gov.gh` | `MoFA-SUBUH-PPBME-PHM` | PPBME | Post-Harvest & Marketing Sub-Unit | `/unit-head` |

### Supervisor Level

| Role | Email | Staff ID | Directorate | Unit | Route |
|------|-------|----------|-------------|------|-------|
| **Supervisor Policy 1** | `supervisor.policy01@mofa.gov.gh` | `MoFA-SUP-PPBME-POLICY-01` | PPBME | Policy Coordination Unit | `/supervisor` |
| **Supervisor Planning 1** | `supervisor.planning01@mofa.gov.gh` | `MoFA-SUP-PPBME-PB-01` | PPBME | Planning & Budgeting Unit | `/supervisor` |
| **Supervisor Monitoring 1** | `supervisor.monitoring01@mofa.gov.gh` | `MoFA-SUP-PPBME-ME-01` | PPBME | Monitoring & Evaluation Unit | `/supervisor` |
| **Supervisor Culture 1** | `supervisor.culture01@mofa.gov.gh` | `MoFA-SUP-PPBME-CCF-01` | PPBME | Culture & Capture Fisheries Sub-Unit | `/supervisor` |
| **Supervisor Post-Harvest 1** | `supervisor.postharvest01@mofa.gov.gh` | `MoFA-SUP-PPBME-PHM-01` | PPBME | Post-Harvest & Marketing Sub-Unit | `/supervisor` |

### Employee Level

| Role | Email | Staff ID | Directorate | Unit | Route |
|------|-------|----------|-------------|------|-------|
| **Employee Policy 1** | `employee.policy01@mofa.gov.gh` | `MoFA-EMP-PPBME-POLICY-01` | PPBME | Policy Coordination Unit | `/employee` |
| **Employee Planning 1** | `employee.planning01@mofa.gov.gh` | `MoFA-EMP-PPBME-PB-01` | PPBME | Planning & Budgeting Unit | `/employee` |
| **Employee Monitoring 1** | `employee.monitoring01@mofa.gov.gh` | `MoFA-EMP-PPBME-ME-01` | PPBME | Monitoring & Evaluation Unit | `/employee` |
| **Employee Culture 1** | `employee.culture01@mofa.gov.gh` | `MoFA-EMP-PPBME-CCF-01` | PPBME | Culture & Capture Fisheries Sub-Unit | `/employee` |
| **Employee Post-Harvest 1** | `employee.postharvest01@mofa.gov.gh` | `MoFA-EMP-PPBME-PHM-01` | PPBME | Post-Harvest & Marketing Sub-Unit | `/employee` |

### Auditor Role

| Role | Email | Staff ID | Directorate | Unit | Route |
|------|-------|----------|-------------|------|-------|
| **Internal Auditor** | `head.audit@mofa.gov.gh` | `MoFA-HEAD-AUDIT` | Office of Chief Director | Internal Audit Unit | `/auditor` |

---

## Testing Scenarios

### Scenario 1: Complete Approval Workflow (Standard Staff)

1. **Login as Employee**: `employee.policy01@mofa.gov.gh` / `Password123!`
   - Submit leave request
   - Verify dashboard shows pending request

2. **Login as Supervisor**: `supervisor.policy01@mofa.gov.gh` / `Password123!`
   - Verify pending leave request appears
   - Approve leave request
   - Verify status updates

3. **Login as Unit Head**: `unithead.policy@mofa.gov.gh` / `Password123!`
   - Verify approved leave request appears
   - Approve leave request
   - Verify status updates

4. **Login as Director**: `director.ppbme@mofa.gov.gh` / `Password123!`
   - Verify approved leave request appears
   - Approve leave request
   - Verify status updates

5. **Login as HR Officer**: `hr.hrmd01@mofa.gov.gh` / `Password123!`
   - Verify approved leave request appears
   - Validate and approve leave request
   - Verify leave balance deducted
   - Verify final status is "approved"

### Scenario 2: Data Scoping Test

1. **Login as Unit Head (Policy)**: `unithead.policy@mofa.gov.gh` / `Password123!`
   - Verify can see Policy Coordination Unit staff
   - Verify CANNOT see Planning & Budgeting Unit staff
   - Verify CANNOT see other directorate staff

2. **Login as Director (PPBME)**: `director.ppbme@mofa.gov.gh` / `Password123!`
   - Verify can see all PPBME directorate staff
   - Verify CANNOT see HRMD directorate staff
   - Verify CANNOT see other directorate staff

3. **Login as HR Officer**: `hr.hrmd01@mofa.gov.gh` / `Password123!`
   - Verify can see all organization staff
   - Verify can access all leave requests

### Scenario 3: Independent Unit Access Test

1. **Login as Head of Audit**: `head.audit@mofa.gov.gh` / `Password123!`
   - Verify read-only access
   - Verify CANNOT approve leave
   - Verify CANNOT access HR/Finance data (if restricted)
   - Verify can access audit logs

### Scenario 4: Role-Based Redirection Test

For each role above:
1. Login with credentials
2. Verify automatic redirection to correct route
3. Verify dashboard matches role
4. Verify navigation shows only permitted items

### Scenario 5: Direct URL Access Test

1. Login as Employee
2. Try to access `/hr` directly
3. Verify redirect or access denied
4. Repeat for all role-specific routes

---

## Organizational Hierarchy (for Reference)

### PPBME Directorate Structure

```
Director PPBME (director.ppbme@mofa.gov.gh)
├── Policy Coordination Unit
│   ├── Unit Head (unithead.policy@mofa.gov.gh)
│   ├── Supervisor 1 (supervisor.policy01@mofa.gov.gh)
│   └── Employee 1 (employee.policy01@mofa.gov.gh)
├── Planning & Budgeting Unit
│   ├── Unit Head (unithead.planning@mofa.gov.gh)
│   ├── Supervisor 1 (supervisor.planning01@mofa.gov.gh)
│   └── Employee 1 (employee.planning01@mofa.gov.gh)
├── Monitoring & Evaluation Unit
│   ├── Unit Head (unithead.monitoring@mofa.gov.gh)
│   ├── Supervisor 1 (supervisor.monitoring01@mofa.gov.gh)
│   └── Employee 1 (employee.monitoring01@mofa.gov.gh)
└── Fisheries Management & Aquaculture Development Unit
    ├── Unit Head (unithead.fisheries@mofa.gov.gh)
    ├── Culture & Capture Fisheries Sub-Unit
    │   ├── Sub-Unit Head (subunithead.culture@mofa.gov.gh)
    │   ├── Supervisor 1 (supervisor.culture01@mofa.gov.gh)
    │   └── Employee 1 (employee.culture01@mofa.gov.gh)
    └── Post-Harvest & Marketing Sub-Unit
        ├── Sub-Unit Head (subunithead.postharvest@mofa.gov.gh)
        ├── Supervisor 1 (supervisor.postharvest01@mofa.gov.gh)
        └── Employee 1 (employee.postharvest01@mofa.gov.gh)
```

---

## Notes

1. **Password Policy**: All seeded users use `Password123!` and are exempt from password expiration
2. **Email Pattern**: All test users follow pattern: `{role}.{unit}@{number}@mofa.gov.gh` or `{role}@mofa.gov.gh`
3. **Staff ID Pattern**: `MoFA-{ROLE}-{DIRECTORATE}-{UNIT}-{NUMBER}`
4. **Complete List**: For complete list of all test users, see `lib/role-based-users-seed.ts` (848+ users)

---

## Additional Test Users

The seed data includes many more users across:
- RSIMD Directorate
- F&A Directorate
- Independent Units (Audit, Legal, PR, RTI, Client Service)
- Regional Offices
- District Offices

To see all users, run:
```bash
npx prisma db seed
```

This will print all created credentials to the console.

---

**Last Updated**: December 2024  
**Source**: `lib/role-based-users-seed.ts`, `prisma/seed.ts`

