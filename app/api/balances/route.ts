import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'


// GET all leave balances
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // HR and admin can view all balances
    // Employees and managers can only view their own balance
    let where: any = {}
    
    const normalizedRole = user.role?.toUpperCase()
    const isEmployee = normalizedRole === 'EMPLOYEE' || user.role === 'employee'
    const isManager = normalizedRole === 'MANAGER' || user.role === 'manager' || 
                      normalizedRole === 'DEPUTY_DIRECTOR' || user.role === 'deputy_director' ||
                      normalizedRole === 'SUPERVISOR' || user.role === 'supervisor'
    const isHR = normalizedRole === 'HR_OFFICER' || user.role === 'hr' || 
                 normalizedRole === 'HR_DIRECTOR' || user.role === 'hr_director' ||
                 normalizedRole === 'HR_ASSISTANT' || user.role === 'hr_assistant' ||
                 normalizedRole === 'CHIEF_DIRECTOR' || user.role === 'chief_director' ||
                 normalizedRole === 'SYS_ADMIN' || user.role === 'admin'
    
    if (isEmployee && user.staffId) {
      where.staffId = user.staffId
    } else if (isManager && user.staffId) {
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
}, { allowedRoles: ['HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'SYS_ADMIN', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER', 'EMPLOYEE', 'AUDITOR', 'hr', 'hr_assistant', 'admin', 'employee', 'manager', 'deputy_director', 'hr_officer', 'hr_director', 'chief_director', 'supervisor', 'unit_head', 'division_head', 'directorate_head', 'regional_manager', 'auditor', 'internal_auditor'] })

// POST create or update leave balance
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR and admin can create/update balances
    const normalizedRole = user.role?.toUpperCase()
    const isHR = normalizedRole === 'HR_OFFICER' || user.role === 'hr' || 
                 normalizedRole === 'HR_DIRECTOR' || user.role === 'hr_director' ||
                 normalizedRole === 'HR_ASSISTANT' || user.role === 'hr_assistant' ||
                 normalizedRole === 'CHIEF_DIRECTOR' || user.role === 'chief_director' ||
                 normalizedRole === 'SYS_ADMIN' || user.role === 'admin'
    
    if (!isHR) {
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
}, { allowedRoles: ['HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'SYS_ADMIN', 'hr', 'hr_assistant', 'admin', 'hr_officer', 'hr_director', 'chief_director'] })

