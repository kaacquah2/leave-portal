import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'


// GET all leave balances
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // HR and admin can view all balances
    // Employees and managers can only view their own balance
    let where: any = {}
    
    if (user.role === 'employee' && user.staffId) {
      where.staffId = user.staffId
    } else if (user.role === 'manager' && user.staffId) {
      where.staffId = user.staffId
    }
    // HR and admin see all (no where clause)

    const balances = await prisma.leaveBalance.findMany({
      where,
      include: {
        staff: true,
      },
    })
    return NextResponse.json(balances)
  } catch (error) {
    console.error('Error fetching balances:', error)
    return NextResponse.json({ error: 'Failed to fetch balances' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

// POST create or update leave balance
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR and admin can create/update balances
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const balance = await prisma.leaveBalance.upsert({
      where: { staffId: body.staffId },
      update: {
        annual: body.annual ?? undefined,
        sick: body.sick ?? undefined,
        unpaid: body.unpaid ?? undefined,
        specialService: body.specialService ?? undefined,
        training: body.training ?? undefined,
        study: body.study ?? undefined,
        maternity: body.maternity ?? undefined,
        paternity: body.paternity ?? undefined,
        compassionate: body.compassionate ?? undefined,
      },
      create: {
        staffId: body.staffId,
        annual: body.annual ?? 0,
        sick: body.sick ?? 0,
        unpaid: body.unpaid ?? 0,
        specialService: body.specialService ?? 0,
        training: body.training ?? 0,
        study: body.study ?? 0,
        maternity: body.maternity ?? 0,
        paternity: body.paternity ?? 0,
        compassionate: body.compassionate ?? 0,
      },
    })
    return NextResponse.json(balance, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating balance:', error)
    return NextResponse.json({ error: 'Failed to create/update balance' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin'] })

