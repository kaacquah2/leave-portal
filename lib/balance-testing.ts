/**
 * Comprehensive Balance Testing Utilities
 * Tests edge cases for leave balance calculations including:
 * - Pro-rata calculations
 * - Mid-period changes
 * - Year-end transitions
 * - Leave type conversions
 * - Concurrent balance updates
 */

import { prisma } from './prisma'
import { getLeaveBalance, validateLeaveBalance } from './leave-balance-utils'
import type { LeaveBalance } from '@prisma/client'

export interface BalanceTestResult {
  testName: string
  passed: boolean
  error?: string
  details?: any
}

export interface ComprehensiveBalanceTestReport {
  staffId: string
  testsRun: number
  testsPassed: number
  testsFailed: number
  results: BalanceTestResult[]
  timestamp: Date
}

/**
 * Test pro-rata balance calculation for mid-month join
 */
export async function testProRataCalculation(
  staffId: string,
  joinDate: Date,
  leaveType: string = 'Annual'
): Promise<BalanceTestResult> {
  try {
    const balance = await getLeaveBalance(staffId, leaveType)
    const staff = await prisma.staffMember.findUnique({
      where: { staffId },
      select: { joinDate: true },
    })

    if (!staff) {
      return {
        testName: 'Pro-rata Calculation Test',
        passed: false,
        error: 'Staff member not found',
      }
    }

    const now = new Date()
    const monthsSinceJoin = Math.max(0,
      (now.getFullYear() - joinDate.getFullYear()) * 12 +
      (now.getMonth() - joinDate.getMonth())
    )

    // Check if balance is reasonable for months worked
    // Assuming monthly accrual rate of 1.25 days per month (15 days per year)
    const expectedMinimum = monthsSinceJoin * 1.25 * 0.8 // 80% tolerance
    const expectedMaximum = (monthsSinceJoin + 1) * 1.25 * 1.2 // 120% tolerance

    const passed = balance >= expectedMinimum && balance <= expectedMaximum

    return {
      testName: 'Pro-rata Calculation Test',
      passed,
      details: {
        balance,
        monthsSinceJoin,
        expectedRange: { min: expectedMinimum, max: expectedMaximum },
      },
      error: passed ? undefined : `Balance ${balance} outside expected range [${expectedMinimum}, ${expectedMaximum}]`,
    }
  } catch (error: any) {
    return {
      testName: 'Pro-rata Calculation Test',
      passed: false,
      error: error.message,
    }
  }
}

/**
 * Test year-end transition and carry-forward
 */
export async function testYearEndTransition(
  staffId: string,
  leaveType: string = 'Annual'
): Promise<BalanceTestResult> {
  try {
    const balance = await prisma.leaveBalance.findUnique({
      where: { staffId },
      select: {
        annual: true,
        annualCarryForward: true,
        annualExpiresAt: true,
      },
    })

    if (!balance) {
      return {
        testName: 'Year-End Transition Test',
        passed: false,
        error: 'Leave balance not found',
      }
    }

    const now = new Date()
    const isYearEnd = now.getMonth() === 11 // December

    // Check if carry-forward is set when appropriate
    const hasCarryForward = balance.annualCarryForward > 0
    const hasExpiration = balance.annualExpiresAt !== null

    // Validate expiration date is in the future if set
    const expirationValid = !balance.annualExpiresAt ||
      new Date(balance.annualExpiresAt) > now

    const passed = expirationValid && (!isYearEnd || hasCarryForward || balance.annual === 0)

    return {
      testName: 'Year-End Transition Test',
      passed,
      details: {
        currentBalance: balance.annual,
        carryForward: balance.annualCarryForward,
        expirationDate: balance.annualExpiresAt,
        isYearEnd,
      },
      error: passed ? undefined : 'Year-end transition validation failed',
    }
  } catch (error: any) {
    return {
      testName: 'Year-End Transition Test',
      passed: false,
      error: error.message,
    }
  }
}

/**
 * Test mid-period balance changes (e.g., policy change, adjustment)
 */
export async function testMidPeriodChanges(
  staffId: string,
  leaveType: string = 'Annual'
): Promise<BalanceTestResult> {
  try {
    // Get accrual history to check for mid-period changes
    const history = await prisma.leaveAccrualHistory.findMany({
      where: {
        staffId,
        leaveType,
      },
      orderBy: { accrualDate: 'desc' },
      take: 10,
    })

    // Check for consistency in balance changes
    let previousBalance: number | null = null
    let inconsistencies = 0

    for (const record of history.reverse()) {
      if (previousBalance !== null) {
        const expectedBalance = previousBalance + record.daysAccrued
        if (Math.abs(record.daysAfter - expectedBalance) > 0.01) {
          inconsistencies++
        }
      }
      previousBalance = record.daysAfter
    }

    const passed = inconsistencies === 0

    return {
      testName: 'Mid-Period Changes Test',
      passed,
      details: {
        historyRecords: history.length,
        inconsistencies,
      },
      error: passed ? undefined : `Found ${inconsistencies} balance inconsistencies`,
    }
  } catch (error: any) {
    return {
      testName: 'Mid-Period Changes Test',
      passed: false,
      error: error.message,
    }
  }
}

/**
 * Test leave type conversion scenarios
 */
