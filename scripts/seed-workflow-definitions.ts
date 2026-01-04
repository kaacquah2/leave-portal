/**
 * Seed Workflow Definitions
 * 
 * Migrates hard-coded workflow logic to database-driven workflow definitions.
 * This script creates initial workflow definitions based on the existing
 * Ghana Civil Service approval workflows.
 * 
 * Run with: npx tsx scripts/seed-workflow-definitions.ts
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
  console.log('🌱 Seeding workflow definitions...')

  // 1. Standard Staff Leave Workflow
  // Employee → Supervisor → Unit Head → HoD → HR Officer → Chief Director
  const existing1 = await prisma.workflowDefinition.findFirst({
    where: { name: 'Standard Staff Leave', version: 1 },
  })
  
  if (!existing1) {
    await prisma.workflowDefinition.create({
      data: {
        name: 'Standard Staff Leave',
        description: 'Standard leave workflow for regular employees in units',
        version: 1,
        isActive: true,
        isDefault: true,
        conditions: {
          // Applies to staff who are not directors, unit heads, or in special units
          isDirector: false,
          isUnitHead: false,
          isHeadOfDepartment: false,
          isChiefDirector: false,
        },
        steps: {
          create: [
            {
              stepOrder: 1,
              approverRole: 'SUPERVISOR',
              isRequired: true,
              canSkip: false,
              canDelegate: true,
              description: 'Immediate supervisor approval',
            },
            {
              stepOrder: 2,
              approverRole: 'UNIT_HEAD',
              isRequired: true,
              canSkip: false,
              canDelegate: true,
              description: 'Unit head approval',
            },
            {
              stepOrder: 3,
              approverRole: 'HEAD_OF_DEPARTMENT',
              isRequired: true,
              canSkip: false,
              canDelegate: true,
              description: 'Head of Department (Director) approval',
            },
            {
              stepOrder: 4,
              approverRole: 'HR_OFFICER',
              isRequired: true,
              canSkip: false,
              canDelegate: false,
              description: 'HR Officer validation (mandatory)',
            },
            {
              stepOrder: 5,
              approverRole: 'CHIEF_DIRECTOR',
              isRequired: true,
              canSkip: false,
              canDelegate: false,
              description: 'Chief Director final approval',
            },
          ],
        },
      },
    })
  } else {
    console.log('  ⏭️  Standard Staff Leave workflow already exists, skipping...')
  }

  // 2. Director Leave Workflow
  // Director → HR Officer → Chief Director
  const existing2 = await prisma.workflowDefinition.findFirst({
    where: { name: 'Director Leave', version: 1 },
  })
  
  if (!existing2) {
    await prisma.workflowDefinition.create({
      data: {
        name: 'Director Leave',
        description: 'Leave workflow for Directors (non-Chief Director)',
        version: 1,
        isActive: true,
        isDefault: true,
        conditions: {
          isDirector: true,
          isChiefDirector: false,
        },
        steps: {
          create: [
            {
              stepOrder: 1,
              approverRole: 'HR_OFFICER',
              isRequired: true,
              canSkip: false,
              canDelegate: false,
              description: 'HR Officer validation',
            },
            {
              stepOrder: 2,
              approverRole: 'CHIEF_DIRECTOR',
              isRequired: true,
              canSkip: false,
              canDelegate: false,
              description: 'Chief Director final approval',
            },
          ],
        },
      },
    })
  } else {
    console.log('  ⏭️  Director Leave workflow already exists, skipping...')
  }

  // 3. Unit Head Leave Workflow
  // Unit Head → Director/HoD → HR Officer → Chief Director
  const existing3 = await prisma.workflowDefinition.findFirst({
    where: { name: 'Unit Head Leave', version: 1 },
  })
  
  if (!existing3) {
    await prisma.workflowDefinition.create({
      data: {
        name: 'Unit Head Leave',
        description: 'Leave workflow for Unit Heads',
        version: 1,
        isActive: true,
        isDefault: true,
        conditions: {
          isUnitHead: true,
          isHeadOfDepartment: false,
          isDirector: false,
        },
        steps: {
          create: [
            {
              stepOrder: 1,
              approverRole: 'HEAD_OF_DEPARTMENT',
              isRequired: true,
              canSkip: false,
              canDelegate: true,
              description: 'Director/HoD approval',
            },
            {
              stepOrder: 2,
              approverRole: 'HR_OFFICER',
              isRequired: true,
              canSkip: false,
              canDelegate: false,
              description: 'HR Officer validation',
            },
            {
              stepOrder: 3,
              approverRole: 'CHIEF_DIRECTOR',
              isRequired: true,
              canSkip: false,
              canDelegate: false,
              description: 'Chief Director final approval',
            },
          ],
        },
      },
    })
  } else {
    console.log('  ⏭️  Unit Head Leave workflow already exists, skipping...')
  }

  // 4. Chief Director Leave Workflow
  // Chief Director → HR Director → Recorded/Notified
  const existing4 = await prisma.workflowDefinition.findFirst({
    where: { name: 'Chief Director Leave', version: 1 },
  })
  
  if (!existing4) {
    await prisma.workflowDefinition.create({
      data: {
        name: 'Chief Director Leave',
        description: 'Leave workflow for Chief Director (no self-approval)',
        version: 1,
        isActive: true,
        isDefault: true,
        conditions: {
          isChiefDirector: true,
        },
        steps: {
          create: [
            {
              stepOrder: 1,
              approverRole: 'HR_DIRECTOR',
              isRequired: true,
              canSkip: false,
              canDelegate: false,
              description: 'HR Director validation (then recorded/notified to OHCS)',
            },
          ],
        },
      },
    })
  } else {
    console.log('  ⏭️  Chief Director Leave workflow already exists, skipping...')
  }

  // 5. HR Officer Leave Workflow
  // HR Officer → HR Director → Chief Director
  const existing5 = await prisma.workflowDefinition.findFirst({
    where: { name: 'HR Officer Leave', version: 1 },
  })
  
  if (!existing5) {
    await prisma.workflowDefinition.create({
      data: {
        name: 'HR Officer Leave',
        description: 'Leave workflow for HR Officers (HRMD staff)',
        version: 1,
        isActive: true,
        isDefault: true,
        conditions: {
          isHRMD: true,
          isDirector: false,
          isUnitHead: false,
        },
        steps: {
          create: [
            {
              stepOrder: 1,
              approverRole: 'HR_DIRECTOR',
              isRequired: true,
              canSkip: false,
              canDelegate: true,
              description: 'HR Director approval',
            },
            {
              stepOrder: 2,
              approverRole: 'CHIEF_DIRECTOR',
              isRequired: true,
              canSkip: false,
              canDelegate: false,
              description: 'Chief Director final approval',
            },
          ],
        },
      },
    })
  } else {
    console.log('  ⏭️  HR Officer Leave workflow already exists, skipping...')
  }

  // 6. HR Director Leave Workflow
  // HR Director → Chief Director
  const existing6 = await prisma.workflowDefinition.findFirst({
    where: { name: 'HR Director Leave', version: 1 },
  })
  
  if (!existing6) {
    await prisma.workflowDefinition.create({
      data: {
        name: 'HR Director Leave',
        description: 'Leave workflow for HR Director',
        version: 1,
        isActive: true,
        isDefault: true,
        conditions: {
          isHRMD: true,
          isDirector: true,
          isChiefDirector: false,
        },
        steps: {
          create: [
            {
              stepOrder: 1,
              approverRole: 'CHIEF_DIRECTOR',
              isRequired: true,
              canSkip: false,
              canDelegate: false,
              description: 'Chief Director final approval',
            },
          ],
        },
      },
    })
  } else {
    console.log('  ⏭️  HR Director Leave workflow already exists, skipping...')
  }

  // 7. Head of Independent Unit Leave Workflow
  // Head of Independent Unit → HR Officer → Chief Director
  const existing7 = await prisma.workflowDefinition.findFirst({
    where: { name: 'Head of Independent Unit Leave', version: 1 },
  })
  
  if (!existing7) {
    await prisma.workflowDefinition.create({
      data: {
        name: 'Head of Independent Unit Leave',
        description: 'Leave workflow for Heads of Independent Units',
        version: 1,
        isActive: true,
        isDefault: true,
        conditions: {
          isHeadOfDepartment: true,
          isIndependentUnit: true,
        },
        steps: {
          create: [
            {
              stepOrder: 1,
              approverRole: 'HR_OFFICER',
              isRequired: true,
              canSkip: false,
              canDelegate: false,
              description: 'HR Officer validation (mandatory)',
            },
            {
              stepOrder: 2,
              approverRole: 'CHIEF_DIRECTOR',
              isRequired: true,
              canSkip: false,
              canDelegate: false,
              description: 'Chief Director final approval',
            },
          ],
        },
      },
    })
  } else {
    console.log('  ⏭️  Head of Independent Unit Leave workflow already exists, skipping...')
  }

  // 8. Independent Unit Staff Leave Workflow
  // Employee → Supervisor → Unit Head → HoD → HR Officer → Chief Director
  const existing8 = await prisma.workflowDefinition.findFirst({
    where: { name: 'Independent Unit Staff Leave', version: 1 },
  })
  
  if (!existing8) {
    await prisma.workflowDefinition.create({
      data: {
        name: 'Independent Unit Staff Leave',
        description: 'Leave workflow for staff in independent units',
        version: 1,
        isActive: true,
        isDefault: true,
        conditions: {
          isIndependentUnit: true,
          isHeadOfDepartment: false,
          isDirector: false,
          isUnitHead: false,
        },
        steps: {
          create: [
            {
              stepOrder: 1,
              approverRole: 'SUPERVISOR',
              isRequired: true,
              canSkip: false,
              canDelegate: true,
              description: 'Immediate supervisor approval',
            },
            {
              stepOrder: 2,
              approverRole: 'UNIT_HEAD',
              isRequired: true,
              canSkip: false,
              canDelegate: true,
              description: 'Unit head approval',
            },
            {
              stepOrder: 3,
              approverRole: 'HEAD_OF_INDEPENDENT_UNIT',
              isRequired: true,
              canSkip: false,
              canDelegate: true,
              description: 'Head of Independent Unit approval',
            },
            {
              stepOrder: 4,
              approverRole: 'HR_OFFICER',
              isRequired: true,
              canSkip: false,
              canDelegate: false,
              description: 'HR Officer validation (mandatory)',
            },
            {
              stepOrder: 5,
              approverRole: 'CHIEF_DIRECTOR',
              isRequired: true,
              canSkip: false,
              canDelegate: false,
              description: 'Chief Director final approval',
            },
          ],
        },
      },
    })
  } else {
    console.log('  ⏭️  Independent Unit Staff Leave workflow already exists, skipping...')
  }

  console.log('✅ Workflow definitions seeded successfully!')
  console.log('\n📋 Created workflows:')
  console.log('  1. Standard Staff Leave')
  console.log('  2. Director Leave')
  console.log('  3. Unit Head Leave')
  console.log('  4. Chief Director Leave')
  console.log('  5. HR Officer Leave')
  console.log('  6. HR Director Leave')
  console.log('  7. Head of Independent Unit Leave')
  console.log('  8. Independent Unit Staff Leave')
  console.log('\n💡 Note: These workflows will be used when matching conditions.')
  console.log('   The system will fall back to hard-coded logic if no match is found.')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding workflow definitions:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

