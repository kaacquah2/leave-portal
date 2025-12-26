import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (!user.staffId) {
      return NextResponse.json(
        { error: 'Staff ID required for clock out' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { breakDuration } = body

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find today's attendance
    const attendance = await prisma.attendance.findUnique({
      where: {
        staffId_date: {
          staffId: user.staffId,
          date: today,
        },
      },
    })

    if (!attendance || !attendance.clockIn) {
      return NextResponse.json(
        { error: 'Please clock in first' },
        { status: 400 }
      )
    }

    if (attendance.clockOut) {
      return NextResponse.json(
        { error: 'Already clocked out today' },
        { status: 400 }
      )
    }

    const clockOutTime = new Date()

    // Calculate total hours
    const start = attendance.clockIn
    const end = clockOutTime
    const diffMs = end.getTime() - start.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    const totalHours = breakDuration ? diffHours - (breakDuration / 60) : diffHours

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOut: clockOutTime,
        breakDuration: breakDuration || attendance.breakDuration,
        totalHours,
      },
      include: { staff: true },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CLOCK_OUT',
        user: user.email,
        staffId: user.staffId,
        details: `Clocked out at ${clockOutTime.toISOString()}, total hours: ${totalHours.toFixed(2)}`,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error clocking out:', error)
    return NextResponse.json(
      { error: 'Failed to clock out' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['employee', 'hr', 'admin', 'manager'] })

