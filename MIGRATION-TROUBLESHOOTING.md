# Prisma Migration Troubleshooting Guide

## Error: P1002 - Database Timeout / Advisory Lock

This error occurs when Prisma cannot acquire a PostgreSQL advisory lock within the timeout period (default: 10 seconds).

### Common Causes

1. **Another migration process is running** - Only one migration can run at a time
2. **Previous migration didn't complete** - Left a lock in the database
3. **Neon database is sleeping** - Serverless databases can sleep after inactivity
4. **Network connectivity issues** - Connection timeout to the database

## Solutions

### Solution 1: Check and Release Locks (Recommended)

Run the diagnostic script to check for locks:

```bash
npm run db:migrate:fix
```

This will:
- Test your database connection
- Check for advisory locks
- Attempt to release locks
- Show processes holding locks

### Solution 2: Wait and Retry

If another process is running:
1. Wait 30-60 seconds for the other process to complete
2. Try the migration again:
   ```bash
   npx prisma migrate dev --name government-hr-features
   ```

### Solution 3: Wake Up Neon Database

Neon databases can sleep after inactivity. Wake it up first:

```bash
# Test connection (this wakes up the database)
npm run db:test

# Wait 5-10 seconds, then run migration
npx prisma migrate dev --name government-hr-features
```

### Solution 4: Increase Timeout (Environment Variable)

Set a longer timeout before running migrations:

**Windows PowerShell:**
```powershell
$env:PRISMA_MIGRATE_TIMEOUT="60000"
npx prisma migrate dev --name government-hr-features
```

**Windows CMD:**
```cmd
set PRISMA_MIGRATE_TIMEOUT=60000
npx prisma migrate dev --name government-hr-features
```

**Linux/Mac:**
```bash
export PRISMA_MIGRATE_TIMEOUT=60000
npx prisma migrate dev --name government-hr-features
```

### Solution 5: Use db push (Development Only)

For development, you can use `db push` which doesn't use migrations:

```bash
npm run db:push
```

⚠️ **Warning**: `db push` is for development only. Don't use it in production.

### Solution 6: Manual Lock Release (Advanced)

If you have direct database access, you can manually release locks:

```sql
-- Connect to your database and run:
SELECT pg_advisory_unlock_all();

-- Or release a specific lock:
SELECT pg_advisory_unlock(72707369);
```

### Solution 7: Check for Stuck Processes

If you suspect a stuck process:

1. Check your terminal/IDE for any running Prisma commands
2. Close any Prisma Studio instances (`npx prisma studio`)
3. Restart your terminal/IDE
4. Try the migration again

## Prevention

1. **Always wait for migrations to complete** before starting new ones
2. **Don't run multiple migrations simultaneously**
3. **Close Prisma Studio** before running migrations
4. **Use direct connection** (DIRECT_URL) for migrations, not pooled connections

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run db:migrate:fix` | Check and fix migration locks |
| `npm run db:test` | Test database connection |
| `npx prisma migrate dev` | Run migration (with lock timeout) |
| `npm run db:push` | Push schema directly (dev only) |
| `npx prisma studio` | Open database GUI (close before migrations) |

## Still Having Issues?

1. Verify your `.env` file has correct `DIRECT_URL`
2. Check Neon dashboard for database status
3. Verify network connectivity
4. Try connecting with a PostgreSQL client to test
5. Check Neon logs for any connection issues

## Related Documentation

- [Prisma Migration Advisory Locking](https://www.prisma.io/docs/concepts/components/prisma-migrate/advisory-locking)
- [Neon Database Connection](https://neon.tech/docs/connect/connect-from-any-app)

