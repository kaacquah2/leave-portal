import { prisma } from '@/lib/prisma'

interface AccrualResult {
  staffId: string
  leaveType: string
  daysAccrued: number
  daysBefore: number
  daysAfter: number
  proRataFactor?: number
  carryForwardDays?: number
  expiredDays?: number
  notes?: string
}

interface AccrualOptions {
  accrualDate?: Date
  staffIds?: string[]
  leaveTypes?: string[]
  processExpiration?: boolean
  processCarryForward?: boolean
  processedBy?: string
}

/**
 * Calculate pro-rata factor for a staff member based on their join date
 * Returns a factor between 0 and 1 representing the portion of the accrual period
 */
function calculateProRataFactor(
  joinDate: Date,
  accrualDate: Date,
  accrualFrequency: 'monthly' | 'annual' | 'quarterly'
): number {
  const now = accrualDate || new Date()
  
  if (accrualFrequency === 'monthly') {
    // For monthly accrual, calculate days worked in the month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    // If joined during this month, calculate pro-rata
    if (joinDate >= monthStart && joinDate <= monthEnd) {
      const daysInMonth = monthEnd.getDate()
      const daysWorked = Math.max(1, Math.ceil((monthEnd.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      return daysWorked / daysInMonth
    }
    return 1.0
  } else if (accrualFrequency === 'annual') {
    // For annual accrual, calculate months worked in the year
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const yearEnd = new Date(now.getFullYear(), 11, 31)
    
    if (joinDate >= yearStart && joinDate <= yearEnd) {
      const monthsInYear = 12
      const monthsWorked = Math.max(1, (now.getMonth() - joinDate.getMonth()) + 1)
      return monthsWorked / monthsInYear
    }
    return 1.0
  } else if (accrualFrequency === 'quarterly') {
    // For quarterly accrual, calculate months worked in the quarter
    const quarter = Math.floor(now.getMonth() / 3)
    const quarterStart = new Date(now.getFullYear(), quarter * 3, 1)
    const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0)
    
    if (joinDate >= quarterStart && joinDate <= quarterEnd) {
      const monthsInQuarter = 3
      const monthsWorked = Math.max(1, (now.getMonth() - joinDate.getMonth()) + 1)
      return monthsWorked / monthsInQuarter
    }
    return 1.0
  }
  
  return 1.0
}

/**
 * Process carry-forward for a leave type based on policy
 */
function processCarryForward(
  currentBalance: number,
  policy: { carryoverAllowed: boolean; maxCarryover: number }
): { carryForwardDays: number; newBalance: number } {
  if (!policy.carryoverAllowed || policy.maxCarryover === 0) {
    return { carryForwardDays: 0, newBalance: currentBalance }
  }
  
  // Calculate how much can be carried forward
  const carryForwardDays = Math.min(currentBalance, policy.maxCarryover)
  const newBalance = currentBalance - carryForwardDays
  
  return { carryForwardDays, newBalance }
}

/**
 * Process expiration for a leave type
 */
function processExpiration(
  currentBalance: number,
  expiresAt: Date | null,
  accrualDate: Date
): { expiredDays: number; newBalance: number } {
  if (!expiresAt || expiresAt > accrualDate) {
    return { expiredDays: 0, newBalance: currentBalance }
  }
  
  // All unused leave expires
  const expiredDays = currentBalance
  return { expiredDays, newBalance: 0 }
}

/**
 * Get the balance field name for a leave type
 */
function getBalanceFieldName(leaveType: string): string {
  const mapping: Record<string, string> = {
    'Annual': 'annual',
    'Sick': 'sick',
    'Unpaid': 'unpaid',
    'Special Service': 'specialService',
    'Training': 'training',
    'Study': 'study',
    'Maternity': 'maternity',
    'Paternity': 'paternity',
    'Compassionate': 'compassionate',
  }
  return mapping[leaveType] || leaveType.toLowerCase()
}

/**
 * Get the carry-forward field name for a leave type
 */
function getCarryForwardFieldName(leaveType: string): string {
  const mapping: Record<string, string> = {
    'Annual': 'annualCarryForward',
    'Sick': 'sickCarryForward',
    'Special Service': 'specialServiceCarryForward',
    'Training': 'trainingCarryForward',
    'Study': 'studyCarryForward',
  }
  return mapping[leaveType] || ''
}

/**
 * Get the expiration field name for a leave type
 */
function getExpirationFieldName(leaveType: string): string {
  const mapping: Record<string, string> = {
    'Annual': 'annualExpiresAt',
    'Sick': 'sickExpiresAt',
    'Special Service': 'specialServiceExpiresAt',
    'Training': 'trainingExpiresAt',
    'Study': 'studyExpiresAt',
  }
  return mapping[leaveType] || ''
}

/**
 * Process accrual for a single staff member and leave type
 */
async function processAccrualForStaff(
  staffId: string,
  leaveType: string,
  policy: any,
  staffMember: any,
  balance: any,
  options: AccrualOptions
): Promise<AccrualResult | null> {
  const accrualDate = options.accrualDate || new Date()
  const balanceField = getBalanceFieldName(leaveType)
  const currentBalance = balance[balanceField] || 0
  
  // Skip if policy is not active
  if (!policy.active) {
    return null
  }
  
  // Calculate accrual based on frequency
  let daysToAccrue = 0
  let proRataFactor = 1.0
  let accrualPeriod = policy.accrualFrequency || 'monthly'
  
  if (policy.accrualFrequency === 'monthly') {
    daysToAccrue = policy.accrualRate
    // Calculate pro-rata if staff joined during the accrual period
    proRataFactor = calculateProRataFactor(staffMember.joinDate, accrualDate, 'monthly')
    daysToAccrue = daysToAccrue * proRataFactor
  } else if (policy.accrualFrequency === 'annual') {
    // For annual, check if it's the accrual month (typically January or join anniversary)
    const isAccrualMonth = accrualDate.getMonth() === 0 || // January
      (accrualDate.getMonth() === new Date(staffMember.joinDate).getMonth() &&
       accrualDate.getDate() >= new Date(staffMember.joinDate).getDate())
    
    if (isAccrualMonth) {
      daysToAccrue = policy.accrualRate * 12 // Annual accrual
      proRataFactor = calculateProRataFactor(staffMember.joinDate, accrualDate, 'annual')
      daysToAccrue = daysToAccrue * proRataFactor
    } else {
      return null // Not the accrual month
    }
  } else if (policy.accrualFrequency === 'quarterly') {
    const quarter = Math.floor(accrualDate.getMonth() / 3)
    const isQuarterStart = accrualDate.getDate() <= 7 && [0, 3, 6, 9].includes(accrualDate.getMonth())
    
    if (isQuarterStart) {
      daysToAccrue = policy.accrualRate * 3 // Quarterly accrual
      proRataFactor = calculateProRataFactor(staffMember.joinDate, accrualDate, 'quarterly')
      daysToAccrue = daysToAccrue * proRataFactor
    } else {
      return null // Not the accrual period
    }
  }
  
  // Round to 2 decimal places
  daysToAccrue = Math.round(daysToAccrue * 100) / 100
  
  // Process expiration if enabled
  let expiredDays = 0
  let newBalance = currentBalance
  const expirationField = getExpirationFieldName(leaveType)
  
  if (options.processExpiration && policy.expiresAfterMonths && expirationField) {
    const expiresAt = balance[expirationField]
    const expirationResult = processExpiration(currentBalance, expiresAt, accrualDate)
    expiredDays = expirationResult.expiredDays
    newBalance = expirationResult.newBalance
  }
  
  // Process carry-forward if enabled (typically at year-end)
  let carryForwardDays = 0
  if (options.processCarryForward && policy.carryoverAllowed) {
    const carryForwardResult = processCarryForward(newBalance, policy)
    carryForwardDays = carryForwardResult.carryForwardDays
    newBalance = carryForwardResult.newBalance
  }
  
  // Add new accrual
  const daysBefore = newBalance
  newBalance = newBalance + daysToAccrue
  
  // Enforce max days limit
  if (newBalance > policy.maxDays) {
    const excess = newBalance - policy.maxDays
    newBalance = policy.maxDays
    daysToAccrue = daysToAccrue - excess
  }
  
  const daysAfter = newBalance
  
  // Update balance in database
  const updateData: any = {
    [balanceField]: daysAfter,
    lastAccrualDate: accrualDate,
    accrualPeriod: accrualPeriod,
  }
  
  // Update carry-forward if applicable
  if (carryForwardDays > 0) {
    const carryForwardField = getCarryForwardFieldName(leaveType)
    if (carryForwardField) {
      updateData[carryForwardField] = (balance[carryForwardField] || 0) + carryForwardDays
    }
  }
  
  // Set expiration date if policy has expiration
  if (policy.expiresAfterMonths && expirationField) {
    const expirationDate = new Date(accrualDate)
    expirationDate.setMonth(expirationDate.getMonth() + policy.expiresAfterMonths)
    updateData[expirationField] = expirationDate
  }
  
  await prisma.leaveBalance.update({
    where: { staffId },
    data: updateData,
  })
  
  // Create accrual history record
  await (prisma as any).leaveAccrualHistory.create({
    data: {
      staffId,
      leaveType,
      accrualDate,
      accrualPeriod: accrualPeriod,
      daysAccrued: daysToAccrue,
      daysBefore,
      daysAfter,
      proRataFactor: proRataFactor < 1.0 ? proRataFactor : null,
      carryForwardDays: carryForwardDays > 0 ? carryForwardDays : null,
      expiredDays: expiredDays > 0 ? expiredDays : null,
      notes: options.processExpiration && expiredDays > 0
        ? `${expiredDays} days expired`
        : options.processCarryForward && carryForwardDays > 0
        ? `${carryForwardDays} days carried forward`
        : proRataFactor < 1.0
        ? `Pro-rata accrual (${Math.round(proRataFactor * 100)}%)`
        : null,
      processedBy: options.processedBy || 'system',
    },
  })
  
  return {
    staffId,
    leaveType,
    daysAccrued: daysToAccrue,
    daysBefore,
    daysAfter,
    proRataFactor: proRataFactor < 1.0 ? proRataFactor : undefined,
    carryForwardDays: carryForwardDays > 0 ? carryForwardDays : undefined,
    expiredDays: expiredDays > 0 ? expiredDays : undefined,
    notes: options.processExpiration && expiredDays > 0
      ? `${expiredDays} days expired`
      : options.processCarryForward && carryForwardDays > 0
      ? `${carryForwardDays} days carried forward`
      : undefined,
  }
}

/**
 * Process accrual for all staff members or specific staff
 */
export async function processLeaveAccrual(options: AccrualOptions = {}): Promise<{
  success: boolean
  processed: number
  results: AccrualResult[]
  errors: Array<{ staffId: string; error: string }>
}> {
  const accrualDate = options.accrualDate || new Date()
  const results: AccrualResult[] = []
  const errors: Array<{ staffId: string; error: string }> = []
  
  try {
    // Get active staff members
    const staffWhere: any = {
      active: true,
      employmentStatus: 'active',
    }
    
    if (options.staffIds && options.staffIds.length > 0) {
      staffWhere.staffId = { in: options.staffIds }
    }
    
    const staffMembers = await prisma.staffMember.findMany({
      where: staffWhere,
      include: {
        leaveBalance: true,
      },
    })
    
    // Get active leave policies
    const policyWhere: any = {
      active: true,
    }
    
    if (options.leaveTypes && options.leaveTypes.length > 0) {
      policyWhere.leaveType = { in: options.leaveTypes }
    }
    
    const policies = await prisma.leavePolicy.findMany({
      where: policyWhere,
    })
    
    // Process accrual for each staff member and policy
    for (const staff of staffMembers) {
      // Ensure balance exists
      let balance = staff.leaveBalance
      if (!balance) {
        balance = await prisma.leaveBalance.create({
          data: {
            staffId: staff.staffId,
          },
        })
      }
      
      for (const policy of policies) {
        try {
          const result = await processAccrualForStaff(
            staff.staffId,
            policy.leaveType,
            policy,
            staff,
            balance,
            options
          )
          
          if (result) {
            results.push(result)
          }
        } catch (error: any) {
          errors.push({
            staffId: staff.staffId,
            error: error.message || 'Unknown error',
          })
        }
      }
    }
    
    return {
      success: errors.length === 0,
      processed: results.length,
      results,
      errors,
    }
  } catch (error: any) {
    console.error('Error processing leave accrual:', error)
    return {
      success: false,
      processed: results.length,
      results,
      errors: [{ staffId: 'all', error: error.message || 'Unknown error' }],
    }
  }
}

/**
 * Process expiration for all staff members
 */
export async function processLeaveExpiration(accrualDate?: Date): Promise<{
  success: boolean
  processed: number
  expired: number
  errors: Array<{ staffId: string; error: string }>
}> {
  const date = accrualDate || new Date()
  let processed = 0
  let expired = 0
  const errors: Array<{ staffId: string; error: string }> = []
  
  try {
    const balances = await prisma.leaveBalance.findMany({
      include: {
        staff: true,
      },
    })
    
    const policies = await prisma.leavePolicy.findMany({
      where: { active: true },
    })
    
    for (const balance of balances) {
      for (const policy of policies) {
        if (!(policy as any).expiresAfterMonths) continue
        
        const expirationField = getExpirationFieldName(policy.leaveType)
        if (!expirationField) continue
        
        const expiresAt = balance[expirationField as keyof typeof balance] as Date | null
        if (!expiresAt || expiresAt > date) continue
        
        const balanceField = getBalanceFieldName(policy.leaveType)
        const currentBalance = balance[balanceField as keyof typeof balance] as number || 0
        
        if (currentBalance > 0) {
          try {
            // Expire the leave
            await prisma.leaveBalance.update({
              where: { staffId: balance.staffId },
              data: {
                [balanceField]: 0,
              },
            })
            
            // Record in history
            await (prisma as any).leaveAccrualHistory.create({
              data: {
                staffId: balance.staffId,
                leaveType: policy.leaveType,
                accrualDate: date,
                accrualPeriod: 'expiration',
                daysAccrued: -currentBalance,
                daysBefore: currentBalance,
                daysAfter: 0,
                expiredDays: currentBalance,
                notes: `${currentBalance} days expired`,
                processedBy: 'system',
                proRataFactor: null,
                carryForwardDays: null,
              },
            })
            
            expired += currentBalance
            processed++
          } catch (error: any) {
            errors.push({
              staffId: balance.staffId,
              error: error.message || 'Unknown error',
            })
          }
        }
      }
    }
    
    return {
      success: errors.length === 0,
      processed,
      expired,
      errors,
    }
  } catch (error: any) {
    console.error('Error processing leave expiration:', error)
    return {
      success: false,
      processed,
      expired,
      errors: [{ staffId: 'all', error: error.message || 'Unknown error' }],
    }
  }
}

