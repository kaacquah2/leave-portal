import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { calculatePayroll, getWorkingDaysInMonth, getLeaveDaysForPeriod } from '@/lib/payroll-calculator'


/**
 * Payroll Reconciliation
 * Compares calculated payroll with actual payslips and identifies discrepancies
 */

// POST reconcile payroll for a period
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { period, month, year } = body

    if (!period || !month || !year) {
      return NextResponse.json(
        { error: 'Period, month, and year are required' },
        { status: 400 }
      )
    }

    // Get all payslips for the period
    const payslips = await prisma.payslip.findMany({
      where: {
        month: period,
        year: year,
      },
      include: {
        staff: {
          include: {
            salaryStructures: {
              where: {
                effectiveDate: { lte: new Date(year, month, 0) },
                OR: [
                  { endDate: null },
                  { endDate: { gte: new Date(year, month - 1, 1) } },
                ],
              },
              orderBy: { effectiveDate: 'desc' },
              take: 1,
            },
          },
        },
      },
    })

    // Get holidays
    const holidays = await prisma.holiday.findMany({
      where: {
        OR: [
          { year: year },
          { recurring: true },
        ],
        date: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0),
        },
      },
    })

    const holidayDates = holidays.map((h) => new Date(h.date))
    const workingDays = getWorkingDaysInMonth(year, month, holidayDates)

    const discrepancies: any[] = []
    const reconciled: any[] = []

    for (const payslip of payslips) {
      try {
        const staff = payslip.staff
        const salaryStructure = staff.salaryStructures[0]

        if (!salaryStructure) {
          discrepancies.push({
            staffId: staff.staffId,
            name: `${staff.firstName} ${staff.lastName}`,
            issue: 'No salary structure found',
            payslipId: payslip.id,
          })
          continue
        }

        // Get leave days
        const { leaveDays, leaveDeductions } = await getLeaveDaysForPeriod(
          staff.staffId,
          year,
          month,
          prisma
        )

        // Recalculate payroll
        const allowances = (salaryStructure.allowances as any) || {}
        const deductions = (salaryStructure.deductions as any) || {}

        const calculated = calculatePayroll({
          staffId: staff.staffId,
          period,
          month,
          year,
          basicSalary: salaryStructure.basicSalary,
          allowances,
          deductions,
          leaveDays,
          workingDays,
          leaveDeductions,
        })

        // Compare with actual payslip
        const differences: any = {}
        let hasDifference = false

        const fields = ['basicSalary', 'allowances', 'deductions', 'tax', 'pension', 'netSalary']
        for (const field of fields) {
          const calculatedValue = calculated[field as keyof typeof calculated] as number
          const actualValue = payslip[field as keyof typeof payslip] as number
          const difference = Math.abs(calculatedValue - actualValue)

          if (difference > 0.01) {
            // Allow 0.01 GHS difference for rounding
            differences[field] = {
              calculated: calculatedValue,
              actual: actualValue,
              difference: calculatedValue - actualValue,
            }
            hasDifference = true
          }
        }

        if (hasDifference) {
          discrepancies.push({
            staffId: staff.staffId,
            name: `${staff.firstName} ${staff.lastName}`,
            payslipId: payslip.id,
            differences,
            calculated,
            actual: payslip,
          })
        } else {
          reconciled.push({
            staffId: staff.staffId,
            name: `${staff.firstName} ${staff.lastName}`,
            payslipId: payslip.id,
            status: 'reconciled',
          })
        }
      } catch (error: any) {
        discrepancies.push({
          staffId: payslip.staff.staffId,
          name: `${payslip.staff.firstName} ${payslip.staff.lastName}`,
          payslipId: payslip.id,
          issue: 'Error during reconciliation',
          error: error.message,
        })
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PAYROLL_RECONCILED',
        user: user.email || 'system',
        details: JSON.stringify({
          period,
          totalPayslips: payslips.length,
          reconciled: reconciled.length,
          discrepancies: discrepancies.length,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      period,
      total: payslips.length,
      reconciled: reconciled.length,
      discrepancies: discrepancies.length,
      reconciledList: reconciled,
      discrepanciesList: discrepancies,
    })
  } catch (error) {
    console.error('Error reconciling payroll:', error)
    return NextResponse.json({ error: 'Failed to reconcile payroll' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin'] })

