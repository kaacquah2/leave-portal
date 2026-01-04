/**
 * Migration Script: Add Version Fields for Optimistic Locking
 * 
 * This script adds version fields to existing LeaveRequest and LeaveBalance records
 * to support optimistic locking for concurrent approval handling.
 * 
 * Run with: npx tsx scripts/add-version-fields.ts
 */

import dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env') })

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
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Create Prisma client with Neon adapter
const adapter = new PrismaNeon({ connectionString })
const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

async function main() {
  console.log('Starting migration: Adding version fields for optimistic locking...')

  try {
    // Update LeaveRequest records
    console.log('Updating LeaveRequest records...')
    const leaveRequestResult = await prisma.$executeRaw`
      UPDATE "LeaveRequest"
      SET version = 0
      WHERE version IS NULL
    `
    console.log(`✅ Updated ${leaveRequestResult} LeaveRequest records`)

    // Update LeaveBalance records
    console.log('Updating LeaveBalance records...')
    const leaveBalanceResult = await prisma.$executeRaw`
      UPDATE "LeaveBalance"
      SET version = 0
      WHERE version IS NULL
    `
    console.log(`✅ Updated ${leaveBalanceResult} LeaveBalance records`)

    // Verify migration
    const leaveRequestCount = await prisma.leaveRequest.count({
      where: { version: { gt: 0 } },
    })
    const leaveBalanceCount = await prisma.leaveBalance.count({
      where: { version: { gt: 0 } },
    })

    console.log('\n✅ Migration completed successfully!')
    console.log(`   - LeaveRequest records with version: ${leaveRequestCount}`)
    console.log(`   - LeaveBalance records with version: ${leaveBalanceCount}`)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

