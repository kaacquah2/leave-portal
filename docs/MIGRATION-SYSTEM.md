# Migration System - How It Works

## Ministry of Foreign Affairs (MoFA), Ghana - HR Leave Portal

---

## Overview

The migration files (`002_complete_offline_schema.sql` and `003_seed_static_data.sql`) are **automatically executed** when the Electron app starts. You do NOT need to run them manually.

---

## How Migrations Are Executed

### 1. Automatic Execution Flow

```
App Startup
    ↓
main.js calls initialize()
    ↓
initEncryptedDatabase() is called
    ↓
runMigrations(db) is automatically called
    ↓
Migrations are executed in order
```

### 2. Migration Execution Process

**File**: `electron/database-encrypted.js`

When the database is initialized, the `runMigrations()` function:

1. **Scans the migrations directory**: Reads all `.sql` files from `electron/migrations/`
2. **Sorts by filename**: Processes migrations in numerical order (001, 002, 003...)
3. **Checks applied migrations**: Queries `schema_migrations` table to see what's already been run
4. **Runs pending migrations**: Executes any migrations that haven't been applied yet
5. **Records completion**: Inserts a record into `schema_migrations` so it won't run twice

### 3. Code Reference

```javascript
// In database-encrypted.js, initEncryptedDatabase() function:

// Create migrations table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  )
`);

// Run migrations automatically
runMigrations(db);  // <-- This executes all migration files
```

### 4. Migration Tracking

The `schema_migrations` table tracks which migrations have been applied:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,  -- e.g., 1, 2, 3
  name TEXT NOT NULL,            -- e.g., 'initial_schema', 'complete_offline_schema'
  applied_at TEXT NOT NULL       -- Timestamp when applied
);
```

**Example records**:
- `version: 1, name: 'initial_schema'`
- `version: 2, name: 'complete_offline_schema'`
- `version: 3, name: 'seed_static_data'`

---

## Migration Files Included in Build

### Build Configuration

**File**: `package.json`

```json
"files": [
  "out/**/*",
  "electron/**/*",  // <-- This includes migrations/
  "package.json",
  ...
]
```

The `electron/**/*` pattern ensures **all files** in the `electron/` directory (including `migrations/`) are included in the built application.

### File Locations

**Development**:
```
electron/
  migrations/
    001_initial_schema.sql
    002_complete_offline_schema.sql
    003_seed_static_data.sql
```

**Built Application**:
```
{app.asar or app directory}/
  electron/
    migrations/
      001_initial_schema.sql
      002_complete_offline_schema.sql
      003_seed_static_data.sql
```

---

## Execution Order

Migrations are executed in this order:

1. **001_initial_schema.sql** - Creates sync tables
2. **002_complete_offline_schema.sql** - Creates all offline tables
3. **003_seed_static_data.sql** - Seeds static reference data

### Why This Order Matters

- `001` creates the `schema_migrations` table itself
- `002` creates all the main tables (employees, leave_requests, etc.)
- `003` seeds data into tables created by `002`

---

## Idempotency (Safe to Run Multiple Times)

All migrations are designed to be **idempotent**:

### Schema Migrations (002)
- Uses `CREATE TABLE IF NOT EXISTS` - won't fail if table exists
- Uses `CREATE INDEX IF NOT EXISTS` - won't fail if index exists
- Uses `INSERT OR IGNORE` - won't duplicate data

### Seed Migrations (003)
- Uses `INSERT OR IGNORE` - won't duplicate data
- Uses `WHERE NOT EXISTS` - checks before inserting

**Result**: If a migration runs twice (e.g., due to an error), it won't cause problems.

---

## First-Run vs. Subsequent Runs

### First App Launch (Fresh Install)

1. Database doesn't exist → Created
2. `schema_migrations` table is empty
3. All 3 migrations run:
   - `001_initial_schema.sql` ✅
   - `002_complete_offline_schema.sql` ✅
   - `003_seed_static_data.sql` ✅
4. Bootstrap service also seeds data (redundant but safe)

### Subsequent App Launches

1. Database exists → Opened
2. `schema_migrations` table has records:
   - `version: 1, name: 'initial_schema'` ✅ (already applied)
   - `version: 2, name: 'complete_offline_schema'` ✅ (already applied)
   - `version: 3, name: 'seed_static_data'` ✅ (already applied)
3. Migrations are skipped (already applied)
4. App continues normally

### Adding New Migrations

If you add `004_new_feature.sql`:

1. On next app launch, `runMigrations()` detects it
2. Checks `schema_migrations` - not found
3. Executes `004_new_feature.sql`
4. Records it in `schema_migrations`
5. Future launches skip it

---

## Bootstrap vs. Migrations

### Bootstrap Service (`bootstrap.js`)

- **Purpose**: First-run initialization and data seeding
- **When**: Runs on every app launch (checks if already done)
- **What**: Seeds leave types, holidays, policies
- **Why**: Provides JavaScript-based seeding with dynamic data (e.g., current year holidays)

### Migration Files (SQL)

- **Purpose**: Schema changes and static data seeding
- **When**: Runs automatically on database initialization
- **What**: Creates tables, indexes, seeds static data
- **Why**: Provides SQL-based migrations that are version-controlled and auditable

### Redundancy is Intentional

Both systems seed similar data, but:
- **Bootstrap** can handle dynamic data (e.g., current year holidays)
- **Migrations** provide a fallback if bootstrap fails
- **Both are idempotent** - safe to run multiple times

---

## Troubleshooting

### Check Migration Status

You can query the database to see which migrations have been applied:

```sql
SELECT * FROM schema_migrations ORDER BY version;
```

### Manual Migration (If Needed)

If a migration fails, you can manually check:

1. **Check logs**: Look for migration errors in console/logs
2. **Check database**: Query `schema_migrations` to see what's applied
3. **Fix issue**: Resolve the problem (e.g., fix SQL syntax)
4. **Restart app**: Migrations will retry on next launch

### Reset Migrations (Development Only)

⚠️ **WARNING**: Only for development/testing!

```javascript
// In development console or test script
const db = getEncryptedDatabase();
db.prepare('DELETE FROM schema_migrations WHERE version >= 2').run();
// Next app launch will re-run migrations 002 and 003
```

---

## Summary

✅ **Migrations run automatically** - No manual action required  
✅ **Included in build** - `electron/**/*` pattern includes migrations  
✅ **Idempotent** - Safe to run multiple times  
✅ **Version tracked** - `schema_migrations` table tracks what's applied  
✅ **Ordered execution** - Runs in numerical order (001, 002, 003...)  
✅ **Error handling** - Failed migrations are logged and can be retried  

---

**Last Updated**: 2024  
**Version**: 1.0.0

