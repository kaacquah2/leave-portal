import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isHR, isAdmin, isChiefDirector } from '@/lib/auth-proxy'


// GET all holidays - All authenticated users can view holidays
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: 'asc' },
    })
    return NextResponse.json(holidays)
  } catch (error) {
    console.error('Error fetching holidays:', error)
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 })
  }
}, { allowedRoles: ['HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'SYS_ADMIN', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER', 'EMPLOYEE', 'AUDITOR', 'hr', 'hr_assistant', 'admin', 'employee', 'manager', 'deputy_director', 'hr_officer', 'hr_director', 'chief_director', 'supervisor', 'unit_head', 'division_head', 'directorate_head', 'regional_manager', 'auditor', 'internal_auditor'] })

// POST create holiday
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR and admin can create holidays
    if (!isHR(user) && !isAdmin(user) && !isChiefDirector(user)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const holiday = await prisma.holiday.create({
      data: {
        name: body.name,
        date: new Date(body.date),
        type: body.type,
        recurring: body.recurring ?? false,
        year: body.year || null,
      },
    })
    return NextResponse.json(holiday, { status: 201 })
  } catch (error) {
    console.error('Error creating holiday:', error)
    return NextResponse.json({ error: 'Failed to create holiday' }, { status: 500 })
  }
}, { allowedRoles: ['HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'SYS_ADMIN', 'hr', 'hr_assistant', 'admin', 'hr_officer', 'hr_director', 'chief_director'] })

