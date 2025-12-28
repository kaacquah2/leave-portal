/**
 * Initial Setup Script
 * Configures leave policies, holidays, and initial staff records
 */

// Load environment variables
import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  console.log('🚀 Starting initial setup...')

  // 1. Create default leave policies
  console.log('📋 Creating default leave policies...')
  const leavePolicies = [
    {
      leaveType: 'Annual',
      maxDays: 30,
      accrualRate: 2.5, // 30 days / 12 months
      accrualFrequency: 'monthly',
      carryoverAllowed: true,
      maxCarryover: 10,
      expiresAfterMonths: null,
      requiresApproval: true,
      approvalLevels: 2, // Manager + HR
      active: true,
    },
    {
      leaveType: 'Sick',
      maxDays: 15,
      accrualRate: 1.25, // 15 days / 12 months
      accrualFrequency: 'monthly',
      carryoverAllowed: true,
      maxCarryover: 5,
      expiresAfterMonths: 12,
      requiresApproval: true,
      approvalLevels: 1, // Manager only
      active: true,
    },
    {
      leaveType: 'Unpaid',
      maxDays: 90,
      accrualRate: 0,
      accrualFrequency: 'monthly',
      carryoverAllowed: false,
      maxCarryover: 0,
      expiresAfterMonths: null,
      requiresApproval: true,
      approvalLevels: 2,
      active: true,
    },
    {
      leaveType: 'Special Service',
      maxDays: 10,
      accrualRate: 0,
      accrualFrequency: 'annual',
      carryoverAllowed: false,
      maxCarryover: 0,
      expiresAfterMonths: null,
      requiresApproval: true,
      approvalLevels: 2,
      active: true,
    },
    {
      leaveType: 'Training',
      maxDays: 5,
      accrualRate: 0,
      accrualFrequency: 'annual',
      carryoverAllowed: false,
      maxCarryover: 0,
      expiresAfterMonths: null,
      requiresApproval: true,
      approvalLevels: 1,
      active: true,
    },
    {
      leaveType: 'Study',
      maxDays: 10,
      accrualRate: 0,
      accrualFrequency: 'annual',
      carryoverAllowed: false,
      maxCarryover: 0,
      expiresAfterMonths: null,
      requiresApproval: true,
      approvalLevels: 2,
      active: true,
    },
    {
      leaveType: 'Maternity',
      maxDays: 90,
      accrualRate: 0,
      accrualFrequency: 'annual',
      carryoverAllowed: false,
      maxCarryover: 0,
      expiresAfterMonths: null,
      requiresApproval: true,
      approvalLevels: 2,
      active: true,
    },
    {
      leaveType: 'Paternity',
      maxDays: 7,
      accrualRate: 0,
      accrualFrequency: 'annual',
      carryoverAllowed: false,
      maxCarryover: 0,
      expiresAfterMonths: null,
      requiresApproval: true,
      approvalLevels: 1,
      active: true,
    },
    {
      leaveType: 'Compassionate',
      maxDays: 5,
      accrualRate: 0,
      accrualFrequency: 'annual',
      carryoverAllowed: false,
      maxCarryover: 0,
      expiresAfterMonths: null,
      requiresApproval: true,
      approvalLevels: 1,
      active: true,
    },
  ]

  for (const policy of leavePolicies) {
    // Check if policy already exists
    const existing = await prisma.leavePolicy.findFirst({
      where: { leaveType: policy.leaveType },
    })

    if (existing) {
      // Update existing policy
      await prisma.leavePolicy.update({
        where: { id: existing.id },
        data: policy,
      })
    } else {
      // Create new policy
      await prisma.leavePolicy.create({
        data: policy,
      })
    }
  }
  console.log('✅ Leave policies created')

  // 2. Create default holidays (Ghana public holidays)
  console.log('📅 Creating default holidays...')
  const currentYear = new Date().getFullYear()
  const holidays = [
    { name: 'New Year\'s Day', date: new Date(currentYear, 0, 1), type: 'public', recurring: true },
    { name: 'Independence Day', date: new Date(currentYear, 2, 6), type: 'public', recurring: true },
    { name: 'Good Friday', date: new Date(currentYear, 3, 7), type: 'public', recurring: false }, // Example date
    { name: 'Easter Monday', date: new Date(currentYear, 3, 10), type: 'public', recurring: false }, // Example date
    { name: 'Labour Day', date: new Date(currentYear, 4, 1), type: 'public', recurring: true },
    { name: 'Eid al-Fitr', date: new Date(currentYear, 3, 10), type: 'public', recurring: false }, // Example date
    { name: 'Eid al-Adha', date: new Date(currentYear, 6, 16), type: 'public', recurring: false }, // Example date
    { name: 'Founders\' Day', date: new Date(currentYear, 7, 4), type: 'public', recurring: true },
    { name: 'Kwame Nkrumah Memorial Day', date: new Date(currentYear, 8, 21), type: 'public', recurring: true },
    { name: 'Christmas Day', date: new Date(currentYear, 11, 25), type: 'public', recurring: true },
    { name: 'Boxing Day', date: new Date(currentYear, 11, 26), type: 'public', recurring: true },
  ]

  for (const holiday of holidays) {
    // Check if holiday already exists
    const existing = await prisma.holiday.findFirst({
      where: {
        name: holiday.name,
        date: holiday.date,
      },
    })

    if (existing) {
      // Update existing holiday
      await prisma.holiday.update({
        where: { id: existing.id },
        data: {
          ...holiday,
          year: holiday.recurring ? null : currentYear,
        },
      })
    } else {
      // Create new holiday
      await prisma.holiday.create({
        data: {
          ...holiday,
          year: holiday.recurring ? null : currentYear,
        },
      })
    }
  }
  console.log('✅ Holidays created')

  // 3. Create system settings
  console.log('⚙️ Creating system settings...')
  const settings = [
    { key: 'accrual_schedule', value: 'monthly', type: 'string', category: 'leave', description: 'Accrual processing schedule' },
    { key: 'accrual_day', value: '1', type: 'number', category: 'leave', description: 'Day of month to run accrual' },
    { key: 'year_end_month', value: '12', type: 'number', category: 'leave', description: 'Month for year-end processing' },
    { key: 'approval_reminder_days', value: '3', type: 'number', category: 'leave', description: 'Days before sending approval reminder' },
    { key: 'email_enabled', value: 'true', type: 'boolean', category: 'email', description: 'Enable email notifications' },
    { key: 'smtp_host', value: '', type: 'string', category: 'email', description: 'SMTP server host' },
    { key: 'smtp_port', value: '587', type: 'number', category: 'email', description: 'SMTP server port' },
    { key: 'smtp_user', value: '', type: 'string', category: 'email', description: 'SMTP username' },
    { key: 'smtp_password', value: '', type: 'string', category: 'email', description: 'SMTP password' },
  ]

  for (const setting of settings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: setting,
      create: setting,
    })
  }
  console.log('✅ System settings created')

  console.log('✅ Initial setup completed!')
}

main()
  .catch((e) => {
    console.error('❌ Setup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

