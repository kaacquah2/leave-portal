import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isEmployee, isManager, isHR, isAdmin } from '@/lib/auth-proxy'
import { READ_ONLY_ROLES, HR_ROLES, ADMIN_ROLES } from '@/lib/role-utils'


// GET all leave balances
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // HR and admin can view all balances
    // Employees and managers can only view their own balance
    let where: any = {}
    
    const userIsEmployee = isEmployee(user)
    const userIsManager = isManager(user)
    const userIsHR = isHR(user) || isAdmin(user)
    
    if (userIsEmployee && user.staffId) {
      where.staffId = user.staffId
    } else if (userIsManager && user.staffId) {
      // Managers and deputy directors see their team/directorate balances
      // In a full implementation, this would filter by team/directorate
      // For now, they see all (can be enhanced later)
    }
    // HR, HR Assistant, and admin see all (no where clause)

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
}, { allowedRoles: READ_ONLY_ROLES })

// POST create or update leave balance
// 
// Ghana Government Compliance: Direct balance updates are restricted
// Manual balance adjustments must go through override workflow (requires HR Director approval)
// This endpoint is kept for backward compatibility but should redirect to override workflow
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR and admin can create/update balances
    if (!isHR(user) && !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // CRITICAL: If this is a manual balance adjustment (not initial creation),
    // redirect to override workflow which requires HR Director approval
    const existingBalance = await prisma.leaveBalance.findUnique({
      where: { staffId: body.staffId },
    })
    
    if (existingBalance) {
      // Check if any balance fields are being changed
      const balanceFields = ['annual', 'sick', 'unpaid', 'specialService', 'training', 'study', 'maternity', 'paternity', 'compassionate']
      const hasChanges = balanceFields.some(field => {
        const newValue = body[field]
        const oldValue = (existingBalance as any)[field]
        return newValue !== undefined && newValue !== oldValue
      })
      
      if (hasChanges) {
        // This is a manual adjustment - require override workflow
        return NextResponse.json(
          { 
            error: 'Manual balance adjustments require HR Director approval',
            errorCode: 'BALANCE_OVERRIDE_REQUIRED',
            message: 'Please use the balance override workflow which requires HR Director approval. This ensures proper segregation of duties and audit compliance.',
            redirectTo: '/api/balances/override',
          },
          { status: 400 }
        )
      }
    }

    // Only allow initial balance creation or updates that don't change values
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
}, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES, 'CHIEF_DIRECTOR', 'chief_director'] })

