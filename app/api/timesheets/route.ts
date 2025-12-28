import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'


// GET all timesheets
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {

    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get('staffId')
    const status = searchParams.get('status')
    const weekStart = searchParams.get('weekStart')

    const where: any = {}

    // Role-based filtering
    if (user.role === 'employee' && user.staffId) {
      where.staffId = user.staffId
    } else if (staffId) {
      where.staffId = staffId
    }

    if (status) where.status = status
    if (weekStart) where.weekStart = new Date(weekStart)

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
      orderBy: { weekStart: 'desc' },
    })

    return NextResponse.json(timesheets)
  } catch (error) {
    console.error('Error fetching timesheets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timesheets' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

// POST create timesheet
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Employees can only create timesheets for themselves
    const body = await request.json()
    if (user.role === 'employee' && body.staffId !== user.staffId) {
      return NextResponse.json(
        { error: 'You can only create timesheets for yourself' },
        { status: 403 }
      )
    }

    const { staffId, weekStart, weekEnd, hours } = body

    if (!staffId || !weekStart || !weekEnd || !hours) {
      return NextResponse.json(
        { error: 'Staff ID, week dates, and hours are required' },
        { status: 400 }
      )
    }

    // Check if timesheet already exists for this week
    const existing = await prisma.timesheet.findUnique({
      where: {
        staffId_weekStart: {
          staffId,
          weekStart: new Date(weekStart),
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Timesheet already exists for this week' },
        { status: 400 }
      )
    }

    // Calculate total hours
    const totalHours = Array.isArray(hours)
      ? hours.reduce((sum: number, day: any) => sum + (day.hours || 0), 0)
      : 0

    const timesheet = await prisma.timesheet.create({
      data: {
        staffId,
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
        hours: hours,
        totalHours,
        status: 'draft',
      },
      include: { staff: true },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'TIMESHEET_CREATED',
        user: user.email,
        staffId,
        details: `Timesheet created for week starting ${weekStart}`,
      },
    })

    return NextResponse.json(timesheet, { status: 201 })
  } catch (error) {
    console.error('Error creating timesheet:', error)
    return NextResponse.json(
      { error: 'Failed to create timesheet' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

