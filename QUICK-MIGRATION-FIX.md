# Quick Fix for Prisma Migration Timeout (P1002)

## Immediate Solutions (Try in Order)

### Solution 1: Generate Prisma Client First ⚡
```bash
npx prisma generate
```

Then try the migration again:
```bash
npx prisma migrate dev --name government-hr-features
```

### Solution 2: Wait and Retry (Most Common Fix)
The lock usually clears after 10-30 seconds. Simply wait and retry:
```bash
# Wait 30 seconds, then:
npx prisma migrate dev --name government-hr-features
```

### Solution 3: Wake Up Neon Database
Neon databases sleep after inactivity. Wake it up first:
```bash
# Test connection (wakes up database)
npm run db:test

# Wait 5 seconds, then run migration
npx prisma migrate dev --name government-hr-features
```

### Solution 4: Use db push (Development Only)
For development, you can bypass migrations:
```bash
npm run db:push
```
⚠️ **Warning**: Only use this in development, not production!

### Solution 5: Check for Running Processes
1. Close any Prisma Studio windows (`npx prisma studio`)
2. Check for other terminal windows running migrations
3. Close all and try again

### Solution 6: Increase Timeout (PowerShell)
```powershell
$env:PRISMA_MIGRATE_TIMEOUT="60000"
npx prisma migrate dev --name government-hr-features
```

## Why This Happens

1. **Another migration is running** - Only one can run at a time
2. **Neon database is sleeping** - Serverless databases sleep after inactivity
3. **Previous migration didn't complete** - Left a lock in the database
4. **Network timeout** - Connection to database timed out

## Prevention

- Always wait for migrations to complete
- Don't run multiple migrations simultaneously
- Close Prisma Studio before running migrations
- Use `DIRECT_URL` (not pooled connection) for migrations

## Still Stuck?

1. Check your `.env` file has correct `DIRECT_URL`
2. Verify Neon dashboard shows database is active
3. Try connecting with a PostgreSQL client to test connectivity
4. Check network/firewall settings

