/**
 * Payroll Processing API
 * 
 * Ghana Government Compliance:
 * - Controller and Accountant General's Department (CAGD) requirements
 * - Ghana Revenue Authority (GRA) tax calculation
 * - Public Services Commission (PSC) salary structure guidelines
 * - Payroll approval workflow
 * 
 * Legal References:
 * - Controller and Accountant General's Department (CAGD) Payroll Standards
 * - Ghana Revenue Authority (GRA) Tax Calculation Standards
 * - Income Tax Act, 2015 (Act 896)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { logDataAccess } from '@/lib/data-access-logger'
import { hasPermission } from '@/lib/roles'
import { mapToMoFARole } from '@/lib/roles'

// GRA Tax Brackets (same as tax-calculate route)

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
const GRA_TAX_BRACKETS = [
  { min: 0, max: 365, rate: 0 },
  { min: 365, max: 475, rate: 5 },
  { min: 475, max: 685, rate: 10 },
  { min: 685, max: 895, rate: 17.5 },
  { min: 895, max: Infinity, rate: 25 },
]

/**
 * Calculate tax based on GRA standards
 */
function calculateTax(grossSalary: number, taxRelief: number = 0): number {
  const annualGross = grossSalary * 12
  const annualTaxable = Math.max(0, annualGross - (taxRelief * 12))
  
  let annualTax = 0
  let remainingIncome = annualTaxable

  for (const bracket of GRA_TAX_BRACKETS) {
    if (remainingIncome <= 0) break

    const bracketRange = bracket.max === Infinity 
      ? remainingIncome 
      : Math.min(remainingIncome, bracket.max - bracket.min)
    
    const bracketTax = (bracketRange * bracket.rate) / 100
    annualTax += bracketTax
    remainingIncome -= bracketRange
  }

  return annualTax / 12 // Monthly tax
}

