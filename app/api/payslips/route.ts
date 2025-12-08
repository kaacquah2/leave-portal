import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all payslips
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get('staffId')
    
    const payslips = await prisma.payslip.findMany({
      where: staffId ? { staffId } : undefined,
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
}

// POST create payslip
export async function POST(request: NextRequest) {
  try {
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
}

