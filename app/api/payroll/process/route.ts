import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

import {
  calculatePayroll,
  getWorkingDaysInMonth,
  getLeaveDaysForPeriod,
  type PayrollCalculation,
} from '@/lib/payroll-calculator'

// POST process payroll for a period
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { period, month, year, staffIds, recalculate } = body

    if (!period || !month || !year) {
      return NextResponse.json(
        { error: 'Period, month, and year are required' },
        { status: 400 }
      )
    }

    // Get holidays for the month
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

    // Get working days in the month
    const workingDays = getWorkingDaysInMonth(year, month, holidayDates)

    // Get active staff members
    let whereClause: any = { active: true, employmentStatus: 'active' }
    if (staffIds && Array.isArray(staffIds) && staffIds.length > 0) {
      whereClause.staffId = { in: staffIds }
    }

    const staffMembers = await prisma.staffMember.findMany({
      where: whereClause,
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
    })

    const processedPayslips: any[] = []
    const errors: any[] = []

    for (const staff of staffMembers) {
      try {
        // Get current salary structure
        const salaryStructure = staff.salaryStructures[0]
        if (!salaryStructure) {
          errors.push({
            staffId: staff.staffId,
            name: `${staff.firstName} ${staff.lastName}`,
            error: 'No salary structure found',
          })
          continue
        }

        // Get leave days for this period
        const { leaveDays, leaveDeductions } = await getLeaveDaysForPeriod(
          staff.staffId,
          year,
          month,
          prisma
        )

        // Check if payslip already exists
        const existingPayslip = await prisma.payslip.findFirst({
          where: {
            staffId: staff.staffId,
            month: period,
            year: year,
          },
        })

        if (existingPayslip && !recalculate) {
          processedPayslips.push({
            ...existingPayslip,
            status: 'existing',
          })
          continue
        }

        // Parse allowances and deductions
        const allowances = (salaryStructure.allowances as any) || {}
        const deductions = (salaryStructure.deductions as any) || {}

        // Calculate payroll
        const calculation = calculatePayroll({
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

        // Create or update payslip
        const payslipData = {
          staffId: staff.staffId,
          month: period,
          year: year,
          basicSalary: calculation.basicSalary,
          allowances: calculation.allowances,
          deductions: calculation.deductions + calculation.otherDeductions,
          netSalary: calculation.netSalary,
          tax: calculation.tax,
          pension: calculation.pension,
        }

        let payslip
        if (existingPayslip) {
          payslip = await prisma.payslip.update({
            where: { id: existingPayslip.id },
            data: payslipData,
          })
        } else {
          payslip = await prisma.payslip.create({
            data: payslipData,
          })
        }

        // Store detailed calculation in a separate table or as metadata
        // For now, we'll create an audit log entry
        await prisma.auditLog.create({
          data: {
            action: 'PAYROLL_PROCESSED',
            user: user.email || 'system',
            staffId: staff.staffId,
            details: JSON.stringify({
              period,
              calculation: {
                grossSalary: calculation.grossSalary,
                leaveDeductions: calculation.totalLeaveDeduction,
                taxableIncome: calculation.taxableIncome,
                tax: calculation.tax,
                pension: calculation.pension,
                netSalary: calculation.netSalary,
                leaveDays: calculation.leaveDays,
                paidDays: calculation.paidDays,
                workingDays: calculation.workingDays,
              },
            }),
          },
        })

        processedPayslips.push({
          ...payslip,
          calculation,
          status: existingPayslip ? 'updated' : 'created',
        })
      } catch (error: any) {
        console.error(`Error processing payroll for ${staff.staffId}:`, error)
        errors.push({
          staffId: staff.staffId,
          name: `${staff.firstName} ${staff.lastName}`,
          error: error.message || 'Unknown error',
        })
      }
    }

    // Update or create payroll record
    const payrollRecord = await prisma.payroll.upsert({
      where: { period },
      update: {
        totalStaff: processedPayslips.length,
        totalAmount: processedPayslips.reduce((sum, p) => sum + p.netSalary, 0),
        status: 'processing',
        processedBy: user.email || 'system',
        processedAt: new Date(),
      },
      create: {
        period,
        month,
        year,
        totalStaff: processedPayslips.length,
        totalAmount: processedPayslips.reduce((sum, p) => sum + p.netSalary, 0),
        status: 'processing',
        processedBy: user.email || 'system',
        processedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      payroll: payrollRecord,
      processed: processedPayslips.length,
      errors: errors.length,
      payslips: processedPayslips,
      errorsList: errors,
    })
  } catch (error) {
    console.error('Error processing payroll:', error)
    return NextResponse.json({ error: 'Failed to process payroll' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin'] })

