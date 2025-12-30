// Load environment variables
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

  // Clear ALL existing data in proper order (respecting foreign key constraints)
  console.log('🧹 Clearing all existing data...')
  
  // Helper function to safely delete with error handling
  const safeDelete = async (modelName: string, model: any) => {
    try {
      if (model && typeof model.deleteMany === 'function') {
        await model.deleteMany()
        return true
      } else {
        console.log(`   ⚠️  Model ${modelName} not available, skipping...`)
        return false
      }
    } catch (error: any) {
      console.log(`   ⚠️  Error deleting ${modelName}: ${error.message}`)
      return false
    }
  }
  
  // Delete in reverse dependency order to avoid foreign key violations
  await safeDelete('LeaveApprovalHistory', prisma.leaveApprovalHistory)
  await safeDelete('ApprovalStep', prisma.approvalStep)
  await safeDelete('LeaveAttachment', prisma.leaveAttachment)
  await safeDelete('LeaveRequest', prisma.leaveRequest)
  await safeDelete('LeaveAccrualHistory', prisma.leaveAccrualHistory)
  await safeDelete('LeaveBalance', prisma.leaveBalance)
  await safeDelete('LeaveRequestTemplate', prisma.leaveRequestTemplate)
  await safeDelete('AuditLog', prisma.auditLog)
  await safeDelete('Notification', prisma.notification)
  await safeDelete('Session', prisma.session)
  await safeDelete('PasswordResetToken', prisma.passwordResetToken)
  await safeDelete('PasswordResetRequest', prisma.passwordResetRequest)
  await safeDelete('PushSubscription', prisma.pushSubscription)
  await safeDelete('User', prisma.user)
  await safeDelete('PerformanceReview', prisma.performanceReview)
  await safeDelete('Payslip', prisma.payslip)
  await safeDelete('AttendanceCorrection', prisma.attendanceCorrection)
  await safeDelete('Attendance', prisma.attendance)
  await safeDelete('Timesheet', prisma.timesheet)
  await safeDelete('DisciplinaryAction', prisma.disciplinaryAction)
  await safeDelete('Document', prisma.document)
  await safeDelete('SalaryStructure', prisma.salaryStructure)
  await safeDelete('TrainingAttendance', prisma.trainingAttendance)
  await safeDelete('TrainingProgram', prisma.trainingProgram)
  await safeDelete('OnboardingChecklist', prisma.onboardingChecklist)
  await safeDelete('OffboardingChecklist', prisma.offboardingChecklist)
  await safeDelete('ProfileChangeRequest', prisma.profileChangeRequest)
  await safeDelete('ApprovalDelegation', prisma.approvalDelegation)
  await safeDelete('Interview', prisma.interview)
  await safeDelete('Candidate', prisma.candidate)
  await safeDelete('JobPosting', prisma.jobPosting)
  await safeDelete('Payroll', prisma.payroll)
  await safeDelete('Holiday', prisma.holiday)
  await safeDelete('LeavePolicy', prisma.leavePolicy)
  await safeDelete('SystemSettings', prisma.systemSettings)
  await safeDelete('StaffMember', prisma.staffMember)
  
  console.log('✅ All existing data cleared')

  // Create Staff Members (MoFA Ghana Government Structure)
  console.log('👥 Creating staff members...')
  const staffMembers = [
    {
      staffId: 'MFA-001',
      firstName: 'John',
      lastName: 'Amoah',
      email: 'john.amoah@mofa.gov.gh',
      phone: '+233241234567',
      department: 'Fisheries Management',
      position: 'Senior Fisheries Officer',
      grade: 'G7',
      level: 'Senior',
      rank: 'Senior Officer',
      step: 'Step 3',
      directorate: 'Fisheries Directorate',
      unit: 'Marine Fisheries Unit',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2020-01-15'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-002',
      firstName: 'Mary',
      lastName: 'Asante',
      email: 'mary.asante@mofa.gov.gh',
      phone: '+233241234568',
      department: 'Aquaculture Development',
      position: 'Aquaculture Specialist',
      grade: 'G6',
      level: 'Middle',
      rank: 'Principal Officer',
      step: 'Step 2',
      directorate: 'Aquaculture Directorate',
      unit: 'Aquaculture Development Unit',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2021-03-20'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-003',
      firstName: 'Peter',
      lastName: 'Mensah',
      email: 'peter.mensah@mofa.gov.gh',
      phone: '+233241234569',
      department: 'Research and Development',
      position: 'Research Scientist',
      grade: 'G8',
      level: 'Senior',
      rank: 'Principal Officer',
      step: 'Step 4',
      directorate: 'Research and Development Directorate',
      unit: 'Research Unit',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2019-06-10'),
      immediateSupervisorId: null,
    },
    {
      staffId: 'MFA-004',
      firstName: 'Sarah',
      lastName: 'Osei',
      email: 'sarah.osei@mofa.gov.gh',
      phone: '+233241234570',
      department: 'Policy and Planning',
      position: 'Policy Analyst',
      grade: 'G5',
      level: 'Junior',
      rank: 'Senior Officer',
      step: 'Step 1',
      directorate: 'Policy, Planning, Monitoring & Evaluation (PPME) Directorate',
      unit: 'Policy Unit',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2022-02-01'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-005',
      firstName: 'David',
      lastName: 'Boateng',
      email: 'david.boateng@mofa.gov.gh',
      phone: '+233241234571',
      department: 'Fisheries Management',
      position: 'Director',
      grade: 'G10',
      level: 'Executive',
      rank: 'Director',
      step: 'Step 5',
      directorate: 'Fisheries Directorate',
      unit: null, // Directors don't belong to units
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2015-08-15'),
      immediateSupervisorId: null,
    },
    {
      staffId: 'MFA-006',
      firstName: 'Grace',
      lastName: 'Darko',
      email: 'grace.darko@mofa.gov.gh',
      phone: '+233241234572',
      department: 'Aquaculture Development',
      position: 'Regional Manager',
      grade: 'G9',
      level: 'Senior',
      rank: 'Regional Manager',
      step: 'Step 3',
      directorate: 'Aquaculture Directorate',
      unit: null,
      dutyStation: 'Region',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2018-05-10'),
      immediateSupervisorId: null,
    },
    {
      staffId: 'MFA-007',
      firstName: 'James',
      lastName: 'Adjei',
      email: 'james.adjei@mofa.gov.gh',
      phone: '+233241234573',
      department: 'Human Resources',
      position: 'HR Director',
      grade: 'G10',
      level: 'Executive',
      rank: 'Director',
      step: 'Step 5',
      directorate: 'Finance & Administration Directorate',
      unit: 'Human Resource Management Unit (HRMU)',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2016-11-20'),
      immediateSupervisorId: null,
    },
    {
      staffId: 'MFA-008',
      firstName: 'Lucy',
      lastName: 'Appiah',
      email: 'lucy.appiah@mofa.gov.gh',
      phone: '+233241234574',
      department: 'Human Resources',
      position: 'HR Officer',
      grade: 'G6',
      level: 'Middle',
      rank: 'Principal Officer',
      step: 'Step 2',
      directorate: 'Finance & Administration Directorate',
      unit: 'Human Resource Management Unit (HRMU)',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2021-01-05'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
  ]

  const createdStaff = await Promise.all(
    staffMembers.map(staff => prisma.staffMember.create({ data: staff }))
  )

  console.log(`✅ Created ${createdStaff.length} staff members`)

  // Update supervisor and manager relationships after all staff are created
  console.log('🔗 Updating supervisor and manager relationships...')
  await prisma.staffMember.update({
    where: { staffId: 'MFA-001' },
    data: { 
      managerId: null,
      immediateSupervisorId: 'MFA-005', // John reports to Director
    },
  })
  await prisma.staffMember.update({
    where: { staffId: 'MFA-002' },
    data: { 
      managerId: null, // Will be set after creation // Mary reports to John
      immediateSupervisorId: null, // Will be set after creation
    },
  })
  await prisma.staffMember.update({
    where: { staffId: 'MFA-003' },
    data: { 
      managerId: null,
      immediateSupervisorId: 'MFA-005', // Peter reports to Director
    },
  })
  await prisma.staffMember.update({
    where: { staffId: 'MFA-004' },
    data: { 
      managerId: null, // Will be set after creation // Sarah reports to Peter
      immediateSupervisorId: null, // Will be set after creation
    },
  })
  await prisma.staffMember.update({
    where: { staffId: 'MFA-005' },
    data: { 
      managerId: null,
      immediateSupervisorId: null, // Director reports to Chief Director (not in seed)
    },
  })
  await prisma.staffMember.update({
    where: { staffId: 'MFA-006' },
    data: { 
      managerId: null,
      immediateSupervisorId: 'MFA-005', // Regional Manager reports to Director
    },
  })
  await prisma.staffMember.update({
    where: { staffId: 'MFA-007' },
    data: { 
      managerId: null,
      immediateSupervisorId: null, // HR Director reports to Chief Director
    },
  })
  await prisma.staffMember.update({
    where: { staffId: 'MFA-008' },
    data: { 
      managerId: null, // Will be set after creation // Lucy reports to James
      immediateSupervisorId: null, // Will be set after creation
    },
  })

  // Create Leave Policies (MoFA Ghana Government)
  console.log('📋 Creating leave policies...')
  const leavePolicies = [
    {
      leaveType: 'Annual',
      maxDays: 30,
      accrualRate: 2.5, // 2.5 days per month
      accrualFrequency: 'monthly',
      carryoverAllowed: true,
      maxCarryover: 10,
      expiresAfterMonths: 12, // Annual leave expires after 12 months if not used
      requiresApproval: true,
      approvalLevels: 2, // Supervisor + HR
      active: true,
    },
    {
      leaveType: 'Sick',
      maxDays: 30,
      accrualRate: 2.5,
      accrualFrequency: 'monthly',
      carryoverAllowed: false,
      maxCarryover: 0,
      expiresAfterMonths: null, // Sick leave doesn't expire
      requiresApproval: true,
      approvalLevels: 1, // Supervisor only
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
      approvalLevels: 2, // Supervisor + HR
      active: true,
    },
    {
      leaveType: 'Special Service',
      maxDays: 14,
      accrualRate: 0,
      accrualFrequency: 'monthly',
      carryoverAllowed: false,
      maxCarryover: 0,
      expiresAfterMonths: null,
      requiresApproval: true,
      approvalLevels: 2, // Supervisor + HR
      active: true,
    },
    {
      leaveType: 'Training',
      maxDays: 10,
      accrualRate: 0,
      accrualFrequency: 'monthly',
      carryoverAllowed: false,
      maxCarryover: 0,
      expiresAfterMonths: null,
      requiresApproval: true,
      approvalLevels: 1, // Supervisor only
      active: true,
    },
    {
      leaveType: 'Study',
      maxDays: 30,
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
      leaveType: 'Maternity',
      maxDays: 90,
      accrualRate: 0,
      accrualFrequency: 'monthly',
      carryoverAllowed: false,
      maxCarryover: 0,
      expiresAfterMonths: null,
      requiresApproval: true,
      approvalLevels: 1,
      active: true,
    },
    {
      leaveType: 'Paternity',
      maxDays: 7,
      accrualRate: 0,
      accrualFrequency: 'monthly',
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
      accrualFrequency: 'monthly',
      carryoverAllowed: false,
      maxCarryover: 0,
      expiresAfterMonths: null,
      requiresApproval: true,
      approvalLevels: 1,
      active: true,
    },
  ]

  const createdPolicies = await Promise.all(
    leavePolicies.map(policy => prisma.leavePolicy.create({ data: policy }))
  )

  console.log(`✅ Created ${createdPolicies.length} leave policies`)

  // Create Leave Balances (with all leave types)
  console.log('💰 Creating leave balances...')
  const leaveBalances = [
    { 
      staffId: 'MFA-001', 
      annual: 15, sick: 10, unpaid: 0, specialService: 5, training: 3,
      study: 0, maternity: 0, paternity: 0, compassionate: 0,
      annualCarryForward: 5, sickCarryForward: 0, specialServiceCarryForward: 0,
      trainingCarryForward: 0, studyCarryForward: 0,
      lastAccrualDate: new Date('2024-12-01'),
      accrualPeriod: 'monthly',
    },
    { 
      staffId: 'MFA-002', 
      annual: 20, sick: 12, unpaid: 0, specialService: 7, training: 2,
      study: 0, maternity: 0, paternity: 0, compassionate: 0,
      annualCarryForward: 0, sickCarryForward: 0, specialServiceCarryForward: 0,
      trainingCarryForward: 0, studyCarryForward: 0,
      lastAccrualDate: new Date('2024-12-01'),
      accrualPeriod: 'monthly',
    },
    { 
      staffId: 'MFA-003', 
      annual: 25, sick: 15, unpaid: 0, specialService: 10, training: 5,
      study: 0, maternity: 0, paternity: 0, compassionate: 0,
      annualCarryForward: 8, sickCarryForward: 0, specialServiceCarryForward: 0,
      trainingCarryForward: 0, studyCarryForward: 0,
      lastAccrualDate: new Date('2024-12-01'),
      accrualPeriod: 'monthly',
    },
    { 
      staffId: 'MFA-004', 
      annual: 18, sick: 8, unpaid: 0, specialService: 3, training: 1,
      study: 0, maternity: 0, paternity: 0, compassionate: 0,
      annualCarryForward: 0, sickCarryForward: 0, specialServiceCarryForward: 0,
      trainingCarryForward: 0, studyCarryForward: 0,
      lastAccrualDate: new Date('2024-12-01'),
      accrualPeriod: 'monthly',
    },
    { 
      staffId: 'MFA-005', 
      annual: 22, sick: 11, unpaid: 0, specialService: 6, training: 4,
      study: 0, maternity: 0, paternity: 0, compassionate: 0,
      annualCarryForward: 3, sickCarryForward: 0, specialServiceCarryForward: 0,
      trainingCarryForward: 0, studyCarryForward: 0,
      lastAccrualDate: new Date('2024-12-01'),
      accrualPeriod: 'monthly',
    },
    { 
      staffId: 'MFA-006', 
      annual: 16, sick: 9, unpaid: 0, specialService: 4, training: 2,
      study: 0, maternity: 0, paternity: 0, compassionate: 0,
      annualCarryForward: 0, sickCarryForward: 0, specialServiceCarryForward: 0,
      trainingCarryForward: 0, studyCarryForward: 0,
      lastAccrualDate: new Date('2024-12-01'),
      accrualPeriod: 'monthly',
    },
    { 
      staffId: 'MFA-007', 
      annual: 28, sick: 18, unpaid: 0, specialService: 12, training: 6,
      study: 0, maternity: 0, paternity: 0, compassionate: 0,
      annualCarryForward: 10, sickCarryForward: 0, specialServiceCarryForward: 0,
      trainingCarryForward: 0, studyCarryForward: 0,
      lastAccrualDate: new Date('2024-12-01'),
      accrualPeriod: 'monthly',
    },
    { 
      staffId: 'MFA-008', 
      annual: 21, sick: 13, unpaid: 0, specialService: 8, training: 3,
      study: 0, maternity: 0, paternity: 0, compassionate: 0,
      annualCarryForward: 2, sickCarryForward: 0, specialServiceCarryForward: 0,
      trainingCarryForward: 0, studyCarryForward: 0,
      lastAccrualDate: new Date('2024-12-01'),
      accrualPeriod: 'monthly',
    },
  ]

  const createdBalances = await Promise.all(
    leaveBalances.map(balance => prisma.leaveBalance.create({ data: balance }))
  )

  console.log(`✅ Created ${createdBalances.length} leave balances`)

  // Create Holidays (Ghana Public Holidays)
  console.log('🎉 Creating holidays...')
  const holidays = [
    { name: 'New Year\'s Day', date: new Date('2024-01-01'), type: 'public', recurring: true, year: null },
    { name: 'Independence Day', date: new Date('2024-03-06'), type: 'public', recurring: true, year: null },
    { name: 'Good Friday', date: new Date('2024-03-29'), type: 'public', recurring: false, year: 2024 },
    { name: 'Easter Monday', date: new Date('2024-04-01'), type: 'public', recurring: false, year: 2024 },
    { name: 'Eid ul-Fitr', date: new Date('2024-04-10'), type: 'public', recurring: false, year: 2024 },
    { name: 'Labour Day', date: new Date('2024-05-01'), type: 'public', recurring: true, year: null },
    { name: 'Republic Day', date: new Date('2024-07-01'), type: 'public', recurring: true, year: null },
    { name: 'Founders\' Day', date: new Date('2024-08-04'), type: 'public', recurring: true, year: null },
    { name: 'Kwame Nkrumah Memorial Day', date: new Date('2024-09-21'), type: 'public', recurring: true, year: null },
    { name: 'Farmers\' Day', date: new Date('2024-12-06'), type: 'public', recurring: false, year: 2024 },
    { name: 'Christmas Day', date: new Date('2024-12-25'), type: 'public', recurring: true, year: null },
    { name: 'Boxing Day', date: new Date('2024-12-26'), type: 'public', recurring: true, year: null },
    { name: 'MoFA Annual Retreat', date: new Date('2024-08-15'), type: 'company', recurring: false, year: 2024 },
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
      staffName: 'John Amoah',
      leaveType: 'Annual',
      startDate: new Date('2024-12-20'),
      endDate: new Date('2024-12-27'),
      days: 5,
      reason: 'End of year vacation with family',
      status: 'pending',
      declarationAccepted: true,
      approvalLevels: [
        { level: 1, approverRole: 'SUPERVISOR', status: 'pending' },
        { level: 2, approverRole: 'HR_OFFICER', status: 'pending' },
      ],
    },
    {
      staffId: 'MFA-002',
      staffName: 'Mary Asante',
      leaveType: 'Sick',
      startDate: new Date('2024-11-15'),
      endDate: new Date('2024-11-17'),
      days: 3,
      reason: 'Medical treatment',
      status: 'approved',
      approvedBy: 'John Amoah',
      approvalDate: new Date('2024-11-10'),
      declarationAccepted: true,
      approvalLevels: [
        { level: 1, approverRole: 'SUPERVISOR', status: 'approved', approverName: 'John Amoah', approvalDate: '2024-11-10' },
      ],
    },
    {
      staffId: 'MFA-003',
      staffName: 'Peter Mensah',
      leaveType: 'Training',
      startDate: new Date('2024-12-10'),
      endDate: new Date('2024-12-14'),
      days: 5,
      reason: 'Advanced research methodology training',
      status: 'pending',
      declarationAccepted: true,
      approvalLevels: [
        { level: 1, approverRole: 'SUPERVISOR', status: 'pending' },
      ],
    },
    {
      staffId: 'MFA-004',
      staffName: 'Sarah Osei',
      leaveType: 'Annual',
      startDate: new Date('2024-11-25'),
      endDate: new Date('2024-11-29'),
      days: 5,
      reason: 'Personal vacation',
      status: 'approved',
      approvedBy: 'Lucy Appiah',
      approvalDate: new Date('2024-11-20'),
      declarationAccepted: true,
      approvalLevels: [
        { level: 1, approverRole: 'SUPERVISOR', status: 'approved', approverName: 'Peter Mensah', approvalDate: '2024-11-18' },
        { level: 2, approverRole: 'HR_OFFICER', status: 'approved', approverName: 'Lucy Appiah', approvalDate: '2024-11-20' },
      ],
    },
    {
      staffId: 'MFA-005',
      staffName: 'David Boateng',
      leaveType: 'Sick',
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-03'),
      days: 3,
      reason: 'Recovery from surgery',
      status: 'approved',
      approvedBy: 'Lucy Appiah',
      approvalDate: new Date('2024-11-28'),
      declarationAccepted: true,
      approvalLevels: [
        { level: 1, approverRole: 'HR_OFFICER', status: 'approved', approverName: 'Lucy Appiah', approvalDate: '2024-11-28' },
      ],
    },
  ]

  const createdLeaves = await Promise.all(
    leaveRequests.map(leave => prisma.leaveRequest.create({ data: leave }))
  )

  console.log(`✅ Created ${createdLeaves.length} leave requests`)

  // Create Approval Steps for Leave Requests
  console.log('📝 Creating approval steps for leave requests...')
  const approvalSteps = []
  for (const leave of createdLeaves) {
    if (leave.status === 'pending') {
      approvalSteps.push({
        leaveRequestId: leave.id,
        level: 1,
        approverRole: 'SUPERVISOR',
        approverStaffId: 'MFA-001',
        status: 'pending',
        previousLevelCompleted: true,
      })
      if (leave.leaveType === 'Annual' || leave.leaveType === 'Unpaid') {
        approvalSteps.push({
          leaveRequestId: leave.id,
          level: 2,
          approverRole: 'HR_OFFICER',
          approverStaffId: 'MFA-008',
          status: 'pending',
          previousLevelCompleted: false,
        })
      }
    } else if (leave.status === 'approved') {
      approvalSteps.push({
        leaveRequestId: leave.id,
        level: 1,
        approverRole: leave.leaveType === 'Sick' ? 'SUPERVISOR' : 'SUPERVISOR',
        approverStaffId: 'MFA-001',
        status: 'approved',
        approverName: leave.approvedBy || 'John Amoah',
        approvalDate: leave.approvalDate || new Date(),
        previousLevelCompleted: true,
      })
      if (leave.leaveType === 'Annual') {
        approvalSteps.push({
          leaveRequestId: leave.id,
          level: 2,
          approverRole: 'HR_OFFICER',
          approverStaffId: 'MFA-008',
          status: 'approved',
          approverName: leave.approvedBy || 'Lucy Appiah',
          approvalDate: leave.approvalDate || new Date(),
          previousLevelCompleted: true,
        })
      }
    }
  }

  const createdApprovalSteps = await Promise.all(
    approvalSteps.map(step => prisma.approvalStep.create({ data: step }))
  )

  console.log(`✅ Created ${createdApprovalSteps.length} approval steps`)

  // Create Leave Approval History
  console.log('📜 Creating leave approval history...')
  const leaveApprovalHistory = []
  for (const leave of createdLeaves.filter(l => l.status === 'approved')) {
    leaveApprovalHistory.push({
      leaveRequestId: leave.id,
      level: 1,
      action: 'approved',
      approverId: 'supervisor@mofa.gov.gh',
      approverName: leave.approvedBy || 'John Amoah',
      approverRole: 'SUPERVISOR',
      approverStaffId: 'MFA-001',
      previousStatus: 'pending',
      newStatus: leave.leaveType === 'Sick' ? 'approved' : 'pending',
      timestamp: leave.approvalDate || new Date(),
    })
    if (leave.leaveType === 'Annual') {
      leaveApprovalHistory.push({
        leaveRequestId: leave.id,
        level: 2,
        action: 'approved',
        approverId: 'hrofficer@mofa.gov.gh',
        approverName: 'Lucy Appiah',
        approverRole: 'HR_OFFICER',
        approverStaffId: 'MFA-008',
        previousStatus: 'pending',
        newStatus: 'approved',
        timestamp: leave.approvalDate || new Date(),
      })
    }
  }

  const createdLeaveApprovalHistory = await Promise.all(
    leaveApprovalHistory.map(history => prisma.leaveApprovalHistory.create({ data: history }))
  )

  console.log(`✅ Created ${createdLeaveApprovalHistory.length} leave approval history records`)

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
      reviewedBy: 'Lucy Appiah',
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
      reviewedBy: 'Lucy Appiah',
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
      reviewedBy: 'Lucy Appiah',
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
      user: 'hrofficer@mofa.gov.gh',
      userRole: 'HR_OFFICER',
      staffId: 'MFA-001',
      details: 'Created staff member John Amoah',
      timestamp: new Date('2024-01-15'),
    },
    {
      action: 'CREATE_LEAVE',
      user: 'employee@mofa.gov.gh',
      userRole: 'EMPLOYEE',
      staffId: 'MFA-001',
      details: 'Submitted Annual leave request for 5 days',
      timestamp: new Date('2024-11-10'),
    },
    {
      action: 'UPDATE_LEAVE',
      user: 'supervisor@mofa.gov.gh',
      userRole: 'SUPERVISOR',
      staffId: 'MFA-002',
      details: 'Approved leave request',
      timestamp: new Date('2024-11-10'),
    },
    {
      action: 'CREATE_STAFF',
      user: 'hrofficer@mofa.gov.gh',
      userRole: 'HR_OFFICER',
      staffId: 'MFA-002',
      details: 'Created staff member Mary Asante',
      timestamp: new Date('2024-03-20'),
    },
    {
      action: 'UPDATE_STAFF',
      user: 'hrofficer@mofa.gov.gh',
      userRole: 'HR_OFFICER',
      staffId: 'MFA-001',
      details: 'Updated staff member details',
      timestamp: new Date('2024-06-01'),
    },
    {
      action: 'CREATE_LEAVE_POLICY',
      user: 'hrofficer@mofa.gov.gh',
      userRole: 'HR_OFFICER',
      details: 'Created leave policy for Annual',
      timestamp: new Date('2024-01-01'),
    },
    {
      action: 'CREATE_HOLIDAY',
      user: 'hrofficer@mofa.gov.gh',
      userRole: 'HR_OFFICER',
      details: 'Created holiday: New Year\'s Day',
      timestamp: new Date('2024-01-01'),
    },
  ]

  const createdAuditLogs = await Promise.all(
    auditLogs.map(log => prisma.auditLog.create({ data: log }))
  )

  console.log(`✅ Created ${createdAuditLogs.length} audit logs`)

  // Create Additional Staff Members (Expanding to 25+ staff)
  console.log('👥 Creating additional staff members...')
  const additionalStaff = [
    {
      staffId: 'MFA-009',
      firstName: 'Kwame',
      lastName: 'Owusu',
      email: 'kwame.owusu@mofa.gov.gh',
      phone: '+233241234575',
      department: 'Fisheries Management',
      position: 'Fisheries Officer',
      grade: 'G6',
      level: 'Middle',
      rank: 'Principal Officer',
      step: 'Step 1',
      directorate: 'Fisheries Directorate',
      unit: 'Marine Fisheries Unit',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2021-09-10'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-010',
      firstName: 'Ama',
      lastName: 'Gyasi',
      email: 'ama.gyasi@mofa.gov.gh',
      phone: '+233241234576',
      department: 'Aquaculture Development',
      position: 'Extension Officer',
      grade: 'G5',
      level: 'Junior',
      rank: 'Senior Officer',
      step: 'Step 1',
      directorate: 'Aquaculture Directorate',
      unit: 'Aquaculture Development Unit',
      dutyStation: 'Region',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2022-07-15'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-011',
      firstName: 'Kofi',
      lastName: 'Agyeman',
      email: 'kofi.agyeman@mofa.gov.gh',
      phone: '+233241234577',
      department: 'Research and Development',
      position: 'Research Assistant',
      grade: 'G4',
      level: 'Junior',
      rank: 'Officer',
      step: 'Step 1',
      directorate: 'Research and Development Directorate',
      unit: 'Research Unit',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2023-01-20'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-012',
      firstName: 'Akosua',
      lastName: 'Bonsu',
      email: 'akosua.bonsu@mofa.gov.gh',
      phone: '+233241234578',
      department: 'Policy and Planning',
      position: 'Planning Officer',
      grade: 'G6',
      level: 'Middle',
      rank: 'Principal Officer',
      step: 'Step 2',
      directorate: 'Policy, Planning, Monitoring & Evaluation (PPME) Directorate',
      unit: 'Policy Unit',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2020-11-05'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-013',
      firstName: 'Yaw',
      lastName: 'Tetteh',
      email: 'yaw.tetteh@mofa.gov.gh',
      phone: '+233241234579',
      department: 'Administration',
      position: 'Administrative Assistant',
      grade: 'G4',
      level: 'Junior',
      rank: 'Officer',
      step: 'Step 1',
      directorate: 'Finance & Administration Directorate',
      unit: 'Administration Unit',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2023-03-10'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-014',
      firstName: 'Efua',
      lastName: 'Quartey',
      email: 'efua.quartey@mofa.gov.gh',
      phone: '+233241234580',
      department: 'Human Resources',
      position: 'HR Assistant',
      grade: 'G5',
      level: 'Junior',
      rank: 'Senior Officer',
      step: 'Step 1',
      directorate: 'Finance & Administration Directorate',
      unit: 'Human Resource Management Unit (HRMU)',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2022-05-20'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-015',
      firstName: 'Nana',
      lastName: 'Amoako',
      email: 'nana.amoako@mofa.gov.gh',
      phone: '+233241234581',
      department: 'Finance',
      position: 'Accountant',
      grade: 'G7',
      level: 'Senior',
      rank: 'Senior Officer',
      step: 'Step 3',
      directorate: 'Finance & Administration Directorate',
      unit: 'Accounts Unit',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2019-04-12'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-016',
      firstName: 'Abena',
      lastName: 'Frimpong',
      email: 'abena.frimpong@mofa.gov.gh',
      phone: '+233241234582',
      department: 'Internal Audit',
      position: 'Internal Auditor',
      grade: 'G8',
      level: 'Senior',
      rank: 'Principal Officer',
      step: 'Step 4',
      directorate: 'Finance & Administration Directorate',
      unit: 'Internal Audit Unit',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2018-08-25'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-017',
      firstName: 'Kojo',
      lastName: 'Sarpong',
      email: 'kojo.sarpong@mofa.gov.gh',
      phone: '+233241234583',
      department: 'Fisheries Management',
      position: 'Marine Biologist',
      grade: 'G7',
      level: 'Senior',
      rank: 'Senior Officer',
      step: 'Step 2',
      directorate: 'Fisheries Directorate',
      unit: 'Marine Fisheries Unit',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2020-06-18'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-018',
      firstName: 'Adwoa',
      lastName: 'Manu',
      email: 'adwoa.manu@mofa.gov.gh',
      phone: '+233241234584',
      department: 'Aquaculture Development',
      position: 'Aquaculture Technician',
      grade: 'G5',
      level: 'Junior',
      rank: 'Senior Officer',
      step: 'Step 1',
      directorate: 'Aquaculture Directorate',
      unit: 'Aquaculture Development Unit',
      dutyStation: 'Region',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2022-09-05'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-019',
      firstName: 'Emmanuel',
      lastName: 'Osei',
      email: 'emmanuel.osei@mofa.gov.gh',
      phone: '+233241234585',
      department: 'Research and Development',
      position: 'Data Analyst',
      grade: 'G6',
      level: 'Middle',
      rank: 'Principal Officer',
      step: 'Step 2',
      directorate: 'Research and Development Directorate',
      unit: 'Research Unit',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2021-02-14'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-020',
      firstName: 'Gifty',
      lastName: 'Asiedu',
      email: 'gifty.asiedu@mofa.gov.gh',
      phone: '+233241234586',
      department: 'Policy and Planning',
      position: 'Monitoring & Evaluation Officer',
      grade: 'G6',
      level: 'Middle',
      rank: 'Principal Officer',
      step: 'Step 2',
      directorate: 'Policy, Planning, Monitoring & Evaluation (PPME) Directorate',
      unit: 'Policy Unit',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2020-10-30'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-021',
      firstName: 'Prince',
      lastName: 'Mensah',
      email: 'prince.mensah@mofa.gov.gh',
      phone: '+233241234587',
      department: 'Protocol',
      position: 'Protocol Officer',
      grade: 'G6',
      level: 'Middle',
      rank: 'Principal Officer',
      step: 'Step 1',
      directorate: 'Finance & Administration Directorate',
      unit: 'Protocol Unit',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2021-07-22'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-022',
      firstName: 'Patience',
      lastName: 'Amoah',
      email: 'patience.amoah@mofa.gov.gh',
      phone: '+233241234588',
      department: 'Fisheries Management',
      position: 'Fisheries Inspector',
      grade: 'G5',
      level: 'Junior',
      rank: 'Senior Officer',
      step: 'Step 1',
      directorate: 'Fisheries Directorate',
      unit: 'Marine Fisheries Unit',
      dutyStation: 'Region',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2022-11-08'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-023',
      firstName: 'Richard',
      lastName: 'Boateng',
      email: 'richard.boateng@mofa.gov.gh',
      phone: '+233241234589',
      department: 'Aquaculture Development',
      position: 'Aquaculture Officer',
      grade: 'G6',
      level: 'Middle',
      rank: 'Principal Officer',
      step: 'Step 1',
      directorate: 'Aquaculture Directorate',
      unit: 'Aquaculture Development Unit',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2021-12-03'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-024',
      firstName: 'Comfort',
      lastName: 'Darko',
      email: 'comfort.darko@mofa.gov.gh',
      phone: '+233241234590',
      department: 'Human Resources',
      position: 'HR Officer',
      grade: 'G6',
      level: 'Middle',
      rank: 'Principal Officer',
      step: 'Step 2',
      directorate: 'Finance & Administration Directorate',
      unit: 'Human Resource Management Unit (HRMU)',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2020-03-17'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
    {
      staffId: 'MFA-025',
      firstName: 'Samuel',
      lastName: 'Adjei',
      email: 'samuel.adjei@mofa.gov.gh',
      phone: '+233241234591',
      department: 'Research and Development',
      position: 'Research Officer',
      grade: 'G7',
      level: 'Senior',
      rank: 'Senior Officer',
      step: 'Step 3',
      directorate: 'Research and Development Directorate',
      unit: 'Research Unit',
      dutyStation: 'HQ',
      employmentStatus: 'active',
      active: true,
      joinDate: new Date('2019-09-25'),
      managerId: null, // Will be set after creation
      immediateSupervisorId: null, // Will be set after creation
    },
  ]

  const createdAdditionalStaff = await Promise.all(
    additionalStaff.map(staff => prisma.staffMember.create({ data: staff }))
  )

  console.log(`✅ Created ${createdAdditionalStaff.length} additional staff members`)

  // Update manager and supervisor relationships for additional staff
  console.log('🔗 Updating relationships for additional staff...')
  const additionalStaffUpdates = [
    { staffId: 'MFA-009', managerId: 'MFA-001', immediateSupervisorId: 'MFA-001' },
    { staffId: 'MFA-010', managerId: 'MFA-006', immediateSupervisorId: 'MFA-006' },
    { staffId: 'MFA-011', managerId: 'MFA-003', immediateSupervisorId: 'MFA-003' },
    { staffId: 'MFA-012', managerId: 'MFA-003', immediateSupervisorId: 'MFA-003' },
    { staffId: 'MFA-013', managerId: 'MFA-007', immediateSupervisorId: 'MFA-007' },
    { staffId: 'MFA-014', managerId: 'MFA-008', immediateSupervisorId: 'MFA-008' },
    { staffId: 'MFA-015', managerId: 'MFA-007', immediateSupervisorId: 'MFA-007' },
    { staffId: 'MFA-016', managerId: 'MFA-007', immediateSupervisorId: 'MFA-007' },
    { staffId: 'MFA-017', managerId: 'MFA-001', immediateSupervisorId: 'MFA-001' },
    { staffId: 'MFA-018', managerId: 'MFA-006', immediateSupervisorId: 'MFA-006' },
    { staffId: 'MFA-019', managerId: 'MFA-003', immediateSupervisorId: 'MFA-003' },
    { staffId: 'MFA-020', managerId: 'MFA-003', immediateSupervisorId: 'MFA-003' },
    { staffId: 'MFA-021', managerId: 'MFA-007', immediateSupervisorId: 'MFA-007' },
    { staffId: 'MFA-022', managerId: 'MFA-006', immediateSupervisorId: 'MFA-006' },
    { staffId: 'MFA-023', managerId: 'MFA-001', immediateSupervisorId: 'MFA-001' },
    { staffId: 'MFA-024', managerId: 'MFA-008', immediateSupervisorId: 'MFA-008' },
    { staffId: 'MFA-025', managerId: 'MFA-003', immediateSupervisorId: 'MFA-003' },
  ]

  await Promise.all(
    additionalStaffUpdates.map(update =>
      prisma.staffMember.update({
        where: { staffId: update.staffId },
        data: { managerId: update.managerId, immediateSupervisorId: update.immediateSupervisorId },
      })
    )
  )

  // Create leave balances for additional staff
  console.log('💰 Creating leave balances for additional staff...')
  const additionalBalances = createdAdditionalStaff.map((staff, index) => ({
    staffId: staff.staffId,
    annual: 15 + (index % 10),
    sick: 8 + (index % 5),
    unpaid: 0,
    specialService: 3 + (index % 4),
    training: 2 + (index % 3),
    study: 0,
    maternity: 0,
    paternity: 0,
    compassionate: 0,
    annualCarryForward: index % 3 === 0 ? 5 : 0,
    sickCarryForward: 0,
    specialServiceCarryForward: 0,
    trainingCarryForward: 0,
    studyCarryForward: 0,
    lastAccrualDate: new Date('2024-12-01'),
    accrualPeriod: 'monthly',
  }))

  const createdAdditionalBalances = await Promise.all(
    additionalBalances.map(balance => prisma.leaveBalance.create({ data: balance }))
  )

  console.log(`✅ Created ${createdAdditionalBalances.length} additional leave balances`)

  // Define grade salaries (used for salary structures and payslips)
  const gradeSalaries: Record<string, number> = {
    'G4': 35000,
    'G5': 45000,
    'G6': 55000,
    'G7': 70000,
    'G8': 85000,
    'G9': 100000,
    'G10': 120000,
  }

  // Create more payslips for all staff (last 3 months)
  console.log('💵 Creating additional payslips for all staff...')
  const additionalPayslips = []
  const months = ['2024-09', '2024-10', '2024-11']
  for (const month of months) {
    for (const staff of [...createdStaff, ...createdAdditionalStaff].slice(0, 20)) {
      const salary = gradeSalaries[staff.grade] || 50000
      additionalPayslips.push({
        staffId: staff.staffId,
        month,
        year: parseInt(month.split('-')[0]),
        basicSalary: salary,
        allowances: salary * 0.35,
        deductions: salary * 0.20,
        netSalary: salary * 1.15,
        tax: salary * 0.10,
        pension: salary * 0.05,
      })
    }
  }

  const createdAdditionalPayslips = await Promise.all(
    additionalPayslips.map(payslip => prisma.payslip.create({ data: payslip }))
  )

  console.log(`✅ Created ${createdAdditionalPayslips.length} additional payslips`)

  // Create User Accounts for All Roles
  console.log('👤 Creating user accounts for all roles...')
  
  // Default password for all test users
  const defaultPassword = 'Password123!'
  const passwordHash = await bcrypt.hash(defaultPassword, 10)

  // Define users for all MoFA roles
  const roleUsers = [
    // MoFA Exact Roles
    {
      email: 'employee@mofa.gov.gh',
      role: 'EMPLOYEE',
      staffId: 'MFA-002', // Mary Asante
      displayName: 'Employee',
    },
    {
      email: 'supervisor@mofa.gov.gh',
      role: 'SUPERVISOR',
      staffId: 'MFA-001', // John Amoah
      displayName: 'Supervisor',
    },
    {
      email: 'unithead@mofa.gov.gh',
      role: 'UNIT_HEAD',
      staffId: 'MFA-003', // Peter Mensah
      displayName: 'Unit Head',
    },
    {
      email: 'divisionhead@mofa.gov.gh',
      role: 'DIVISION_HEAD',
      staffId: 'MFA-004', // Sarah Osei
      displayName: 'Division Head',
    },
    {
      email: 'director@mofa.gov.gh',
      role: 'DIRECTOR',
      staffId: 'MFA-005', // David Boateng
      displayName: 'Director',
    },
    {
      email: 'regionalmanager@mofa.gov.gh',
      role: 'REGIONAL_MANAGER',
      staffId: 'MFA-006', // Grace Darko
      displayName: 'Regional Manager',
    },
    {
      email: 'hrofficer@mofa.gov.gh',
      role: 'HR_OFFICER',
      staffId: 'MFA-008', // Lucy Appiah
      displayName: 'HR Officer',
    },
    {
      email: 'hrdirector@mofa.gov.gh',
      role: 'HR_DIRECTOR',
      staffId: 'MFA-007', // James Adjei
      displayName: 'HR Director',
    },
    {
      email: 'chiefdirector@mofa.gov.gh',
      role: 'CHIEF_DIRECTOR',
      staffId: null, // Chief Director may not have staff record
      displayName: 'Chief Director',
    },
    {
      email: 'auditor@mofa.gov.gh',
      role: 'AUDITOR',
      staffId: null, // Auditor may not have staff record
      displayName: 'Auditor',
    },
    {
      email: 'sysadmin@mofa.gov.gh',
      role: 'SYS_ADMIN',
      staffId: null, // System Admin may not have staff record
      displayName: 'System Admin',
    },
  ]

  const createdUsers = []
  const credentialsList = []

  for (const userData of roleUsers) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      })

      if (existingUser) {
        console.log(`   ⚠️  User ${userData.email} already exists, skipping...`)
        continue
      }

      // If staffId is provided, verify it exists
      if (userData.staffId) {
        const staff = await prisma.staffMember.findUnique({
          where: { staffId: userData.staffId },
        })
        if (!staff) {
          console.log(`   ⚠️  Staff ID ${userData.staffId} not found for ${userData.email}, creating without staff link...`)
          userData.staffId = null as any
        }
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash,
          role: userData.role,
          staffId: userData.staffId,
          active: true,
          emailVerified: false,
        },
      })

      createdUsers.push(user)
      credentialsList.push({
        role: userData.displayName,
        email: userData.email,
        password: defaultPassword,
        staffId: userData.staffId || 'N/A',
      })

      console.log(`   ✅ Created user: ${userData.email} (${userData.role})`)
    } catch (error: any) {
      console.error(`   ❌ Error creating user ${userData.email}:`, error.message)
    }
  }

  console.log(`✅ Created ${createdUsers.length} user accounts`)

  // Print credentials summary
  console.log('\n📋 Login Credentials Summary:')
  console.log('═'.repeat(80))
  console.log('| Role'.padEnd(25) + '| Email'.padEnd(35) + '| Password'.padEnd(15) + '| Staff ID |')
  console.log('═'.repeat(80))
  credentialsList.forEach(cred => {
    console.log(
      `| ${cred.role.padEnd(23)}| ${cred.email.padEnd(33)}| ${cred.password.padEnd(13)}| ${String(cred.staffId).padEnd(8)} |`
    )
  })
  console.log('═'.repeat(80))
  console.log(`\n💡 All users use the same password: ${defaultPassword}`)
  console.log('⚠️  IMPORTANT: Change these passwords in production!')

  // Create Attendance Records
  console.log('⏰ Creating attendance records...')
  const allStaffIds = [...createdStaff, ...createdAdditionalStaff].map(s => s.staffId)
  const attendanceRecords = []
  const today = new Date()
  
  // Create attendance for last 30 days for all staff
  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue
    
    for (const staffId of allStaffIds.slice(0, 15)) { // First 15 staff members
      const clockIn = new Date(date)
      clockIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0)
      
      const clockOut = new Date(date)
      clockOut.setHours(16 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0)
      
      const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60) - 1 // 1 hour lunch
      
      attendanceRecords.push({
        staffId,
        date,
        clockIn,
        clockOut,
        breakDuration: 60,
        totalHours: Math.round(totalHours * 10) / 10,
        status: i < 3 ? 'present' : (Math.random() > 0.9 ? 'late' : 'present'),
        notes: i < 3 && Math.random() > 0.7 ? 'Late arrival due to traffic' : null,
      })
    }
  }

  const createdAttendance = await Promise.all(
    attendanceRecords.map(attendance => prisma.attendance.create({ data: attendance }))
  )

  console.log(`✅ Created ${createdAttendance.length} attendance records`)

  // Create Timesheets
  console.log('📊 Creating timesheets...')
  const timesheets = []
  for (let week = 0; week < 4; week++) {
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - (week * 7) - weekStart.getDay())
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    
    for (const staffId of allStaffIds.slice(0, 10)) {
      const dailyHours = []
      let totalHours = 0
      
      for (let day = 0; day < 5; day++) {
        const dayDate = new Date(weekStart)
        dayDate.setDate(dayDate.getDate() + day)
        const hours = 7 + Math.random() * 1
        totalHours += hours
        dailyHours.push({
          date: dayDate.toISOString().split('T')[0],
          hours: Math.round(hours * 10) / 10,
          project: `Project ${Math.floor(Math.random() * 3) + 1}`,
          task: `Task ${Math.floor(Math.random() * 5) + 1}`,
        })
      }
      
      timesheets.push({
        staffId,
        weekStart,
        weekEnd,
        hours: dailyHours,
        totalHours: Math.round(totalHours * 10) / 10,
        status: week === 0 ? 'draft' : (week === 1 ? 'submitted' : 'approved'),
        submittedAt: week >= 1 ? new Date(weekEnd) : null,
        approvedBy: week >= 2 ? 'Lucy Appiah' : null,
        approvedAt: week >= 2 ? new Date(weekEnd.getTime() + 86400000) : null,
      })
    }
  }

  const createdTimesheets = await Promise.all(
    timesheets.map(timesheet => prisma.timesheet.create({ data: timesheet }))
  )

  console.log(`✅ Created ${createdTimesheets.length} timesheets`)

  // Create Documents
  console.log('📄 Creating documents...')
  const documents = []
  const documentTypes = ['contract', 'certificate', 'promotion', 'other']
  const categories = ['Employment', 'Training', 'Performance', 'Administrative']
  
  for (const staff of [...createdStaff, ...createdAdditionalStaff].slice(0, 15)) {
    for (let i = 0; i < 2; i++) {
      documents.push({
        staffId: staff.staffId,
        name: `${documentTypes[i % documentTypes.length]} - ${staff.firstName} ${staff.lastName}`,
        type: documentTypes[i % documentTypes.length],
        category: categories[i % categories.length],
        fileUrl: `/documents/${staff.staffId}-${i + 1}.pdf`,
        fileSize: 50000 + Math.floor(Math.random() * 200000),
        mimeType: 'application/pdf',
        uploadedBy: 'hrofficer@mofa.gov.gh',
        uploadedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        description: `Document for ${staff.firstName} ${staff.lastName}`,
        isPublic: false,
        status: 'active',
        tags: [categories[i % categories.length].toLowerCase(), staff.department.toLowerCase()],
        version: 1,
      })
    }
  }

  const createdDocuments = await Promise.all(
    documents.map(doc => prisma.document.create({ data: doc }))
  )

  console.log(`✅ Created ${createdDocuments.length} documents`)

  // Create Training Programs
  console.log('🎓 Creating training programs...')
  const trainingPrograms = [
    {
      title: 'Leadership Development Program',
      description: 'Comprehensive leadership training for senior staff',
      provider: 'Ghana Institute of Management',
      type: 'external',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-02-05'),
      location: 'Accra',
      capacity: 20,
      status: 'scheduled',
    },
    {
      title: 'Fisheries Management Best Practices',
      description: 'Training on modern fisheries management techniques',
      provider: 'MoFA Internal',
      type: 'internal',
      startDate: new Date('2024-11-15'),
      endDate: new Date('2024-11-17'),
      location: 'MoFA HQ',
      capacity: 30,
      status: 'completed',
    },
    {
      title: 'HR Management Systems',
      description: 'Training on HR policies and procedures',
      provider: 'MoFA Internal',
      type: 'internal',
      startDate: new Date('2024-12-10'),
      endDate: new Date('2024-12-12'),
      location: 'MoFA HQ',
      capacity: 25,
      status: 'completed',
    },
    {
      title: 'Data Analysis and Reporting',
      description: 'Excel and data visualization training',
      provider: 'Online Platform',
      type: 'online',
      startDate: new Date('2025-01-20'),
      endDate: new Date('2025-01-24'),
      location: null,
      capacity: 50,
      status: 'scheduled',
    },
  ]

  const createdTrainingPrograms = await Promise.all(
    trainingPrograms.map(program => prisma.trainingProgram.create({ data: program }))
  )

  console.log(`✅ Created ${createdTrainingPrograms.length} training programs`)

  // Create Training Attendance
  console.log('👥 Creating training attendance...')
  const trainingAttendance = []
  for (const program of createdTrainingPrograms) {
    const attendees = allStaffIds.slice(0, Math.min(program.capacity || 20, 15))
    for (const staffId of attendees) {
      trainingAttendance.push({
        trainingProgramId: program.id,
        staffId,
        status: program.status === 'completed' ? (Math.random() > 0.1 ? 'completed' : 'absent') : 'registered',
        certificateUrl: program.status === 'completed' && Math.random() > 0.1 ? `/certificates/${staffId}-${program.id}.pdf` : null,
        rating: program.status === 'completed' ? 3 + Math.floor(Math.random() * 3) : null,
        feedback: program.status === 'completed' && Math.random() > 0.5 ? 'Very informative and well-organized training' : null,
      })
    }
  }

  const createdTrainingAttendance = await Promise.all(
    trainingAttendance.map(attendance => prisma.trainingAttendance.create({ data: attendance }))
  )

  console.log(`✅ Created ${createdTrainingAttendance.length} training attendance records`)

  // Create Job Postings
  console.log('💼 Creating job postings...')
  const jobPostings = [
    {
      title: 'Senior Fisheries Officer',
      department: 'Fisheries Management',
      position: 'Senior Fisheries Officer',
      description: 'We are seeking an experienced Senior Fisheries Officer to join our team.',
      requirements: 'Bachelor\'s degree in Fisheries Science, 5+ years experience, strong analytical skills',
      status: 'published',
      postedBy: 'hrofficer@mofa.gov.gh',
      postedDate: new Date('2024-11-01'),
      closingDate: new Date('2025-01-15'),
    },
    {
      title: 'Research Scientist',
      department: 'Research and Development',
      position: 'Research Scientist',
      description: 'Join our research team to conduct cutting-edge fisheries research.',
      requirements: 'PhD in Marine Biology or related field, research experience, publication record',
      status: 'published',
      postedBy: 'hrofficer@mofa.gov.gh',
      postedDate: new Date('2024-12-01'),
      closingDate: new Date('2025-02-28'),
    },
    {
      title: 'HR Assistant',
      department: 'Human Resources',
      position: 'HR Assistant',
      description: 'Entry-level position in HR department.',
      requirements: 'Bachelor\'s degree in HR or related field, good communication skills',
      status: 'closed',
      postedBy: 'hrofficer@mofa.gov.gh',
      postedDate: new Date('2024-09-01'),
      closingDate: new Date('2024-10-15'),
    },
  ]

  const createdJobPostings = await Promise.all(
    jobPostings.map(posting => prisma.jobPosting.create({ data: posting }))
  )

  console.log(`✅ Created ${createdJobPostings.length} job postings`)

  // Create Candidates
  console.log('👤 Creating candidates...')
  const candidates = []
  for (const posting of createdJobPostings.slice(0, 2)) {
    for (let i = 0; i < 5; i++) {
      candidates.push({
        jobPostingId: posting.id,
        firstName: ['Kwame', 'Ama', 'Kofi', 'Akosua', 'Yaw'][i],
        lastName: ['Owusu', 'Gyasi', 'Agyeman', 'Bonsu', 'Tetteh'][i],
        email: `candidate${i + 1}@example.com`,
        phone: `+233241234${600 + i}`,
        resumeUrl: `/resumes/candidate-${posting.id}-${i + 1}.pdf`,
        coverLetter: `I am interested in the ${posting.position} position...`,
        status: i === 0 ? 'interview' : (i === 1 ? 'screening' : 'applied'),
        appliedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        notes: i === 0 ? 'Strong candidate, recommend for interview' : null,
      })
    }
  }

  const createdCandidates = await Promise.all(
    candidates.map(candidate => prisma.candidate.create({ data: candidate }))
  )

  console.log(`✅ Created ${createdCandidates.length} candidates`)

  // Create Interviews
  console.log('🤝 Creating interviews...')
  const interviews = []
  for (const candidate of createdCandidates.filter(c => c.status === 'interview')) {
    interviews.push({
      candidateId: candidate.id,
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      interviewType: 'in-person',
      interviewers: ['Lucy Appiah', 'James Adjei'],
      location: 'MoFA HQ - Conference Room A',
      notes: 'First round interview',
      status: 'scheduled',
    })
  }

  const createdInterviews = await Promise.all(
    interviews.map(interview => prisma.interview.create({ data: interview }))
  )

  console.log(`✅ Created ${createdInterviews.length} interviews`)

  // Create Salary Structures
  console.log('💰 Creating salary structures...')
  const salaryStructures = []
  
  for (const staff of [...createdStaff, ...createdAdditionalStaff]) {
    const basicSalary = gradeSalaries[staff.grade] || 50000
    salaryStructures.push({
      staffId: staff.staffId,
      basicSalary,
      allowances: {
        housing: basicSalary * 0.15,
        transport: basicSalary * 0.10,
        medical: basicSalary * 0.05,
        utility: basicSalary * 0.05,
      },
      deductions: {
        tax: basicSalary * 0.10,
        pension: basicSalary * 0.05,
        loan: 0,
      },
      effectiveDate: staff.joinDate,
      approvedBy: 'James Adjei',
      notes: 'Initial salary structure',
    })
  }

  const createdSalaryStructures = await Promise.all(
    salaryStructures.map(salary => prisma.salaryStructure.create({ data: salary }))
  )

  console.log(`✅ Created ${createdSalaryStructures.length} salary structures`)

  // Create Disciplinary Actions
  console.log('⚠️  Creating disciplinary actions...')
  const disciplinaryActions = [
    {
      staffId: allStaffIds[5],
      actionType: 'verbal_warning',
      severity: 'low',
      title: 'Late Arrival Warning',
      description: 'Multiple late arrivals without notification',
      incidentDate: new Date('2024-11-15'),
      issuedBy: 'John Amoah',
      issuedDate: new Date('2024-11-16'),
      status: 'active',
    },
    {
      staffId: allStaffIds[8],
      actionType: 'written_warning',
      severity: 'medium',
      title: 'Performance Improvement Required',
      description: 'Failure to meet performance targets for two consecutive quarters',
      incidentDate: new Date('2024-10-01'),
      issuedBy: 'Lucy Appiah',
      issuedDate: new Date('2024-10-05'),
      status: 'active',
    },
  ]

  const createdDisciplinaryActions = await Promise.all(
    disciplinaryActions.map(action => prisma.disciplinaryAction.create({ data: action }))
  )

  console.log(`✅ Created ${createdDisciplinaryActions.length} disciplinary actions`)

  // Create Onboarding Checklists
  console.log('📋 Creating onboarding checklists...')
  const onboardingChecklists = []
  for (const staff of [...createdStaff, ...createdAdditionalStaff].slice(0, 5)) {
    onboardingChecklists.push({
      staffId: staff.staffId,
      items: [
        { task: 'Complete employee profile', completed: true, completedBy: staff.firstName, completedAt: staff.joinDate.toISOString() },
        { task: 'Submit required documents', completed: true, completedBy: staff.firstName, completedAt: new Date(staff.joinDate.getTime() + 86400000).toISOString() },
        { task: 'Attend orientation session', completed: true, completedBy: 'Lucy Appiah', completedAt: new Date(staff.joinDate.getTime() + 2 * 86400000).toISOString() },
        { task: 'Set up workstation', completed: true, completedBy: 'James Adjei', completedAt: new Date(staff.joinDate.getTime() + 86400000).toISOString() },
        { task: 'Complete training modules', completed: false, completedBy: null, completedAt: null },
      ],
      status: 'in-progress',
      startedDate: staff.joinDate,
      assignedTo: 'Lucy Appiah',
    })
  }

  const createdOnboardingChecklists = await Promise.all(
    onboardingChecklists.map(checklist => prisma.onboardingChecklist.create({ data: checklist }))
  )

  console.log(`✅ Created ${createdOnboardingChecklists.length} onboarding checklists`)

  // Create System Settings
  console.log('⚙️  Creating system settings...')
  const systemSettings = [
    { key: 'organization_name', value: 'Ministry of Fisheries and Aquaculture', type: 'string', category: 'general', description: 'Organization name' },
    { key: 'max_annual_leave', value: '30', type: 'number', category: 'leave', description: 'Maximum annual leave days' },
    { key: 'leave_accrual_enabled', value: 'true', type: 'boolean', category: 'leave', description: 'Enable leave accrual' },
    { key: 'attendance_required', value: 'true', type: 'boolean', category: 'attendance', description: 'Require attendance tracking' },
    { key: 'working_hours_per_day', value: '8', type: 'number', category: 'attendance', description: 'Standard working hours per day' },
    { key: 'email_notifications_enabled', value: 'true', type: 'boolean', category: 'email', description: 'Enable email notifications' },
    { key: 'password_min_length', value: '8', type: 'number', category: 'general', description: 'Minimum password length' },
    { key: 'session_timeout_minutes', value: '30', type: 'number', category: 'general', description: 'Session timeout in minutes' },
  ]

  const createdSystemSettings = await Promise.all(
    systemSettings.map(setting => prisma.systemSettings.create({ data: setting }))
  )

  console.log(`✅ Created ${createdSystemSettings.length} system settings`)

  // Create Notifications
  console.log('🔔 Creating notifications...')
  const notifications = []
  for (const user of createdUsers.slice(0, 10)) {
    for (let i = 0; i < 3; i++) {
      notifications.push({
        userId: user.id,
        staffId: user.staffId,
        type: ['leave_approved', 'timesheet_approved', 'system'][i],
        title: ['Leave Request Approved', 'Timesheet Approved', 'System Update'][i],
        message: ['Your leave request has been approved', 'Your timesheet for last week has been approved', 'New system features available'][i],
        link: i === 0 ? '/leave' : (i === 1 ? '/timesheets' : '/dashboard'),
        read: i === 2,
        readAt: i === 2 ? new Date() : null,
        createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
      })
    }
  }

  const createdNotifications = await Promise.all(
    notifications.map(notification => prisma.notification.create({ data: notification }))
  )

  console.log(`✅ Created ${createdNotifications.length} notifications`)

  // Create Profile Change Requests
  console.log('📝 Creating profile change requests...')
  const profileChangeRequests = [
    {
      staffId: allStaffIds[2],
      section: 'personal',
      requestedChanges: 'Update phone number and address',
      currentData: { phone: '+233241234569', address: 'Old Address' },
      status: 'pending',
    },
    {
      staffId: allStaffIds[5],
      section: 'bank',
      requestedChanges: 'Update bank account details',
      currentData: { bank: 'Ghana Commercial Bank', account: '1234567890' },
      status: 'approved',
      reviewedBy: 'Lucy Appiah',
      reviewedAt: new Date('2024-11-20'),
    },
  ]

  const createdProfileChangeRequests = await Promise.all(
    profileChangeRequests.map(request => prisma.profileChangeRequest.create({ data: request }))
  )

  console.log(`✅ Created ${createdProfileChangeRequests.length} profile change requests`)

  // Create Approval Delegations
  console.log('🔄 Creating approval delegations...')
  const approvalDelegations = [
    {
      delegatorId: allStaffIds[0], // John Amoah
      delegateeId: allStaffIds[8], // Another staff member
      startDate: new Date('2024-12-20'),
      endDate: new Date('2025-01-05'),
      leaveTypes: ['Annual', 'Sick'],
      status: 'active',
      notes: 'Holiday delegation',
    },
  ]

  const createdApprovalDelegations = await Promise.all(
    approvalDelegations.map(delegation => prisma.approvalDelegation.create({ data: delegation }))
  )

  console.log(`✅ Created ${createdApprovalDelegations.length} approval delegations`)

  // Create Leave Accrual History
  console.log('📈 Creating leave accrual history...')
  const leaveAccrualHistory = []
  for (const balance of [...createdBalances, ...createdAdditionalBalances].slice(0, 10)) {
    for (let month = 0; month < 6; month++) {
      const accrualDate = new Date('2024-07-01')
      accrualDate.setMonth(accrualDate.getMonth() + month)
      
      leaveAccrualHistory.push({
        staffId: balance.staffId,
        leaveType: 'Annual',
        accrualDate,
        accrualPeriod: 'monthly',
        daysAccrued: 2.5,
        daysBefore: balance.annual - (6 - month) * 2.5,
        daysAfter: balance.annual - (5 - month) * 2.5,
        processedBy: 'system',
        notes: 'Monthly accrual',
      })
    }
  }

  const createdLeaveAccrualHistory = await Promise.all(
    leaveAccrualHistory.map(history => prisma.leaveAccrualHistory.create({ data: history }))
  )

  console.log(`✅ Created ${createdLeaveAccrualHistory.length} leave accrual history records`)

  console.log('✨ Seed completed successfully!')
  console.log(`\n📊 Comprehensive Seed Summary:`)
  console.log(`   - Staff Members: ${createdStaff.length + createdAdditionalStaff.length}`)
  console.log(`   - Leave Policies: ${createdPolicies.length}`)
  console.log(`   - Leave Balances: ${createdBalances.length + createdAdditionalBalances.length}`)
  console.log(`   - Holidays: ${createdHolidays.length}`)
  console.log(`   - Leave Templates: ${createdTemplates.length}`)
  console.log(`   - Leave Requests: ${createdLeaves.length}`)
  console.log(`   - Leave Accrual History: ${createdLeaveAccrualHistory.length}`)
  console.log(`   - Payslips: ${createdPayslips.length + createdAdditionalPayslips.length}`)
  console.log(`   - Approval Steps: ${createdApprovalSteps.length}`)
  console.log(`   - Leave Approval History: ${createdLeaveApprovalHistory.length}`)
  console.log(`   - Performance Reviews: ${createdReviews.length}`)
  console.log(`   - Audit Logs: ${createdAuditLogs.length}`)
  console.log(`   - User Accounts: ${createdUsers.length}`)
  console.log(`   - Attendance Records: ${createdAttendance.length}`)
  console.log(`   - Timesheets: ${createdTimesheets.length}`)
  console.log(`   - Documents: ${createdDocuments.length}`)
  console.log(`   - Training Programs: ${createdTrainingPrograms.length}`)
  console.log(`   - Training Attendance: ${createdTrainingAttendance.length}`)
  console.log(`   - Job Postings: ${createdJobPostings.length}`)
  console.log(`   - Candidates: ${createdCandidates.length}`)
  console.log(`   - Interviews: ${createdInterviews.length}`)
  console.log(`   - Salary Structures: ${createdSalaryStructures.length}`)
  console.log(`   - Disciplinary Actions: ${createdDisciplinaryActions.length}`)
  console.log(`   - Onboarding Checklists: ${createdOnboardingChecklists.length}`)
  console.log(`   - System Settings: ${createdSystemSettings.length}`)
  console.log(`   - Notifications: ${createdNotifications.length}`)
  console.log(`   - Profile Change Requests: ${createdProfileChangeRequests.length}`)
  console.log(`   - Approval Delegations: ${createdApprovalDelegations.length}`)
  const totalRecords = 
    createdStaff.length + createdAdditionalStaff.length +
    createdPolicies.length +
    createdBalances.length + createdAdditionalBalances.length +
    createdHolidays.length +
    createdTemplates.length +
    createdLeaves.length +
    createdApprovalSteps.length +
    createdLeaveApprovalHistory.length +
    createdLeaveAccrualHistory.length +
    createdPayslips.length + createdAdditionalPayslips.length +
    createdReviews.length +
    createdAuditLogs.length +
    createdUsers.length +
    createdAttendance.length +
    createdTimesheets.length +
    createdDocuments.length +
    createdTrainingPrograms.length +
    createdTrainingAttendance.length +
    createdJobPostings.length +
    createdCandidates.length +
    createdInterviews.length +
    createdSalaryStructures.length +
    createdDisciplinaryActions.length +
    createdOnboardingChecklists.length +
    createdSystemSettings.length +
    createdNotifications.length +
    createdProfileChangeRequests.length +
    createdApprovalDelegations.length

  console.log(`\n🎉 Total Records Created: ${totalRecords}`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

