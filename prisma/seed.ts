// Load environment variables
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env') })

// @ts-ignore - PrismaClient is generated and available at runtime
import { PrismaClient } from '@prisma/client'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

// Pre-load bufferutil to ensure it's available when ws needs it
// This is an optional dependency that improves WebSocket performance
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
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

async function main() {
  console.log('🌱 Starting database seed...')

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🧹 Clearing existing data...')
  await prisma.auditLog.deleteMany()
  await prisma.leaveRequest.deleteMany()
  await prisma.performanceReview.deleteMany()
  await prisma.payslip.deleteMany()
  await prisma.leaveBalance.deleteMany()
  await prisma.leaveRequestTemplate.deleteMany()
  await prisma.holiday.deleteMany()
  await prisma.leavePolicy.deleteMany()
  await prisma.staffMember.deleteMany()

  // Create Staff Members
  console.log('👥 Creating staff members...')
  const staffMembers = [
    {
      staffId: 'MFA-001',
      firstName: 'John',
      lastName: 'Mwangi',
      email: 'john.mwangi@mofa.go.ke',
      phone: '+254712345678',
      department: 'Fisheries Management',
      position: 'Senior Fisheries Officer',
      grade: 'G7',
      level: 'Senior',
      active: true,
      joinDate: new Date('2020-01-15'),
    },
    {
      staffId: 'MFA-002',
      firstName: 'Mary',
      lastName: 'Wanjiku',
      email: 'mary.wanjiku@mofa.go.ke',
      phone: '+254712345679',
      department: 'Aquaculture Development',
      position: 'Aquaculture Specialist',
      grade: 'G6',
      level: 'Middle',
      active: true,
      joinDate: new Date('2021-03-20'),
    },
    {
      staffId: 'MFA-003',
      firstName: 'Peter',
      lastName: 'Ochieng',
      email: 'peter.ochieng@mofa.go.ke',
      phone: '+254712345680',
      department: 'Research and Development',
      position: 'Research Scientist',
      grade: 'G8',
      level: 'Senior',
      active: true,
      joinDate: new Date('2019-06-10'),
    },
    {
      staffId: 'MFA-004',
      firstName: 'Sarah',
      lastName: 'Kamau',
      email: 'sarah.kamau@mofa.go.ke',
      phone: '+254712345681',
      department: 'Policy and Planning',
      position: 'Policy Analyst',
      grade: 'G5',
      level: 'Junior',
      active: true,
      joinDate: new Date('2022-02-01'),
    },
    {
      staffId: 'MFA-005',
      firstName: 'David',
      lastName: 'Kipchoge',
      email: 'david.kipchoge@mofa.go.ke',
      phone: '+254712345682',
      department: 'Fisheries Management',
      position: 'Fisheries Officer',
      grade: 'G6',
      level: 'Middle',
      active: true,
      joinDate: new Date('2021-08-15'),
    },
    {
      staffId: 'MFA-006',
      firstName: 'Grace',
      lastName: 'Njeri',
      email: 'grace.njeri@mofa.go.ke',
      phone: '+254712345683',
      department: 'Aquaculture Development',
      position: 'Extension Officer',
      grade: 'G5',
      level: 'Junior',
      active: true,
      joinDate: new Date('2022-05-10'),
    },
    {
      staffId: 'MFA-007',
      firstName: 'James',
      lastName: 'Omondi',
      email: 'james.omondi@mofa.go.ke',
      phone: '+254712345684',
      department: 'Administration',
      position: 'Administrative Officer',
      grade: 'G7',
      level: 'Senior',
      active: true,
      joinDate: new Date('2020-11-20'),
    },
    {
      staffId: 'MFA-008',
      firstName: 'Lucy',
      lastName: 'Wambui',
      email: 'lucy.wambui@mofa.go.ke',
      phone: '+254712345685',
      department: 'Human Resources',
      position: 'HR Officer',
      grade: 'G6',
      level: 'Middle',
      active: true,
      joinDate: new Date('2021-01-05'),
    },
  ]

  const createdStaff = await Promise.all(
    staffMembers.map(staff => prisma.staffMember.create({ data: staff }))
  )

  console.log(`✅ Created ${createdStaff.length} staff members`)

  // Create Leave Policies
  console.log('📋 Creating leave policies...')
  const leavePolicies = [
    {
      leaveType: 'Annual',
      maxDays: 30,
      accrualRate: 2.5, // 2.5 days per month
      carryoverAllowed: true,
      maxCarryover: 10,
      requiresApproval: true,
      approvalLevels: 2, // Manager + HR
      active: true,
    },
    {
      leaveType: 'Sick',
      maxDays: 30,
      accrualRate: 2.5,
      carryoverAllowed: false,
      maxCarryover: 0,
      requiresApproval: true,
      approvalLevels: 1, // Manager only
      active: true,
    },
    {
      leaveType: 'Unpaid',
      maxDays: 90,
      accrualRate: 0,
      carryoverAllowed: false,
      maxCarryover: 0,
      requiresApproval: true,
      approvalLevels: 2,
      active: true,
    },
    {
      leaveType: 'Special Service',
      maxDays: 14,
      accrualRate: 0,
      carryoverAllowed: false,
      maxCarryover: 0,
      requiresApproval: true,
      approvalLevels: 2,
      active: true,
    },
    {
      leaveType: 'Training',
      maxDays: 10,
      accrualRate: 0,
      carryoverAllowed: false,
      maxCarryover: 0,
      requiresApproval: true,
      approvalLevels: 1,
      active: true,
    },
  ]

  const createdPolicies = await Promise.all(
    leavePolicies.map(policy => prisma.leavePolicy.create({ data: policy }))
  )

  console.log(`✅ Created ${createdPolicies.length} leave policies`)

  // Create Leave Balances
  console.log('💰 Creating leave balances...')
  const leaveBalances = [
    { staffId: 'MFA-001', annual: 15, sick: 10, unpaid: 0, specialService: 5, training: 3 },
    { staffId: 'MFA-002', annual: 20, sick: 12, unpaid: 0, specialService: 7, training: 2 },
    { staffId: 'MFA-003', annual: 25, sick: 15, unpaid: 0, specialService: 10, training: 5 },
    { staffId: 'MFA-004', annual: 18, sick: 8, unpaid: 0, specialService: 3, training: 1 },
    { staffId: 'MFA-005', annual: 22, sick: 11, unpaid: 0, specialService: 6, training: 4 },
    { staffId: 'MFA-006', annual: 16, sick: 9, unpaid: 0, specialService: 4, training: 2 },
    { staffId: 'MFA-007', annual: 28, sick: 18, unpaid: 0, specialService: 12, training: 6 },
    { staffId: 'MFA-008', annual: 21, sick: 13, unpaid: 0, specialService: 8, training: 3 },
  ]

  const createdBalances = await Promise.all(
    leaveBalances.map(balance => prisma.leaveBalance.create({ data: balance }))
  )

  console.log(`✅ Created ${createdBalances.length} leave balances`)

  // Create Holidays
  console.log('🎉 Creating holidays...')
  const holidays = [
    { name: 'New Year\'s Day', date: new Date('2024-01-01'), type: 'public', recurring: true, year: null },
    { name: 'Good Friday', date: new Date('2024-03-29'), type: 'public', recurring: false, year: 2024 },
    { name: 'Easter Monday', date: new Date('2024-04-01'), type: 'public', recurring: false, year: 2024 },
    { name: 'Labour Day', date: new Date('2024-05-01'), type: 'public', recurring: true, year: null },
    { name: 'Madaraka Day', date: new Date('2024-06-01'), type: 'public', recurring: true, year: null },
    { name: 'Eid ul-Fitr', date: new Date('2024-04-10'), type: 'public', recurring: false, year: 2024 },
    { name: 'Mashujaa Day', date: new Date('2024-10-20'), type: 'public', recurring: true, year: null },
    { name: 'Jamhuri Day', date: new Date('2024-12-12'), type: 'public', recurring: true, year: null },
    { name: 'Christmas Day', date: new Date('2024-12-25'), type: 'public', recurring: true, year: null },
    { name: 'Boxing Day', date: new Date('2024-12-26'), type: 'public', recurring: true, year: null },
    { name: 'Ministry Annual Retreat', date: new Date('2024-08-15'), type: 'company', recurring: false, year: 2024 },
  ]

  const createdHolidays = await Promise.all(
    holidays.map(holiday => prisma.holiday.create({ data: holiday }))
  )

  console.log(`✅ Created ${createdHolidays.length} holidays`)

  // Create Leave Request Templates
  console.log('📝 Creating leave templates...')
  const leaveTemplates = [
    {
      name: 'Annual Leave - Standard',
      leaveType: 'Annual',
      defaultDays: 5,
      defaultReason: 'Annual leave for rest and recreation',
      department: null,
      active: true,
    },
    {
      name: 'Sick Leave - Medical',
      leaveType: 'Sick',
      defaultDays: 3,
      defaultReason: 'Medical treatment and recovery',
      department: null,
      active: true,
    },
    {
      name: 'Training Leave - Professional Development',
      leaveType: 'Training',
      defaultDays: 5,
      defaultReason: 'Professional development and skills training',
      department: null,
      active: true,
    },
    {
      name: 'Special Service Leave',
      leaveType: 'Special Service',
      defaultDays: 3,
      defaultReason: 'Special service assignment',
      department: null,
      active: true,
    },
  ]

  const createdTemplates = await Promise.all(
    leaveTemplates.map(template => prisma.leaveRequestTemplate.create({ data: template }))
  )

  console.log(`✅ Created ${createdTemplates.length} leave templates`)

  // Create Leave Requests
  console.log('📅 Creating leave requests...')
  const leaveRequests = [
    {
      staffId: 'MFA-001',
      staffName: 'John Mwangi',
      leaveType: 'Annual',
      startDate: new Date('2024-12-20'),
      endDate: new Date('2024-12-27'),
      days: 5,
      reason: 'End of year vacation with family',
      status: 'pending',
      approvalLevels: [
        { level: 1, approverRole: 'manager', status: 'pending' },
        { level: 2, approverRole: 'hr', status: 'pending' },
      ],
    },
    {
      staffId: 'MFA-002',
      staffName: 'Mary Wanjiku',
      leaveType: 'Sick',
      startDate: new Date('2024-11-15'),
      endDate: new Date('2024-11-17'),
      days: 3,
      reason: 'Medical treatment',
      status: 'approved',
      approvedBy: 'Manager',
      approvalDate: new Date('2024-11-10'),
      approvalLevels: [
        { level: 1, approverRole: 'manager', status: 'approved', approverName: 'Manager', approvalDate: '2024-11-10' },
      ],
    },
    {
      staffId: 'MFA-003',
      staffName: 'Peter Ochieng',
      leaveType: 'Training',
      startDate: new Date('2024-12-10'),
      endDate: new Date('2024-12-14'),
      days: 5,
      reason: 'Advanced research methodology training',
      status: 'pending',
      approvalLevels: [
        { level: 1, approverRole: 'manager', status: 'pending' },
      ],
    },
    {
      staffId: 'MFA-004',
      staffName: 'Sarah Kamau',
      leaveType: 'Annual',
      startDate: new Date('2024-11-25'),
      endDate: new Date('2024-11-29'),
      days: 5,
      reason: 'Personal vacation',
      status: 'approved',
      approvedBy: 'HR Officer',
      approvalDate: new Date('2024-11-20'),
      approvalLevels: [
        { level: 1, approverRole: 'manager', status: 'approved', approverName: 'Manager', approvalDate: '2024-11-18' },
        { level: 2, approverRole: 'hr', status: 'approved', approverName: 'HR Officer', approvalDate: '2024-11-20' },
      ],
    },
    {
      staffId: 'MFA-005',
      staffName: 'David Kipchoge',
      leaveType: 'Sick',
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-03'),
      days: 3,
      reason: 'Recovery from surgery',
      status: 'approved',
      approvedBy: 'Manager',
      approvalDate: new Date('2024-11-28'),
      approvalLevels: [
        { level: 1, approverRole: 'manager', status: 'approved', approverName: 'Manager', approvalDate: '2024-11-28' },
      ],
    },
  ]

  const createdLeaves = await Promise.all(
    leaveRequests.map(leave => prisma.leaveRequest.create({ data: leave }))
  )

  console.log(`✅ Created ${createdLeaves.length} leave requests`)

  // Create Payslips
  console.log('💵 Creating payslips...')
  const payslips = [
    {
      staffId: 'MFA-001',
      month: '2024-11',
      year: 2024,
      basicSalary: 85000,
      allowances: 15000,
      deductions: 12000,
      netSalary: 88000,
      tax: 8000,
      pension: 4000,
    },
    {
      staffId: 'MFA-002',
      month: '2024-11',
      year: 2024,
      basicSalary: 75000,
      allowances: 12000,
      deductions: 10000,
      netSalary: 77000,
      tax: 7000,
      pension: 3000,
    },
    {
      staffId: 'MFA-003',
      month: '2024-11',
      year: 2024,
      basicSalary: 95000,
      allowances: 18000,
      deductions: 14000,
      netSalary: 99000,
      tax: 9000,
      pension: 5000,
    },
    {
      staffId: 'MFA-004',
      month: '2024-11',
      year: 2024,
      basicSalary: 65000,
      allowances: 10000,
      deductions: 8000,
      netSalary: 67000,
      tax: 6000,
      pension: 2000,
    },
    {
      staffId: 'MFA-005',
      month: '2024-11',
      year: 2024,
      basicSalary: 72000,
      allowances: 11000,
      deductions: 9000,
      netSalary: 74000,
      tax: 6500,
      pension: 2500,
    },
  ]

  const createdPayslips = await Promise.all(
    payslips.map(payslip => prisma.payslip.create({ data: payslip }))
  )

  console.log(`✅ Created ${createdPayslips.length} payslips`)

  // Create Performance Reviews
  console.log('⭐ Creating performance reviews...')
  const performanceReviews = [
    {
      staffId: 'MFA-001',
      reviewPeriod: '2024 Q3',
      reviewDate: new Date('2024-10-15'),
      reviewedBy: 'HR Officer',
      rating: 4,
      strengths: ['Excellent technical skills', 'Strong leadership abilities', 'Good team collaboration'],
      areasForImprovement: ['Time management', 'Documentation skills'],
      goals: ['Complete advanced training', 'Lead 2 major projects'],
      comments: 'John has shown exceptional performance this quarter. Continue the great work!',
      status: 'completed',
    },
    {
      staffId: 'MFA-002',
      reviewPeriod: '2024 Q3',
      reviewDate: new Date('2024-10-20'),
      reviewedBy: 'HR Officer',
      rating: 5,
      strengths: ['Outstanding research capabilities', 'Excellent communication', 'Innovative thinking'],
      areasForImprovement: [],
      goals: ['Publish research paper', 'Mentor junior staff'],
      comments: 'Mary has exceeded expectations in all areas. Outstanding performance!',
      status: 'completed',
    },
    {
      staffId: 'MFA-003',
      reviewPeriod: '2024 Q3',
      reviewDate: new Date('2024-10-18'),
      reviewedBy: 'HR Officer',
      rating: 4,
      strengths: ['Strong analytical skills', 'Dedicated to research', 'Good problem-solving'],
      areasForImprovement: ['Presentation skills'],
      goals: ['Present at conference', 'Complete research project'],
      comments: 'Peter continues to demonstrate strong research capabilities.',
      status: 'completed',
    },
  ]

  const createdReviews = await Promise.all(
    performanceReviews.map(review => prisma.performanceReview.create({ data: review }))
  )

  console.log(`✅ Created ${createdReviews.length} performance reviews`)

  // Create Audit Logs
  console.log('📊 Creating audit logs...')
  const auditLogs = [
    {
      action: 'CREATE_STAFF',
      user: 'HR Officer',
      staffId: 'MFA-001',
      details: 'Created staff member John Mwangi',
      timestamp: new Date('2024-01-15'),
    },
    {
      action: 'CREATE_LEAVE',
      user: 'John Mwangi',
      staffId: 'MFA-001',
      details: 'Submitted Annual leave request for 5 days',
      timestamp: new Date('2024-11-10'),
    },
    {
      action: 'UPDATE_LEAVE',
      user: 'Manager',
      staffId: 'MFA-002',
      details: 'Approved leave request',
      timestamp: new Date('2024-11-10'),
    },
    {
      action: 'CREATE_STAFF',
      user: 'HR Officer',
      staffId: 'MFA-002',
      details: 'Created staff member Mary Wanjiku',
      timestamp: new Date('2024-03-20'),
    },
    {
      action: 'UPDATE_STAFF',
      user: 'HR Officer',
      staffId: 'MFA-001',
      details: 'Updated staff member details',
      timestamp: new Date('2024-06-01'),
    },
    {
      action: 'CREATE_LEAVE_POLICY',
      user: 'HR Officer',
      details: 'Created leave policy for Annual',
      timestamp: new Date('2024-01-01'),
    },
    {
      action: 'CREATE_HOLIDAY',
      user: 'HR Officer',
      details: 'Created holiday: New Year\'s Day',
      timestamp: new Date('2024-01-01'),
    },
  ]

  const createdAuditLogs = await Promise.all(
    auditLogs.map(log => prisma.auditLog.create({ data: log }))
  )

  console.log(`✅ Created ${createdAuditLogs.length} audit logs`)

  console.log('✨ Seed completed successfully!')
  console.log(`\n📊 Summary:`)
  console.log(`   - Staff Members: ${createdStaff.length}`)
  console.log(`   - Leave Policies: ${createdPolicies.length}`)
  console.log(`   - Leave Balances: ${createdBalances.length}`)
  console.log(`   - Holidays: ${createdHolidays.length}`)
  console.log(`   - Leave Templates: ${createdTemplates.length}`)
  console.log(`   - Leave Requests: ${createdLeaves.length}`)
  console.log(`   - Payslips: ${createdPayslips.length}`)
  console.log(`   - Performance Reviews: ${createdReviews.length}`)
  console.log(`   - Audit Logs: ${createdAuditLogs.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

