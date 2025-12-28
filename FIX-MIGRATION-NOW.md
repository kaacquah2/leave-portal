# Fix Migration Timeout - Quick Steps

## ⚡ Immediate Solutions (Try These Now)

### Option 1: Wait 30 seconds and Retry (Most Common Fix)
The advisory lock usually clears automatically. Just wait and try again:

```powershell
# Wait 30 seconds, then run:
npx prisma migrate dev --name government-hr-features
```

### Option 2: Use db push (Development Only - Fastest)
This bypasses migrations and directly syncs your schema:

```powershell
npx prisma db push
```

⚠️ **Note**: This is for development only. It won't create migration files.

### Option 3: Increase Timeout and Retry
Set a longer timeout before running the migration:

```powershell
$env:PRISMA_MIGRATE_TIMEOUT="60000"
npx prisma migrate dev --name government-hr-features
```

### Option 4: Wake Up Neon Database First
Neon databases sleep after inactivity. Wake it up:

```powershell
# This will wake up the database
npx prisma db execute --stdin
# Then type: SELECT 1;
# Press Ctrl+D to exit
# Wait 5 seconds, then run migration
npx prisma migrate dev --name government-hr-features
```

### Option 5: Check for Other Processes
1. Close any `npx prisma studio` windows
2. Check other terminal windows for running migrations
3. Close all and retry

## 🔍 What's Happening?

The error `P1002` means Prisma couldn't acquire an advisory lock within 10 seconds. This usually happens because:
- Another migration is running
- Neon database is sleeping (needs to wake up)
- Previous migration didn't complete cleanly

## ✅ Recommended: Use db push for Development

For development work, `db push` is often faster and avoids lock issues:

```powershell
npx prisma db push
```

This will:
- ✅ Sync your schema to the database
- ✅ Skip migration files (faster)
- ✅ Avoid lock timeouts
- ⚠️ Only use in development!

## 🚀 After Fixing

Once your schema is synced, you can:
1. Continue development
2. Create proper migrations later when needed
3. Use `prisma migrate dev` for production-ready migrations

