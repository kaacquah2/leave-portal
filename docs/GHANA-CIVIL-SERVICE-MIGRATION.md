# Ghana Civil Service Compliance Migration Guide

**Version**: 1.0  
**Date**: December 2024  
**Compliance**: Civil Service Act, 1993 (PNDCL 327)

---

## Overview

This document describes the migration from the previous organizational structure to the Ghana Civil Service compliant structure.

---

## Key Changes

### 1. Organizational Structure

#### Old Structure (18 Units)
- Office of the Minister (3 units)
- Office of the Chief Director (5 units)
- Finance & Administration Directorate (6 units)
- PPME Directorate (4 units)

#### New Structure (Ghana Civil Service)
- **4 Core Directorates** (report to Chief Director):
  1. Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME)
  2. Research, Statistics & Information Management Directorate (RSIMD)
  3. Human Resource Management & Development Directorate (HRMD)
  4. Finance & Administration Directorate (F&A)

- **5 Independent Supporting Units** (report directly to Chief Director):
  1. Internal Audit Unit
  2. Legal Unit
  3. Public Relations / Communications Unit
  4. Right to Information (RTI) Unit
  5. Client Service Unit

### 2. Role Changes

#### New Role: Head of Department (HoD)
- **Definition**: Statutory Civil Service role
- **Who**: Director of Core Directorate OR Head of Independent Unit
- **Authority**: Approves leave for staff in their directorate/unit

#### Role Mappings
- `DIVISION_HEAD` → `UNIT_HEAD`
- `directorate_head` → `HEAD_OF_DEPARTMENT`
- `director` → `HEAD_OF_DEPARTMENT` (Director acts as HoD)

### 3. Approval Workflow Changes

#### Standard Staff (Unit-Based)
**Old**: Employee → Supervisor → Unit Head → Directorate Head → HR (Final)

**New**: Employee → Immediate Supervisor → Unit Head → HoD → HR Officer → Chief Director → Final

#### Unit Head Leave
**New**: Unit Head → Director/HoD → HR Officer → Chief Director → Final

#### Director Leave
**New**: Director → HR Officer → Chief Director → Final

#### Independent Unit Staff
**New**: Employee → HoD → HR Officer → Chief Director → Final

#### HRMD Staff
**New**: HR Staff → HR Director → Chief Director → Final

### 4. Leave Types

#### New PSC/OHCS Governed Leave Types
- `StudyWithPay` - Study leave with pay (requires external clearance)
- `StudyWithoutPay` - Study leave without pay (requires external clearance)
- `LeaveOfAbsence` - Leave of absence (requires external clearance)
- `Secondment` - Secondment (requires external clearance)

### 5. Compliance Rules

#### Mandatory Requirements
1. **HR Validation**: HR Officer validation is mandatory before final approval
2. **Acting Officer**: Required for Unit Heads, Directors, and critical staff
3. **Self-Approval Prevention**: No staff may approve their own leave
4. **External Clearance**: PSC/OHCS clearance required for special leave types
5. **Sequential Approval**: Cannot skip approval levels
6. **Balance Validation**: Leave balance must be sufficient

---

## Migration Steps

### Step 1: Database Schema Update

Run Prisma migration to update schema:

```bash
npx prisma migrate dev --name ghana_civil_service_compliance
```

This will:
- Add `HEAD_OF_DEPARTMENT` role to UserRole enum
- Add new leave types (StudyWithPay, StudyWithoutPay, LeaveOfAbsence, Secondment)
- Add `subUnit` field to StaffMember
- Add `actingOfficerId` field to StaffMember
- Add PSC/OHCS compliance fields to LeaveRequest

### Step 2: Run Migration Script

Execute the migration script to update existing data:

```bash
npx ts-node scripts/migrate-to-ghana-civil-service.ts
```

This will:
- Map existing units to new structure
- Update user roles
- Update directorate names
- Set HR validation for existing approved leaves
- Flag PSC/OHCS governed leave types