/**
 * POST /api/payroll/process
 * Process payroll for staff members
 * 
 * Government Compliance:
 * - Only HR Director can process payroll
 * - Requires approval workflow
 * - Tax calculation per GRA standards
 */
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Check permissions - only HR Director can process payroll
      const normalizedRole = mapToMoFARole(user.role)
      if (normalizedRole !== 'HR_DIRECTOR' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - Only HR Director can process payroll' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const { staffIds, payPeriod, processAll = false } = body

      if (!payPeriod) {
        return NextResponse.json(
          { error: 'Pay period is required (format: YYYY-MM)' },
          { status: 400 }
        )
      }

      // Get IP and user agent
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Get staff members to process
      let staffMembers: any[] = []
      if (processAll) {
        staffMembers = await prisma.staffMember.findMany({
          where: { active: true },
          include: {
            user: {
              select: { email: true },
            },
          },
        })
      } else if (staffIds && Array.isArray(staffIds)) {
        staffMembers = await prisma.staffMember.findMany({
          where: {
            staffId: { in: staffIds },
            active: true,
          },
          include: {
            user: {
              select: { email: true },
            },
          },
        })
      } else {
        return NextResponse.json(
          { error: 'Either staffIds array or processAll flag is required' },
          { status: 400 }
        )
      }

      const processedPayrolls: any[] = []
      const errors: any[] = []

      // PERFORMANCE FIX: Batch queries to avoid N+1 problem
      const staffIdsToProcess = staffMembers.map(s => s.staffId)
      
      // Check for existing payroll items in batch
      const existingPayrollItems = await prisma.payrollItem.findMany({
        where: {
          staffId: { in: staffIdsToProcess },
          payroll: {
            period: payPeriod,
          },
        },
        select: { staffId: true },
      })
      const existingStaffIds = new Set(existingPayrollItems.map(p => p.staffId))
      
      // Get all salary structures in batch
      const allSalaryStructures = await prisma.salaryStructure.findMany({
        where: {
          staffId: { in: staffIdsToProcess },
          OR: [
            { endDate: null },
            { endDate: { gt: new Date() } }
          ],
        },
        orderBy: [
          { staffId: 'asc' },
          { effectiveDate: 'desc' },
        ],
      })
      
      // Create map of staffId -> salary structure (get most recent per staff)
      const salaryStructureMap = new Map<string, typeof allSalaryStructures[0]>()
      for (const structure of allSalaryStructures) {
        if (!salaryStructureMap.has(structure.staffId)) {
          salaryStructureMap.set(structure.staffId, structure)
        }
      }

      // Get or create payroll period record (once, not per staff)
      const [month, year] = payPeriod.split('-').map(Number)
      let payrollPeriod = await prisma.payroll.findUnique({
        where: { period: payPeriod }
      })

      if (!payrollPeriod) {
        payrollPeriod = await prisma.payroll.create({
          data: {
            period: payPeriod,
            month,
            year,
            totalStaff: 0,
            totalAmount: 0,
            status: 'processing',
            processedBy: user.id,
            processedAt: new Date(),
          },
        })
      }

      // Process payroll for each staff member (using batched data)
      for (const staff of staffMembers) {
        try {
          // Check if payroll already exists for this period
          if (existingStaffIds.has(staff.staffId)) {
            errors.push({
              staffId: staff.staffId,
              error: 'Payroll already exists for this period',
            })
            continue
          }

          // Get salary structure from map (O(1) lookup)
          const salaryStructure = salaryStructureMap.get(staff.staffId)

          if (!salaryStructure) {
            errors.push({
              staffId: staff.staffId,
              error: `No salary structure found for grade ${staff.grade}`,
            })
            continue
          }

          // Calculate salary components
          const basicSalary = Number(salaryStructure.basicSalary) || 0
          
          // Get allowances from JSON field
          const allowances = (salaryStructure.allowances as any) || {}
          const totalAllowances = typeof allowances === 'object' && allowances !== null
            ? Object.values(allowances).reduce((sum: number, val: any) => sum + (parseFloat(String(val)) || 0), 0)
            : 0

          const grossSalary = basicSalary + totalAllowances

          // Calculate deductions from JSON field
          const deductions = (salaryStructure.deductions as any) || {}
          const taxRate = deductions.tax ? parseFloat(String(deductions.tax)) : 0
          const pensionRate = deductions.pension ? parseFloat(String(deductions.pension)) : 0
          
          // Calculate tax (GRA compliant)
          const taxDeduction = calculateTax(grossSalary)
          
          // Calculate pension (default 5.5% if not specified)
          const pensionDeduction = pensionRate > 0 
            ? (grossSalary * pensionRate) / 100 
            : (grossSalary * 5.5) / 100

          // Other deductions
          const otherDeductions = deductions.loan ? parseFloat(String(deductions.loan)) : 0

          // Calculate net salary
          const netSalary = grossSalary - taxDeduction - pensionDeduction - otherDeductions

          // Create payroll item for this staff (payrollPeriod already created above)
          const payrollItem = await prisma.payrollItem.create({
            data: {
              payrollId: payrollPeriod.id,
              staffId: staff.staffId,
              basicSalary,
              allowances: totalAllowances,
              grossSalary,
              taxDeduction: Math.round(taxDeduction * 100) / 100,
              pensionDeduction: Math.round(pensionDeduction * 100) / 100,
              otherDeductions,
              netSalary: Math.round(netSalary * 100) / 100,
              status: 'draft',
            },
          })

          processedPayrolls.push({
            staffId: staff.staffId,
            staffName: `${staff.firstName} ${staff.lastName}`,
            payrollId: payrollPeriod.id,
            payrollItemId: payrollItem.id,
            grossSalary,
            netSalary: Math.round(netSalary * 100) / 100,
          })

          // Log data access
          await logDataAccess({
            userId: user.id,
            userRole: user.role,
            staffId: staff.staffId,
            dataType: 'salary',
            action: 'edit',
            ip,
            userAgent,
            metadata: {
              type: 'payroll_processing',
              payPeriod,
              payrollId: payrollPeriod.id,
              payrollItemId: payrollItem.id,
            },
          })
        } catch (error: any) {
          errors.push({
            staffId: staff.staffId,
            error: error.message || 'Failed to process payroll',
          })
        }
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'PAYROLL_PROCESSED',
          user: user.email,
          details: `HR Director ${user.email} processed payroll for period ${payPeriod}. Processed: ${processedPayrolls.length}, Errors: ${errors.length}`,
          ip,
        },
      })

      return NextResponse.json({
        success: true,
        processed: processedPayrolls.length,
        errors: errors.length,
        payrolls: processedPayrolls,
        errorsList: errors,
        message: `Payroll processed successfully. ${processedPayrolls.length} records created, ${errors.length} errors.`,
      })
    } catch (error) {
      console.error('Error processing payroll:', error)
      return NextResponse.json(
        { error: 'Failed to process payroll' },
        { status: 500 }
      )
    }
  })(request)
}

/**
 * GET /api/payroll/process
 * Get payroll processing status
 */
export async function GET(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Check permissions
      const normalizedRole = mapToMoFARole(user.role)
      if (!hasPermission(normalizedRole, 'employee:view:all') && 
          normalizedRole !== 'HR_OFFICER' && 
          normalizedRole !== 'HR_DIRECTOR' &&
          user.role !== 'hr' && 
          user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        )
      }

      const { searchParams } = new URL(req.url)
      const payPeriod = searchParams.get('payPeriod')
      const staffId = searchParams.get('staffId')
      const status = searchParams.get('status')

      // Build where clause
      const where: any = {}
      if (payPeriod) where.payPeriod = payPeriod
      if (staffId) where.staffId = staffId
      if (status) where.status = status

      // Get payroll records
      const payrolls = await prisma.$queryRaw`
        SELECT * FROM "Payroll"
        WHERE ${Object.keys(where).length > 0 
          ? Object.entries(where).map(([k, v]) => `${k} = ${v}`).join(' AND ')
          : '1=1'}
        ORDER BY "payPeriod" DESC, "createdAt" DESC
      `.catch(async () => {
        return await prisma.payroll.findMany({
          where,
          orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
        }).catch(() => [])
      })

      return NextResponse.json({ payrolls })
    } catch (error) {
      console.error('Error fetching payroll:', error)
      return NextResponse.json(
        { error: 'Failed to fetch payroll records' },
        { status: 500 }
      )
    }
  })(request)
}

