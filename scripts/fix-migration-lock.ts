/**
 * Script to fix Prisma migration advisory lock issues
 * This script helps resolve P1002 timeout errors when running migrations
 */

import 'dotenv/config';

// Use dynamic import to handle Prisma Client generation
let prisma: any;

async function getPrismaClient() {
  if (!prisma) {
    try {
      const { PrismaClient } = await import('@prisma/client');
      prisma = new PrismaClient();
    } catch (error: any) {
      if (error.message?.includes('Cannot find module') || error.code === 'MODULE_NOT_FOUND') {
        console.error('❌ Prisma Client not generated. Please run: npx prisma generate');
        process.exit(1);
      }
      throw error;
    }
  }
  return prisma;
}

async function releaseAdvisoryLocks() {
  const prisma = await getPrismaClient();
  try {
    console.log('🔍 Checking for advisory locks...');
    
    // Query to find all advisory locks
    const locks = await prisma.$queryRaw<Array<{ locktype: string; database: number; classid: number; objid: number; pid: number; mode: string; granted: boolean }>>`
      SELECT locktype, database, classid, objid, pid, mode, granted
      FROM pg_locks
      WHERE locktype = 'advisory'
    `;

    if (locks.length === 0) {
      console.log('✅ No advisory locks found.');
      return;
    }

    console.log(`⚠️  Found ${locks.length} advisory lock(s):`);
    locks.forEach((lock: { pid: number; mode: string; granted: boolean }, index: number) => {
      console.log(`  ${index + 1}. PID: ${lock.pid}, Mode: ${lock.mode}, Granted: ${lock.granted}`);
    });

    // Try to release all advisory locks
    // Note: We can only release locks owned by our own session
    console.log('\n🔓 Attempting to release advisory locks...');
    
    // Get the Prisma advisory lock ID (72707369 from the error)
    const prismaLockId = 72707369;
    
    try {
      await prisma.$executeRawUnsafe(`SELECT pg_advisory_unlock_all()`);
      console.log('✅ Released all advisory locks for this session.');
    } catch (error: any) {
      console.log(`⚠️  Could not release locks: ${error.message}`);
      console.log('💡 You may need to wait for the other process to complete or restart your database connection.');
    }

    // Check for processes holding locks
    const processes = await prisma.$queryRaw<Array<{ pid: number; usename: string; application_name: string; state: string; query: string }>>`
      SELECT pid, usename, application_name, state, LEFT(query, 100) as query
      FROM pg_stat_activity
      WHERE pid IN (${locks.map((l: { pid: number }) => l.pid).join(',')})
    `;

    if (processes.length > 0) {
      console.log('\n📋 Processes holding locks:');
      processes.forEach((proc: { pid: number; usename: string; application_name: string; state: string; query: string }, index: number) => {
        console.log(`  ${index + 1}. PID: ${proc.pid}, User: ${proc.usename}, State: ${proc.state}`);
        console.log(`     Query: ${proc.query}...`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error checking locks:', error.message);
    throw error;
  } finally {
    const prisma = await getPrismaClient();
    await prisma.$disconnect();
  }
}

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...');
    const prisma = await getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful!');
    return true;
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Prisma Migration Lock Fix Tool\n');
  
  const connected = await testConnection();
  if (!connected) {
    console.log('\n💡 Tips:');
    console.log('  1. Check your DIRECT_URL in .env file');
    console.log('  2. Ensure your Neon database is not sleeping (make a query to wake it up)');
    console.log('  3. Verify network connectivity');
    process.exit(1);
  }

  await releaseAdvisoryLocks();
  
  console.log('\n✅ Lock check complete!');
  console.log('\n💡 Next steps:');
  console.log('  1. Wait 10-30 seconds for any pending operations to complete');
  console.log('  2. Try running the migration again: npx prisma migrate dev --name your-migration-name');
  console.log('  3. If the issue persists, try: npx prisma db push (for development only)');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

