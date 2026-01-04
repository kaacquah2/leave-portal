/**
 * Migration Script: MoFA to Ghana Civil Service Structure
 * 
 * This script migrates existing data to comply with:
 * - Civil Service Act, 1993 (PNDCL 327)
 * - Office of the Head of the Civil Service (OHCS) directives
 * - Public Services Commission (PSC) guidelines
 * 
 * IMPORTANT: This script preserves all existing data and maps it to the new structure.
 * Run this script after updating the database schema.
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

/**
 * Unit mapping from old structure to new structure
 */
const UNIT_MAPPING: Record<string, { unit: string; directorate: string | null; subUnit?: string }> = {
  // Old MoFA units → New Civil Service units
  'Ministerial Secretariat': { unit: 'Administration Unit', directorate: 'Finance & Administration Directorate (F&A)' },
  'Protocol Unit': { unit: 'Protocol & Security Unit', directorate: 'Finance & Administration Directorate (F&A)' },
  'Public Affairs / Communications Unit': { unit: 'Public Relations / Communications Unit', directorate: null },
  
  // Office of Chief Director units
  'Policy, Planning, Monitoring & Evaluation (PPME)': { unit: 'Policy Coordination Unit', directorate: 'Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME)' },
  'Internal Audit Unit': { unit: 'Internal Audit Unit', directorate: null },
  'Legal Unit': { unit: 'Legal Unit', directorate: null },
  'Research, Statistics & Information Management (RSIM) Unit': { unit: 'Research & Statistics Unit', directorate: 'Research, Statistics & Information Management Directorate (RSIMD)' },
  'Procurement Unit': { unit: 'Procurement & Stores Unit', directorate: 'Finance & Administration Directorate (F&A)' },
  
  // Finance & Administration Directorate
  'Human Resource Management Unit (HRMU)': { unit: 'Human Resource Planning Unit', directorate: 'Human Resource Management & Development Directorate (HRMD)' },
  'Accounts Unit': { unit: 'Finance / Accounts Unit', directorate: 'Finance & Administration Directorate (F&A)' },
  'Budget Unit': { unit: 'Planning & Budgeting Unit', directorate: 'Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME)' },
  'Stores Unit': { unit: 'Procurement & Stores Unit', directorate: 'Finance & Administration Directorate (F&A)' },
  'Transport & Logistics Unit': { unit: 'Transport Unit', directorate: 'Finance & Administration Directorate (F&A)' },
  'Records / Registry Unit': { unit: 'Records / Registry Unit', directorate: 'Finance & Administration Directorate (F&A)' },
  
  // PPME Directorate
  'Policy Analysis Unit': { unit: 'Policy Coordination Unit', directorate: 'Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME)' },
  'Monitoring & Evaluation Unit': { unit: 'Monitoring & Evaluation Unit', directorate: 'Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME)' },
  'Project Coordination Unit': { unit: 'Policy Coordination Unit', directorate: 'Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME)' },
  'ICT Unit': { unit: 'Information Technology & Information Management Unit', directorate: 'Research, Statistics & Information Management Directorate (RSIMD)' },
}

/**
 * Role mapping from old roles to new roles
 */
const ROLE_MAPPING: Record<string, string> = {
  'DIVISION_HEAD': 'UNIT_HEAD', // Division Head → Unit Head
  'directorate_head': 'HEAD_OF_DEPARTMENT', // Directorate Head → HoD
  'director': 'HEAD_OF_DEPARTMENT', // Director → HoD (Director acts as HoD)
}

