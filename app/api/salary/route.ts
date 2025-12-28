import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'


// GET all salary structures
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {

    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get('staffId')

    const where: any = {}

    // Role-based filtering
    if (user.role === 'employee' && user.staffId) {
      where.staffId = user.staffId
    } else if (staffId) {
      where.staffId = staffId
    }

    const salaries = await prisma.salaryStructure.findMany({
      where,
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
          },
        },
      },
      orderBy: { effectiveDate: 'desc' },
    })

    return NextResponse.json(salaries)
  } catch (error) {
    console.error('Error fetching salary structures:', error)
    return NextResponse.json(
      { error: 'Failed to fetch salary structures' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

// POST create salary structure
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {

    const body = await request.json()
    const { staffId, basicSalary, allowances, deductions, effectiveDate, notes } = body

    if (!staffId || !basicSalary || !effectiveDate) {
      return NextResponse.json(
        { error: 'Staff ID, basic salary, and effective date are required' },
        { status: 400 }
      )
    }

    // End previous salary structure if exists
    const existing = await prisma.salaryStructure.findUnique({
      where: { staffId },
    })

    if (existing && !existing.endDate) {
      await prisma.salaryStructure.update({
        where: { staffId },
        data: { endDate: new Date(effectiveDate) },
      })
    }

    const salary = await prisma.salaryStructure.create({
      data: {
        staffId,
        basicSalary,
        allowances: allowances || {},
        deductions: deductions || {},
        effectiveDate: new Date(effectiveDate),
        approvedBy: user.email,
        notes: notes || null,
      },
      include: { staff: true },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'SALARY_STRUCTURE_CREATED',
        user: user.email,
        staffId,
        details: `Salary structure created: Basic ${basicSalary}`,
      },
    })

    return NextResponse.json(salary, { status: 201 })
  } catch (error) {
    console.error('Error creating salary structure:', error)
    return NextResponse.json(
      { error: 'Failed to create salary structure' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin'] })

