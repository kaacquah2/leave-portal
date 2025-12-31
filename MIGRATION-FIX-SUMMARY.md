# Migration Fix Summary

## Issue
The SQL migration `add_government_compliance_features.sql` was failing with error:
```
ERROR: column "grade" does not exist (SQLSTATE 42703)
```

## Root Cause
The migration was trying to create tables that already exist in the Prisma schema, but with different structures:
- `SalaryStructure` exists but is staffId-based, not grade-based
- `Payroll` exists but is a period summary table, not individual staff records
- `OnboardingChecklist` and `OffboardingChecklist` already exist with JSON items structure
- `TrainingProgram` already exists with different field names

## Solution
Updated the migration to:
1. **Check for existing columns** before creating indexes on them
2. **Add missing columns** to existing tables instead of recreating them
3. **Skip table creation** for tables that already exist
4. **Create new tables** only for models that don't exist (NotificationPreference, ExitInterview, Asset, TrainingCertificate)

## Changes Made

### SalaryStructure
- Changed from `CREATE TABLE` to `ALTER TABLE` with column existence checks
- Only adds `grade`, `position`, and `active` columns if they don't exist

### Payroll
- Changed to create `PayrollItem` table instead (for individual staff records)
- Links to existing `Payroll` period table via foreign key

### OnboardingChecklist & OffboardingChecklist
- Removed table creation (already exist in schema)
- Kept foreign key constraints (already exist)

### TrainingProgram
- Changed to add missing columns if they don't exist
- Maps new fields to existing structure

## New Tables Created
- ✅ `NotificationPreference` - User notification preferences
- ✅ `ExitInterview` - Exit interview records
- ✅ `Asset` - Asset tracking
- ✅ `TrainingCertificate` - Training certificates
- ✅ `PayrollItem` - Individual staff payroll records

## How to Run

```bash
# Option 1: Run SQL directly
psql -d your_database -f prisma/migrations/add_government_compliance_features.sql

# Option 2: Use Prisma migrate (recommended)
npx prisma migrate dev --name add_government_compliance_features
```

## Notes
- The migration is now idempotent (can be run multiple times safely)
- It checks for column/table existence before creating
- Foreign key constraints are added only if they don't exist
- Existing data is preserved

