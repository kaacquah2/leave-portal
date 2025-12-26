/**
 * Payroll Calculator with Leave Integration
 * Handles automatic leave deduction, tax calculation, and benefits
 */

export interface LeaveDeduction {
  leaveType: string
  days: number
  startDate: Date
  endDate: Date
  isUnpaid: boolean
  deductionAmount: number
}

export interface PayrollCalculation {
  staffId: string
  period: string // YYYY-MM
  month: number
  year: number
  basicSalary: number
  allowances: number
  deductions: number
  leaveDeductions: LeaveDeduction[]
  totalLeaveDeduction: number
  grossSalary: number // Basic + Allowances
  taxableIncome: number // Gross - Leave deductions (if applicable)
  tax: number
  pension: number
  otherDeductions: number
  netSalary: number
  workingDays: number
  leaveDays: number
  paidDays: number
  benefits: BenefitsCalculation
}

export interface BenefitsCalculation {
  healthInsurance: number
  lifeInsurance: number
  providentFund: number
  otherBenefits: number
  totalBenefits: number
}

export interface TaxBracket {
  min: number
  max?: number
  rate: number
}

/**
 * Calculate payroll with leave deductions
 */
export function calculatePayroll(params: {
  staffId: string
  period: string
  month: number
  year: number
  basicSalary: number
  allowances: Record<string, number>
  deductions: Record<string, number>
  leaveDays: number
  workingDays: number
  leaveDeductions: LeaveDeduction[]
  taxBrackets?: TaxBracket[]
  pensionRate?: number
  benefitsConfig?: {
    healthInsuranceRate?: number
    lifeInsuranceRate?: number
    providentFundRate?: number
  }
}): PayrollCalculation {
  const {
    staffId,
    period,
    month,
    year,
    basicSalary,
    allowances,
    deductions,
    leaveDays,
    workingDays,
    leaveDeductions,
    taxBrackets = getDefaultTaxBrackets(),
    pensionRate = 0.05, // 5% default
    benefitsConfig = {},
  } = params

  // Calculate total allowances
  const totalAllowances = Object.values(allowances || {}).reduce((sum, val) => sum + (val || 0), 0)

  // Calculate leave deductions
  const totalLeaveDeduction = leaveDeductions.reduce((sum, leave) => {
    if (leave.isUnpaid) {
      // For unpaid leave, deduct daily rate
      const dailyRate = basicSalary / workingDays
      return sum + (dailyRate * leave.days)
    }
    // For paid leave (Annual, Sick, etc.), no deduction
    return sum
  }, 0)

  // Calculate gross salary (before leave deductions)
  const grossSalary = basicSalary + totalAllowances

  // Calculate taxable income (gross minus unpaid leave deductions)
  const taxableIncome = Math.max(0, grossSalary - totalLeaveDeduction)

  // Calculate tax based on brackets
  const tax = calculateTax(taxableIncome, taxBrackets)

  // Calculate pension (on gross salary, before leave deductions)
  const pension = grossSalary * pensionRate

  // Calculate other deductions (from salary structure)
  const otherDeductions = Object.values(deductions || {}).reduce((sum, val) => sum + (val || 0), 0)

  // Calculate benefits
  const benefits = calculateBenefits(grossSalary, benefitsConfig)

  // Calculate net salary
  const netSalary = grossSalary - totalLeaveDeduction - tax - pension - otherDeductions - benefits.totalBenefits

  // Calculate paid days (working days minus unpaid leave days)
  const unpaidLeaveDays = leaveDeductions.filter((l) => l.isUnpaid).reduce((sum, l) => sum + l.days, 0)
  const paidDays = workingDays - unpaidLeaveDays

  return {
    staffId,
    period,
    month,
    year,
    basicSalary,
    allowances: totalAllowances,
    deductions: otherDeductions,
    leaveDeductions,
    totalLeaveDeduction,
    grossSalary,
    taxableIncome,
    tax,
    pension,
    otherDeductions,
    netSalary: Math.max(0, netSalary), // Ensure non-negative
    workingDays,
    leaveDays,
    paidDays,
    benefits,
  }
}

/**
 * Calculate tax based on tax brackets
 */