async function main() {
  console.log('🚀 Starting migration to Ghana Civil Service structure...\n')

  try {
    // Step 1: Update staff units to new structure
    console.log('📋 Step 1: Updating staff units...')
    const staffMembers = await prisma.staffMember.findMany({
      where: { unit: { not: null } },
    })

    let updatedStaff = 0
    for (const staff of staffMembers) {
      if (staff.unit && UNIT_MAPPING[staff.unit]) {
        const mapping = UNIT_MAPPING[staff.unit]
        await prisma.staffMember.update({
          where: { id: staff.id },
          data: {
            unit: mapping.unit,
            directorate: mapping.directorate,
            subUnit: mapping.subUnit || null,
          },
        })
        updatedStaff++
      }
    }
    console.log(`✅ Updated ${updatedStaff} staff members\n`)

    // Step 2: Update user roles
    console.log('👥 Step 2: Updating user roles...')
    const users = await prisma.user.findMany()

    let updatedUsers = 0
    for (const user of users) {
      if (ROLE_MAPPING[user.role]) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            role: ROLE_MAPPING[user.role],
          },
        })
        updatedUsers++
      }
    }
    console.log(`✅ Updated ${updatedUsers} user roles\n`)

    // Step 3: Update directorate names
    console.log('🏢 Step 3: Updating directorate names...')
    const directorateUpdates = [
      {
        old: 'Finance & Administration Directorate',
        new: 'Finance & Administration Directorate (F&A)',
      },
      {
        old: 'Policy, Planning, Monitoring & Evaluation (PPME) Directorate',
        new: 'Policy, Planning, Budgeting, Monitoring & Evaluation Directorate (PPBME)',
      },
    ]

    let updatedDirectorates = 0
    for (const update of directorateUpdates) {
      const result = await prisma.staffMember.updateMany({
        where: { directorate: update.old },
        data: { directorate: update.new },
      })
      updatedDirectorates += result.count
    }
    console.log(`✅ Updated ${updatedDirectorates} directorate references\n`)

    // Step 4: Add missing independent units
    console.log('🔧 Step 4: Adding missing independent units...')
    const independentUnits = [
      'Right to Information (RTI) Unit',
      'Client Service Unit',
    ]

    // These units will be added when staff are assigned to them
    console.log(`ℹ️  Independent units configured: ${independentUnits.join(', ')}\n`)

    // Step 5: Update leave types (add new PSC/OHCS governed types)
    console.log('📝 Step 5: Leave types will be updated via schema migration\n')

    // Step 6: Set HR validation flag for existing approved leaves
    console.log('✅ Step 6: Setting HR validation for existing approved leaves...')
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'approved',
        hrValidated: false,
      },
      include: {
        approvalSteps: {
          where: {
            approverRole: 'HR_OFFICER',
            status: 'approved',
          },
        },
      },
    })

    let validatedLeaves = 0
    for (const leave of approvedLeaves) {
      if (leave.approvalSteps.length > 0) {
        const hrStep = leave.approvalSteps[0]
        await prisma.leaveRequest.update({
          where: { id: leave.id },
          data: {
            hrValidated: true,
            hrValidatedBy: hrStep.approverUserId || null,
            hrValidatedAt: hrStep.approvalDate || new Date(),
          },
        })
        validatedLeaves++
      }
    }
    console.log(`✅ Set HR validation for ${validatedLeaves} approved leave requests\n`)

    // Step 7: Flag PSC/OHCS governed leave types
    console.log('🏛️  Step 7: Flagging PSC/OHCS governed leave types...')
    const pscLeaveTypes = ['Study', 'StudyWithPay', 'StudyWithoutPay', 'LeaveOfAbsence', 'Secondment']
    
    const result = await prisma.leaveRequest.updateMany({
      where: {
        leaveType: { in: pscLeaveTypes },
        requiresExternalClearance: false,
      },
      data: {
        requiresExternalClearance: true,
      },
    })
    console.log(`✅ Flagged ${result.count} leave requests for external clearance\n`)

    console.log('✨ Migration completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   - Updated ${updatedStaff} staff members`)
    console.log(`   - Updated ${updatedUsers} user roles`)
    console.log(`   - Updated ${updatedDirectorates} directorate references`)
    console.log(`   - Set HR validation for ${validatedLeaves} leave requests`)
    console.log(`   - Flagged ${result.count} leave requests for external clearance`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
main()
  .catch((error) => {
    console.error('Migration error:', error)
    process.exit(1)
  })

