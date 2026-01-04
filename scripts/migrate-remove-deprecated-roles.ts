/**
 * Migration Script: Remove Deprecated Roles
 * 
 * This script migrates users with deprecated roles to their equivalent roles:
 * - DIVISION_HEAD -> UNIT_HEAD
 * - REGIONAL_MANAGER -> SUPERVISOR
 * - SECURITY_ADMIN -> SYSTEM_ADMIN
 * - division_head -> unit_head
 * - regional_manager -> supervisor
 * 
 * Run this script before applying the Prisma schema changes that remove these roles.
 * 
 * Uses raw SQL to avoid Prisma type checking issues with removed enum values.
 */

import dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env') })

// @ts-ignore - PrismaClient is generated and available at runtime
import { PrismaClient } from '@prisma/client'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

// Pre-load bufferutil to ensure it's available when ws needs it
try {
  require('bufferutil')
} catch (e) {
  // bufferutil is optional - ws will fall back to JS implementation
}
try {
  require('utf-8-validate')
} catch (e) {
  // utf-8-validate is optional - ws will fall back to JS implementation
}

// Configure Neon for Node.js environment
neonConfig.webSocketConstructor = ws

// Get database connection string
// Use DIRECT_URL for scripts (better for non-serverless environments)
// Fallback to DATABASE_URL if DIRECT_URL is not set
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL environment variable must be set')
}

// Create Prisma client with Neon adapter
const adapter = new PrismaNeon({ connectionString })
const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

async function migrateDeprecatedRoles() {
  console.log('Starting migration of deprecated roles...\n')

  const roleMappings = [
    { old: 'DIVISION_HEAD', new: 'UNIT_HEAD' },
    { old: 'REGIONAL_MANAGER', new: 'SUPERVISOR' },
    { old: 'SECURITY_ADMIN', new: 'SYSTEM_ADMIN' },
    { old: 'division_head', new: 'unit_head' },
    { old: 'regional_manager', new: 'supervisor' },
  ]

  let totalUpdated = 0

  for (const { old: oldRole, new: newRole } of roleMappings) {
    try {
      // First, count how many users have the old role
      const beforeCount = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
        `SELECT COUNT(*)::int as count FROM "User" WHERE role = $1`,
        oldRole
      )

      const countBefore = Number(beforeCount[0]?.count || 0)

      if (countBefore === 0) {
        console.log(`ℹ️  No users found with role '${oldRole}'`)
        continue
      }

      // Use raw SQL to update roles (bypasses Prisma enum type checking)
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET role = $1 WHERE role = $2`,
        newRole,
        oldRole
      )

      totalUpdated += countBefore
      console.log(`✅ Migrated ${countBefore} user(s) from '${oldRole}' to '${newRole}'`)
    } catch (error: any) {
      console.error(`❌ Error migrating role '${oldRole}':`, error.message || error)
      // Continue with other roles even if one fails
    }
  }

  console.log(`\n✅ Migration complete! Total users updated: ${totalUpdated}`)
  
  // Verify no deprecated roles remain
  console.log('\n🔍 Verifying migration...')
  const remaining = await prisma.$queryRawUnsafe<Array<{ role: string; count: number }>>(
    `SELECT role, COUNT(*)::int as count 
     FROM "User" 
     WHERE role IN ('DIVISION_HEAD', 'REGIONAL_MANAGER', 'SECURITY_ADMIN', 'division_head', 'regional_manager')
     GROUP BY role`
  )

  if (remaining.length === 0) {
    console.log('✅ No deprecated roles found - migration successful!')
  } else {
    console.log('⚠️  Warning: Some deprecated roles still exist:')
    remaining.forEach(({ role, count }) => {
      console.log(`   - ${role}: ${count} user(s)`)
    })
  }

  console.log('\n⚠️  Next steps:')
  console.log('1. Review the changes above')
  console.log('2. Run: npm run db:push')
  console.log('3. Verify the schema changes were applied successfully')
}

migrateDeprecatedRoles()
  .catch((error) => {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