function calculateTax(income: number, brackets: TaxBracket[]): number {
  let tax = 0
  let remainingIncome = income

  for (const bracket of brackets) {
    if (remainingIncome <= 0) break

    const bracketMin = bracket.min
    const bracketMax = bracket.max || Infinity
    const taxableInBracket = Math.min(remainingIncome, bracketMax - bracketMin)

    if (taxableInBracket > 0) {
      tax += taxableInBracket * bracket.rate
      remainingIncome -= taxableInBracket
    }
  }

  return Math.round(tax * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculate benefits
 */
function calculateBenefits(
  grossSalary: number,
  config: {
    healthInsuranceRate?: number
    lifeInsuranceRate?: number
    providentFundRate?: number
  }
): BenefitsCalculation {
  const healthInsuranceRate = config.healthInsuranceRate || 0.01 // 1% default
  const lifeInsuranceRate = config.lifeInsuranceRate || 0.005 // 0.5% default
  const providentFundRate = config.providentFundRate || 0.05 // 5% default

  const healthInsurance = grossSalary * healthInsuranceRate
  const lifeInsurance = grossSalary * lifeInsuranceRate
  const providentFund = grossSalary * providentFundRate
  const otherBenefits = 0 // Can be extended

  return {
    healthInsurance: Math.round(healthInsurance * 100) / 100,
    lifeInsurance: Math.round(lifeInsurance * 100) / 100,
    providentFund: Math.round(providentFund * 100) / 100,
    otherBenefits,
    totalBenefits: Math.round((healthInsurance + lifeInsurance + providentFund + otherBenefits) * 100) / 100,
  }
}

/**
 * Get default tax brackets (Ghana tax structure - can be customized)
 */
function getDefaultTaxBrackets(): TaxBracket[] {
  return [
    { min: 0, max: 365, rate: 0 }, // First 365 GHS - 0%
    { min: 365, max: 475, rate: 0.05 }, // Next 110 GHS - 5%
    { min: 475, max: 685, rate: 0.10 }, // Next 210 GHS - 10%
    { min: 685, max: 895, rate: 0.175 }, // Next 210 GHS - 17.5%
    { min: 895, max: Infinity, rate: 0.25 }, // Above 895 GHS - 25%
  ]
}

/**
 * Get working days in a month (excluding weekends and holidays)
 */
export function getWorkingDaysInMonth(year: number, month: number, holidays: Date[] = []): number {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  let workingDays = 0

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const currentDate = new Date(year, month - 1, day)
    const dayOfWeek = currentDate.getDay()

    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue
    }

    // Skip holidays
    const isHoliday = holidays.some(
      (holiday) =>
        holiday.getDate() === currentDate.getDate() &&
        holiday.getMonth() === currentDate.getMonth() &&
        holiday.getFullYear() === currentDate.getFullYear()
    )

    if (!isHoliday) {
      workingDays++
    }
  }

  return workingDays
}

/**
 * Get leave days for a specific period
 */
export async function getLeaveDaysForPeriod(
  staffId: string,
  year: number,
  month: number,
  prisma: any
): Promise<{ leaveDays: number; leaveDeductions: LeaveDeduction[] }> {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)

  // Get approved leave requests for this period
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      staffId,
      status: 'approved',
      OR: [
        {
          // Leave starts in this month
          startDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        {
          // Leave ends in this month
          endDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        {
          // Leave spans this month
          AND: [
            { startDate: { lte: startDate } },
            { endDate: { gte: endDate } },
          ],
        },
      ],
    },
    orderBy: { startDate: 'asc' },
  })

  let totalLeaveDays = 0
  const leaveDeductions: LeaveDeduction[] = []

  for (const leave of leaves) {
    // Calculate days in this month
    const leaveStart = new Date(leave.startDate)
    const leaveEnd = new Date(leave.endDate)
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0)

    const effectiveStart = leaveStart > monthStart ? leaveStart : monthStart
    const effectiveEnd = leaveEnd < monthEnd ? leaveEnd : monthEnd

    if (effectiveStart <= effectiveEnd) {
      // Calculate working days in this leave period
      let daysInMonth = 0
      for (let d = new Date(effectiveStart); d <= effectiveEnd; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          daysInMonth++
        }
      }

      totalLeaveDays += daysInMonth

      // Determine if this is unpaid leave
      const isUnpaid = leave.leaveType === 'Unpaid' || leave.leaveType === 'Unpaid Leave'

      leaveDeductions.push({
        leaveType: leave.leaveType,
        days: daysInMonth,
        startDate: effectiveStart,
        endDate: effectiveEnd,
        isUnpaid,
        deductionAmount: 0, // Will be calculated in payroll calculation
      })
    }
  }

  return { leaveDays: totalLeaveDays, leaveDeductions }
}