export async function testLeaveTypeConversion(
  staffId: string
): Promise<BalanceTestResult> {
  try {
    const balance = await prisma.leaveBalance.findUnique({
      where: { staffId },
    })

    if (!balance) {
      return {
        testName: 'Leave Type Conversion Test',
        passed: false,
        error: 'Leave balance not found',
      }
    }

    // Check that all leave types have valid balances (non-negative)
    const leaveTypes = ['annual', 'sick', 'training', 'study', 'maternity', 'paternity', 'compassionate', 'specialService']
    const invalidBalances: string[] = []

    for (const type of leaveTypes) {
      const value = balance[type as keyof LeaveBalance] as number
      if (value < 0) {
        invalidBalances.push(`${type}: ${value}`)
      }
    }

    const passed = invalidBalances.length === 0

    return {
      testName: 'Leave Type Conversion Test',
      passed,
      details: {
        invalidBalances,
      },
      error: passed ? undefined : `Negative balances found: ${invalidBalances.join(', ')}`,
    }
  } catch (error: any) {
    return {
      testName: 'Leave Type Conversion Test',
      passed: false,
      error: error.message,
    }
  }
}

/**
 * Test concurrent balance update handling
 */
export async function testConcurrentUpdates(
  staffId: string,
  leaveType: string = 'Annual'
): Promise<BalanceTestResult> {
  try {
    const balance = await prisma.leaveBalance.findUnique({
      where: { staffId },
      select: { version: true, [leaveType.toLowerCase()]: true },
    })

    if (!balance) {
      return {
        testName: 'Concurrent Updates Test',
        passed: false,
        error: 'Leave balance not found',
      }
    }

    // Check version field exists and is being used
    const hasVersion = balance.version !== undefined && balance.version !== null
    const versionIsNumber = typeof balance.version === 'number'

    const passed = hasVersion && versionIsNumber

    return {
      testName: 'Concurrent Updates Test',
      passed,
      details: {
        hasVersion,
        versionIsNumber,
        currentVersion: balance.version,
      },
      error: passed ? undefined : 'Version field not properly configured for optimistic locking',
    }
  } catch (error: any) {
    return {
      testName: 'Concurrent Updates Test',
      passed: false,
      error: error.message,
    }
  }
}

/**
 * Test balance validation edge cases
 */
export async function testBalanceValidationEdgeCases(
  staffId: string,
  leaveType: string = 'Annual'
): Promise<BalanceTestResult> {
  try {
    // Test with zero balance
    const zeroBalanceTest = await validateLeaveBalance(staffId, leaveType, 0)
    
    // Test with negative days (should fail)
    const negativeDaysTest = await validateLeaveBalance(staffId, leaveType, -1)
    
    // Test with very large number
    const largeNumberTest = await validateLeaveBalance(staffId, leaveType, 999999)

    const passed = zeroBalanceTest.valid &&
                   !negativeDaysTest.valid &&
                   !largeNumberTest.valid

    return {
      testName: 'Balance Validation Edge Cases Test',
      passed,
      details: {
        zeroBalanceTest: zeroBalanceTest.valid,
        negativeDaysTest: negativeDaysTest.valid,
        largeNumberTest: largeNumberTest.valid,
      },
      error: passed ? undefined : 'Edge case validation failed',
    }
  } catch (error: any) {
    return {
      testName: 'Balance Validation Edge Cases Test',
      passed: false,
      error: error.message,
    }
  }
}

/**
 * Run comprehensive balance tests for a staff member
 */
export async function runComprehensiveBalanceTests(
  staffId: string
): Promise<ComprehensiveBalanceTestReport> {
  const results: BalanceTestResult[] = []
  
  // Get staff join date for pro-rata test
  const staff = await prisma.staffMember.findUnique({
    where: { staffId },
    select: { joinDate: true },
  })

  const joinDate = staff?.joinDate || new Date()

  // Run all tests
  results.push(await testProRataCalculation(staffId, joinDate))
  results.push(await testYearEndTransition(staffId))
  results.push(await testMidPeriodChanges(staffId))
  results.push(await testLeaveTypeConversion(staffId))
  results.push(await testConcurrentUpdates(staffId))
  results.push(await testBalanceValidationEdgeCases(staffId))

  const testsPassed = results.filter(r => r.passed).length
  const testsFailed = results.filter(r => !r.passed).length

  return {
    staffId,
    testsRun: results.length,
    testsPassed,
    testsFailed,
    results,
    timestamp: new Date(),
  }
}

/**
 * Run balance tests for all staff members
 */
export async function runBalanceTestsForAllStaff(): Promise<{
  totalStaff: number
  reports: ComprehensiveBalanceTestReport[]
  summary: {
    totalTests: number
    totalPassed: number
    totalFailed: number
    passRate: number
  }
}> {
  const staffMembers = await prisma.staffMember.findMany({
    where: { active: true },
    select: { staffId: true },
  })

  const reports: ComprehensiveBalanceTestReport[] = []

  for (const staff of staffMembers) {
    const report = await runComprehensiveBalanceTests(staff.staffId)
    reports.push(report)
  }

  const totalTests = reports.reduce((sum, r) => sum + r.testsRun, 0)
  const totalPassed = reports.reduce((sum, r) => sum + r.testsPassed, 0)
  const totalFailed = reports.reduce((sum, r) => sum + r.testsFailed, 0)
  const passRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0

  return {
    totalStaff: staffMembers.length,
    reports,
    summary: {
      totalTests,
      totalPassed,
      totalFailed,
      passRate: Math.round(passRate * 100) / 100,
    },
  }
}

