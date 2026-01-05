/**
 * Government HR Leave Rules
 * Handles carry-forward, forfeiture, and year-end processing
 */

import { prisma } from './prisma'

export interface LeaveCarryForwardResult {
  leaveType: string
  currentBalance: number
  carryForwardDays: number
  forfeitedDays: number
  newBalance: number
}

export interface YearEndProcessingResult {
  staffId: string
  results: LeaveCarryForwardResult[]
  processedAt: Date
}

/**
 * Calculate carry-forward for a leave type based on policy
 * Checks for approved deferments that allow additional carry-forward
 */
export async function calculateCarryForward(
  staffId: string,
  leaveType: string,
  currentBalance: number
): Promise<LeaveCarryForwardResult> {
  // Get leave policy
  const policy = await prisma.leavePolicy.findFirst({
    where: {
      leaveType,
      active: true,
    },
  })

  if (!policy) {
    return {
      leaveType,
      currentBalance,
      carryForwardDays: 0,
      forfeitedDays: currentBalance,
      newBalance: 0,
    }
  }

  // Check for approved deferment requests for this leave type
  const approvedDeferment = await prisma.leaveDefermentRequest.findFirst({
    where: {
      staffId,
      leaveType,
      status: 'approved',
    },
    orderBy: {
      approvedAt: 'desc',
    },
  })

  let carryForwardDays = 0
  let forfeitedDays = 0
  let maxCarryover = policy.maxCarryover || 0

  // If there's an approved deferment, the deferred days can be carried forward
  // in addition to the normal maxCarryover limit
  if (approvedDeferment && approvedDeferment.approvedAt) {
    // Deferred days are in addition to normal carry-forward
    // The system flags this leave as "Deferred by Authority"
    maxCarryover = maxCarryover + approvedDeferment.unusedDays
  }

  if (policy.carryoverAllowed && currentBalance > 0) {
    // Calculate carry-forward (up to maxCarryover, which may include deferred days)
    carryForwardDays = Math.min(currentBalance, maxCarryover)
    forfeitedDays = Math.max(0, currentBalance - carryForwardDays)
  } else {
    // No carry-forward allowed, all unused leave is forfeited
    forfeitedDays = currentBalance
  }

  return {
    leaveType,
    currentBalance,
    carryForwardDays,
    forfeitedDays,
    newBalance: carryForwardDays, // New balance is only the carried forward amount
  }
}

/**
 * Process year-end leave for a staff member
 */
export async function processYearEndLeave(staffId: string): Promise<YearEndProcessingResult> {
  const balance = await prisma.leaveBalance.findUnique({
    where: { staffId },
  })

  if (!balance) {
    // Skip staff without leave balance instead of throwing error
    // This can happen for system accounts or newly created staff
    console.warn(`[Year-End] Leave balance not found for staff ${staffId}, skipping...`)
    return {
      staffId,
      results: [],
      processedAt: new Date(),
    }
  }

  const results: LeaveCarryForwardResult[] = []
  const leaveTypes = ['annual', 'sick', 'specialService', 'training', 'study']

  // Process each leave type that allows carry-forward
  for (const leaveType of leaveTypes) {
    const currentBalance = balance[leaveType as keyof typeof balance] as number
    if (currentBalance > 0) {
      const result = await calculateCarryForward(staffId, leaveType.charAt(0).toUpperCase() + leaveType.slice(1), currentBalance)
      results.push(result)

      // Update balance
      await prisma.leaveBalance.update({
        where: { staffId },
        data: {
          [leaveType]: result.newBalance,
          [`${leaveType}CarryForward`]: result.carryForwardDays,
        },
      })

      // Create accrual history record
      if (result.carryForwardDays > 0 || result.forfeitedDays > 0) {
        await prisma.leaveAccrualHistory.create({
          data: {
            staffId,
            leaveType: result.leaveType,
            accrualDate: new Date(),
            accrualPeriod: 'year-end',
            daysAccrued: -result.forfeitedDays, // Negative for forfeited
            daysBefore: result.currentBalance,
            daysAfter: result.newBalance,
            carryForwardDays: result.carryForwardDays,
            expiredDays: result.forfeitedDays,
            notes: `Year-end processing: ${result.carryForwardDays} days carried forward, ${result.forfeitedDays} days forfeited`,
            processedBy: 'system',
          },
        })
      }
    }
  }

  return {
    staffId,
    results,
    processedAt: new Date(),
  }
}

/**
 * Process year-end leave for all staff
 */
export async function processYearEndForAllStaff(): Promise<YearEndProcessingResult[]> {
  const allStaff = await prisma.staffMember.findMany({
    where: { active: true },
    select: { staffId: true },
  })

  const results: YearEndProcessingResult[] = []

  for (const staff of allStaff) {
    try {
      const result = await processYearEndLeave(staff.staffId)
      results.push(result)
    } catch (error) {
      console.error(`Error processing year-end leave for ${staff.staffId}:`, error)
    }
  }

  return results
}

/**
 * Check if leave has expired based on policy
 */
export async function checkLeaveExpiration(staffId: string, leaveType: string): Promise<{
  expired: boolean
  expiredDays: number
  expiresAt: Date | null
}> {
  const balance = await prisma.leaveBalance.findUnique({
    where: { staffId },
  })

  const policy = await prisma.leavePolicy.findFirst({
    where: {
      leaveType,
      active: true,
    },
  })

  if (!balance || !policy || !policy.expiresAfterMonths) {
    return { expired: false, expiredDays: 0, expiresAt: null }
  }

  const expirationField = `${leaveType.toLowerCase()}ExpiresAt` as keyof typeof balance
  const expiresAt = balance[expirationField] as Date | null

  if (!expiresAt) {
    return { expired: false, expiredDays: 0, expiresAt: null }
  }

  const now = new Date()
  const expired = now > expiresAt
  const currentBalance = balance[leaveType.toLowerCase() as keyof typeof balance] as number

  return {
    expired,
    expiredDays: expired ? currentBalance : 0,
    expiresAt,
  }
}

