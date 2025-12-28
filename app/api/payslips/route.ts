import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'


// GET all payslips
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get('staffId')
    
    // Role-based filtering
    let where: any = {}
    if (user.role === 'employee' && user.staffId) {
      // Employees can only see their own payslips
      where.staffId = user.staffId
    } else if (staffId) {
      where.staffId = staffId
    }
    // HR and admin can see all (no where clause if no staffId filter)
    
    const payslips = await prisma.payslip.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        staff: true,
      },
    })
    return NextResponse.json(payslips)
  } catch (error) {
    console.error('Error fetching payslips:', error)
    return NextResponse.json({ error: 'Failed to fetch payslips' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

// POST create payslip
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR and admin can create payslips
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const payslip = await prisma.payslip.create({
      data: {
        staffId: body.staffId,
        month: body.month,
        year: body.year,
        basicSalary: body.basicSalary,
        allowances: body.allowances,
        deductions: body.deductions,
        netSalary: body.netSalary,
        tax: body.tax,
        pension: body.pension,
        pdfUrl: body.pdfUrl,
      },
    })
    return NextResponse.json(payslip, { status: 201 })
  } catch (error) {
    console.error('Error creating payslip:', error)
    return NextResponse.json({ error: 'Failed to create payslip' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin'] })

