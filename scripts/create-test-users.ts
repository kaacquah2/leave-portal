// Script to create test user accounts for login
// Run with: npx tsx scripts/create-test-users.ts

import dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env') })

// @ts-ignore - PrismaClient is generated and available at runtime
import { PrismaClient } from '@prisma/client'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'
import bcrypt from 'bcryptjs'

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

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

async function main() {
  console.log('🔐 Creating test user accounts...\n')
  
  // Test database connection first
  try {
    console.log('🔌 Testing database connection...')
    await prisma.$connect()
    console.log('✅ Database connection successful\n')
  } catch (error: any) {
    console.error('❌ Database connection failed!')
    console.error('   Error:', error.message)
    console.error('\n💡 Troubleshooting:')
    console.error('   1. Check your internet connection')
    console.error('   2. Verify DATABASE_URL or DIRECT_URL in .env file')
    console.error('   3. Ensure the Neon database is not paused')
    console.error('   4. Check if the database endpoint is correct')
    throw error
  }

  const password = 'Password123!'
  const passwordHash = await hashPassword(password)

  // Create HR User (linked to Lucy Wambui - HR Officer)
  const hrUser = await prisma.user.upsert({
    where: { email: 'hr@mofad.gov.gh' },
    update: {
      passwordHash,
      role: 'hr',
      active: true,
    },
    create: {
      email: 'hr@mofad.gov.gh',
      passwordHash,
      role: 'hr',
      staffId: 'MFA-008', // Lucy Wambui - HR Officer
      active: true,
    },
  })
  console.log('✅ HR User created:', hrUser.email)

  // Create Manager User (linked to John Mwangi - Senior Fisheries Officer)
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@mofad.gov.gh' },
    update: {
      passwordHash,
      role: 'manager',
      active: true,
    },
    create: {
      email: 'manager@mofad.gov.gh',
      passwordHash,
      role: 'manager',
      staffId: 'MFA-001', // John Mwangi - Senior Fisheries Officer
      active: true,
    },
  })
  console.log('✅ Manager User created:', managerUser.email)

  // Create Employee User (linked to Mary Wanjiku - Aquaculture Specialist)
  const employeeUser = await prisma.user.upsert({
    where: { email: 'employee@mofad.gov.gh' },
    update: {
      passwordHash,
      role: 'employee',
      active: true,
    },
    create: {
      email: 'employee@mofad.gov.gh',
      passwordHash,
      role: 'employee',
      staffId: 'MFA-002', // Mary Wanjiku - Aquaculture Specialist
      active: true,
    },
  })
  console.log('✅ Employee User created:', employeeUser.email)

  // Create Admin User (no staff link)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mofad.gov.gh' },
    update: {
      passwordHash,
      role: 'admin',
      active: true,
    },
    create: {
      email: 'admin@mofad.gov.gh',
      passwordHash,
      role: 'admin',
      staffId: null,
      active: true,
    },
  })
  console.log('✅ Admin User created:', adminUser.email)

  console.log('\n✨ Test users created successfully!')
  console.log('\n📋 Login Credentials:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('   Role     | Email                      | Password')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('   HR       | hr@mofad.gov.gh           | Password123!')
  console.log('   Manager  | manager@mofad.gov.gh     | Password123!')
  console.log('   Employee | employee@mofad.gov.gh    | Password123!')
  console.log('   Admin    | admin@mofad.gov.gh       | Password123!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n💡 You can now login at http://localhost:3000')
}

main()
  .catch((error) => {
    console.error('❌ Error creating users:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

