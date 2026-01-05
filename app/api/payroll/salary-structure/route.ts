/**
 * Salary Structure Management API
 * 
 * Ghana Government Compliance:
 * - Public Services Commission (PSC) salary structure guidelines
 * - Controller and Accountant General's Department (CAGD) requirements
 * - Audit trail for all salary structure changes
 * 
 * Legal References:
 * - Public Services Commission (PSC) Conditions of Service
 * - Controller and Accountant General's Department (CAGD) Payroll Standards
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isHR, isAdmin } from '@/lib/auth'
import { logDataAccess } from '@/lib/data-access-logger'
import { mapToMoFARole } from '@/lib/roles'

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
/**
 * GET /api/payroll/salary-structure
 * Get salary structures
 * 
 * Government Compliance:
 * - Only HR and authorized roles can view salary structures
 * - Data access logged per Data Protection Act 843
 */
export async function GET(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Check permissions - only HR roles can view salary structures
      if (!isHR(user) && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient permissions to view salary structures' },
          { status: 403 }
        )
      }

      // Get IP and user agent
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      const { searchParams } = new URL(req.url)
      const grade = searchParams.get('grade')
      const active = searchParams.get('active')

      // Build where clause
      const where: any = {}
      if (grade) where.grade = grade
      if (active !== null) where.active = active === 'true'

      // Get salary structures
      const structures = await prisma.$queryRaw`
        SELECT * FROM "SalaryStructure" 
        WHERE ${Object.keys(where).length > 0 ? Object.entries(where).map(([k, v]) => `${k} = ${v}`).join(' AND ') : '1=1'}
        ORDER BY "grade", "effectiveFrom" DESC
      `.catch(async () => {
        // Fallback if model doesn't exist yet
        return await prisma.salaryStructure.findMany({
          where,
          orderBy: [{ effectiveDate: 'desc' }],
        }).catch(() => [])
      })

      // Log data access (Data Protection Act 843 compliance)
      await logDataAccess({
        userId: user.id,
        userRole: user.role,
        dataType: 'salary',
        action: 'view',
        ip,
        userAgent,
      })

      return NextResponse.json({ structures })
    } catch (error) {
      console.error('Error fetching salary structures:', error)
      return NextResponse.json(
        { error: 'Failed to fetch salary structures' },
        { status: 500 }
      )
    }
  })(request)
}

/**
 * POST /api/payroll/salary-structure
 * Create salary structure
 * 
 * Government Compliance:
 * - Only HR Director can create salary structures
 * - Audit trail required
 */
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Check permissions - only HR Director can create salary structures
      const normalizedRole = mapToMoFARole(user.role)
      if (normalizedRole !== 'HR_DIRECTOR' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - Only HR Director can create salary structures' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const {
        grade,
        position,
        basicSalary,
        housingAllowance = 0,
        transportAllowance = 0,
        medicalAllowance = 0,
        otherAllowances = {},
        taxRate = 0,
        pensionRate = 0,
        effectiveFrom,
        effectiveTo,
        notes,
      } = body

      // Validate required fields
      if (!grade || !basicSalary || !effectiveFrom) {
        return NextResponse.json(
          { error: 'Missing required fields: grade, basicSalary, effectiveFrom' },
          { status: 400 }
        )
      }

      // Get IP and user agent
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Create salary structure
      // Get staffId from body or use a default
      const { staffId: bodyStaffId } = body
      
      if (!bodyStaffId) {
        return NextResponse.json(
          { error: 'Missing required field: staffId' },
          { status: 400 }
        )
      }

      // Fallback if model doesn't exist yet
      const structure = await prisma.salaryStructure.create({
        data: {
          staffId: bodyStaffId,
          basicSalary: parseFloat(basicSalary),
          allowances: {
            housing: parseFloat(housingAllowance) || 0,
            transport: parseFloat(transportAllowance) || 0,
            medical: parseFloat(medicalAllowance) || 0,
            ...otherAllowances,
          },
          deductions: {
            tax: parseFloat(taxRate) || 0,
            pension: parseFloat(pensionRate) || 0,
          },
          effectiveDate: new Date(effectiveFrom),
          endDate: effectiveTo ? new Date(effectiveTo) : null,
          approvedBy: user.id,
          notes: notes || null,
          grade: grade || null,
          position: position || null,
        },
      })

      // Log data access (Data Protection Act 843 compliance)
      await logDataAccess({
        userId: user.id,
        userRole: user.role,
        dataType: 'salary',
        action: 'edit',
        ip,
        userAgent,
        metadata: { structureId: structure.id || 'new' },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'SALARY_STRUCTURE_CREATED',
          user: user.email,
          details: `HR Director ${user.email} created salary structure for grade ${grade}`,
          ip,
        },
      })

      return NextResponse.json({
        success: true,
        structure,
        message: 'Salary structure created successfully',
      })
    } catch (error) {
      console.error('Error creating salary structure:', error)
      return NextResponse.json(
        { error: 'Failed to create salary structure' },
        { status: 500 }
      )
    }
  })(request)
}

