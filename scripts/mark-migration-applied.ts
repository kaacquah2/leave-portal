/**
 * Script to mark a migration as applied without using Prisma's lock mechanism
 * This is useful when you've already applied changes via db push
 */

import 'dotenv/config';
import { neon, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DIRECT_URL or DATABASE_URL not found in .env');
  process.exit(1);
}

// Configure Neon for Node.js
neonConfig.webSocketConstructor = ws;
const sql = neon(connectionString);

async function markMigrationApplied(migrationName: string) {
  try {
    console.log(`🔧 Marking migration "${migrationName}" as applied...`);

    // Check if migration record already exists
    const existing = await sql`
      SELECT migration_name FROM _prisma_migrations 
      WHERE migration_name = ${migrationName}
    `;

    if (existing.length > 0) {
      console.log(`✅ Migration "${migrationName}" is already marked as applied.`);
      return;
    }

    // Insert migration record
    await sql`
      INSERT INTO _prisma_migrations (migration_name, finished_at, applied_steps_count)
      VALUES (${migrationName}, NOW(), 1)
    `;

    console.log(`✅ Successfully marked migration "${migrationName}" as applied!`);
    console.log('\n💡 You can now verify with: npx prisma migrate status');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('relation "_prisma_migrations" does not exist')) {
      console.error('\n💡 The migrations table does not exist. Run a migration first.');
    }
    process.exit(1);
  }
}

const migrationName = process.argv[2] || '20241225000000_add_manager_assignment';

if (!migrationName) {
  console.error('Usage: tsx scripts/mark-migration-applied.ts <migration-name>');
  process.exit(1);
}

markMigrationApplied(migrationName).catch(console.error);