### Step 3: Update Code References

Update code to use new structure:

1. **Unit Mapping**: Replace `lib/mofa-unit-mapping.ts` imports with `lib/ghana-civil-service-unit-mapping.ts`
2. **Approval Workflow**: Replace `lib/mofa-approval-workflow.ts` imports with `lib/ghana-civil-service-approval-workflow.ts`
3. **Compliance Checks**: Use `lib/ghana-civil-service-compliance.ts` for validation

### Step 4: Verify Migration

Check migration results:

```sql
-- Check unit mappings
SELECT unit, directorate, COUNT(*) as staff_count
FROM "StaffMember"
GROUP BY unit, directorate
ORDER BY directorate, unit;

-- Check role distribution
SELECT role, COUNT(*) as user_count
FROM "User"
GROUP BY role
ORDER BY role;

-- Check HR validation status
SELECT 
  status,
  hr_validated,
  COUNT(*) as count
FROM "LeaveRequest"
GROUP BY status, hr_validated;
```

---

## Unit Mapping Reference

| Old Unit | New Unit | Directorate |
|----------|----------|-------------|
| Ministerial Secretariat | Administration Unit | Finance & Administration Directorate (F&A) |
| Protocol Unit | Protocol & Security Unit | Finance & Administration Directorate (F&A) |
| Public Affairs / Communications Unit | Public Relations / Communications Unit | Independent (Chief Director) |
| Policy, Planning, Monitoring & Evaluation (PPME) | Policy Coordination Unit | Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME) |
| Internal Audit Unit | Internal Audit Unit | Independent (Chief Director) |
| Legal Unit | Legal Unit | Independent (Chief Director) |
| Research, Statistics & Information Management (RSIM) Unit | Research & Statistics Unit | Research, Statistics & Information Management Directorate (RSIMD) |
| Procurement Unit | Procurement & Stores Unit | Finance & Administration Directorate (F&A) |
| Human Resource Management Unit (HRMU) | Human Resource Planning Unit | Human Resource Management & Development Directorate (HRMD) |
| Accounts Unit | Finance / Accounts Unit | Finance & Administration Directorate (F&A) |
| Budget Unit | Planning & Budgeting Unit | Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME) |
| Stores Unit | Procurement & Stores Unit | Finance & Administration Directorate (F&A) |
| Transport & Logistics Unit | Transport Unit | Finance & Administration Directorate (F&A) |
| Records / Registry Unit | Records / Registry Unit | Finance & Administration Directorate (F&A) |
| Policy Analysis Unit | Policy Coordination Unit | Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME) |
| Monitoring & Evaluation Unit | Monitoring & Evaluation Unit | Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME) |
| Project Coordination Unit | Policy Coordination Unit | Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME) |
| ICT Unit | Information Technology & Information Management Unit | Research, Statistics & Information Management Directorate (RSIMD) |

---

## Backward Compatibility

The migration maintains backward compatibility:

1. **Legacy Roles**: Old role names are still supported in the enum
2. **Data Preservation**: All existing leave records and audit logs are preserved
3. **Gradual Migration**: System can operate with mixed old/new data during transition

---

## Rollback Plan

If migration needs to be rolled back:

1. Restore database from backup
2. Revert code changes
3. Update environment variables if needed

**Note**: Rollback should be done within 24 hours of migration to minimize data inconsistency.

---

## Support

For issues during migration:
1. Check migration logs
2. Verify database schema matches Prisma schema
3. Review unit mapping for any unmapped units
4. Contact system administrator

---

## Post-Migration Checklist

- [ ] Database schema updated
- [ ] Migration script executed successfully
- [ ] All staff units mapped correctly
- [ ] User roles updated
- [ ] HR validation set for existing approved leaves
- [ ] PSC/OHCS leave types flagged
- [ ] Code references updated
- [ ] Approval workflows tested
- [ ] Compliance rules validated
- [ ] Documentation updated

---

**End of Migration Guide**

