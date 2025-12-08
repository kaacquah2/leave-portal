import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all leave balances
export async function GET() {
  try {
    const balances = await prisma.leaveBalance.findMany({
      include: {
        staff: true,
      },
    })
    return NextResponse.json(balances)
  } catch (error) {
    console.error('Error fetching balances:', error)
    return NextResponse.json({ error: 'Failed to fetch balances' }, { status: 500 })
  }
}

// POST create or update leave balance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const balance = await prisma.leaveBalance.upsert({
      where: { staffId: body.staffId },
      update: {
        annual: body.annual ?? undefined,
        sick: body.sick ?? undefined,
        unpaid: body.unpaid ?? undefined,
        specialService: body.specialService ?? undefined,
        training: body.training ?? undefined,
      },
      create: {
        staffId: body.staffId,
        annual: body.annual ?? 0,
        sick: body.sick ?? 0,
        unpaid: body.unpaid ?? 0,
        specialService: body.specialService ?? 0,
        training: body.training ?? 0,
      },
    })
    return NextResponse.json(balance, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating balance:', error)
    return NextResponse.json({ error: 'Failed to create/update balance' }, { status: 500 })
  }
}

