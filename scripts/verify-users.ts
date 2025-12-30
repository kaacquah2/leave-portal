// Script to verify test users exist and check their status
// Run with: npx tsx scripts/verify-users.ts

import dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env') })

// @ts-ignore - PrismaClient is generated and available at runtime
import { PrismaClient } from '@prisma/client'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

// Pre-load bufferutil
try {
  require('bufferutil')
} catch (e) {}
try {
  require('utf-8-validate')
} catch (e) {}

// Configure Neon
neonConfig.webSocketConstructor = ws

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL environment variable must be set')
}

const adapter = new PrismaNeon({ connectionString })
const prisma = new PrismaClient({
  adapter,
  log: ['error'],
})

async function main() {
  console.log('🔍 Verifying test users...\n')

  const testEmails = [
    'hr@mofa.gov.gh',
    'manager@mofa.gov.gh',
    'employee@mofa.gov.gh',
    'admin@mofa.gov.gh',
  ]

  for (const email of testEmails) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { staff: true },
    })

    if (user) {
      console.log(`✅ ${email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Active: ${user.active}`)
      console.log(`   Staff ID: ${user.staffId || 'None'}`)
      console.log(`   Has Password Hash: ${user.passwordHash ? 'Yes' : 'No'}`)
      if (user.staff) {
        console.log(`   Staff Name: ${user.staff.firstName} ${user.staff.lastName}`)
      }
      console.log('')
    } else {
      console.log(`❌ ${email} - NOT FOUND\n`)
    }
  }

  console.log('✨ Verification complete!')
}

main()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

