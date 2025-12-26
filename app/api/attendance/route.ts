import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET all attendance records
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {

    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get('staffId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    
    // Role-based filtering
    if (user.role === 'employee' && user.staffId) {
      where.staffId = user.staffId
    } else if (user.role === 'manager') {
      // Managers can see their team (would need department/team relation)
      if (staffId) where.staffId = staffId
    } else if (staffId) {
      where.staffId = staffId
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const attendances = await prisma.attendance.findMany({
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
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(attendances)
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

// POST create attendance record
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const body = await request.json()
    
    // Employees can only create attendance for themselves
    if (user.role === 'employee' && body.staffId !== user.staffId) {
      return NextResponse.json(
        { error: 'You can only create attendance records for yourself' },
        { status: 403 }
      )
    }

    const { staffId, date, clockIn, clockOut, breakDuration, status, notes } = body

    // Check if attendance already exists for this date
    const existing = await prisma.attendance.findUnique({
      where: {
        staffId_date: {
          staffId,
          date: new Date(date),
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Attendance record already exists for this date' },
        { status: 400 }
      )
    }

    // Calculate total hours if clock in/out provided
    let totalHours: number | null = null
    if (clockIn && clockOut) {
      const start = new Date(clockIn)
      const end = new Date(clockOut)
      const diffMs = end.getTime() - start.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      totalHours = breakDuration ? diffHours - (breakDuration / 60) : diffHours
    }

    const attendance = await prisma.attendance.create({
      data: {
        staffId,
        date: new Date(date),
        clockIn: clockIn ? new Date(clockIn) : null,
        clockOut: clockOut ? new Date(clockOut) : null,
        breakDuration: breakDuration || null,
        totalHours,
        status: status || 'present',
        notes: notes || null,
      },
      include: {
        staff: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ATTENDANCE_CREATED',
        user: user.email,
        staffId,
        details: `Attendance record created for ${attendance.date.toISOString()}`,
      },
    })

    return NextResponse.json(attendance, { status: 201 })
  } catch (error) {
    console.error('Error creating attendance:', error)
    return NextResponse.json(
      { error: 'Failed to create attendance record' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

