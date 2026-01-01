import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isHR, isAdmin, isChiefDirector } from '@/lib/auth-proxy'
import { READ_ONLY_ROLES, HR_ROLES, ADMIN_ROLES } from '@/lib/role-utils'


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
}, { allowedRoles: READ_ONLY_ROLES })

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
}, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES, 'CHIEF_DIRECTOR', 'chief_director'] })

