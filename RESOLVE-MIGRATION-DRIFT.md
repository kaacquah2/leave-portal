# Resolve Migration Drift - Step by Step

## Current Situation
- ✅ Database schema is synced (via `db push`)
- ❌ Migration history doesn't match database state
- 🔧 Need to create a baseline migration

## Solution: Create Baseline Migration

Since your database already has all the changes, we'll create a migration file and mark it as applied without running it.

### Option 1: Mark Database as Baseline (Recommended)

This tells Prisma that your database is already at the correct state:

```powershell
# Create the migration file (empty, just to establish baseline)
npx prisma migrate dev --name government-hr-features --create-only

# Then mark it as applied (since database already has the changes)
npx prisma migrate resolve --applied government-hr-features
```

### Option 2: Create Full Baseline Migration

If you want a complete migration file for reference:

1. **Save the SQL output** to a file:
   ```powershell
   npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > baseline.sql
   ```

2. **Create migration directory**:
   ```powershell
   $timestamp = Get-Date -Format "yyyyMMddHHmmss"
   New-Item -ItemType Directory -Path "prisma\migrations\${timestamp}_government_hr_features"
   ```

3. **Copy SQL to migration file**:
   ```powershell
   Copy-Item baseline.sql "prisma\migrations\${timestamp}_government_hr_features\migration.sql"
   ```

4. **Mark as applied**:
   ```powershell
   npx prisma migrate resolve --applied ${timestamp}_government_hr_features
   ```

### Option 3: Simplest - Just Continue Development

For development, you can continue using `db push` and create proper migrations later when you're ready for production:

```powershell
# Continue using this for schema changes
npx prisma db push

# When ready for production, create migrations from scratch
npx prisma migrate dev --name production-baseline
```

## Recommended Next Steps

1. **For now**: Continue using `db push` for development
2. **Before production**: Create a proper baseline migration
3. **Going forward**: Use `migrate dev` for all schema changes

## Verify Everything Works

After resolving, verify:
```powershell
npx prisma migrate status
```

This should show all migrations as applied.

