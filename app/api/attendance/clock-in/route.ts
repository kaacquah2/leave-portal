import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'


export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (!user.staffId) {
      return NextResponse.json(
        { error: 'Staff ID required for clock in' },
        { status: 400 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if already clocked in today
    const existing = await prisma.attendance.findUnique({
      where: {
        staffId_date: {
          staffId: user.staffId,
          date: today,
        },
      },
    })

    if (existing && existing.clockIn) {
      return NextResponse.json(
        { error: 'Already clocked in today' },
        { status: 400 }
      )
    }

    const clockInTime = new Date()

    if (existing) {
      // Update existing record
      const attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          clockIn: clockInTime,
          status: 'present',
        },
        include: { staff: true },
      })

      return NextResponse.json(attendance)
    } else {
      // Create new record
      const attendance = await prisma.attendance.create({
        data: {
          staffId: user.staffId,
          date: today,
          clockIn: clockInTime,
          status: 'present',
        },
        include: { staff: true },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'CLOCK_IN',
          user: user.email,
          staffId: user.staffId,
          details: `Clocked in at ${clockInTime.toISOString()}`,
        },
      })

      return NextResponse.json(attendance, { status: 201 })
    }
  } catch (error) {
    console.error('Error clocking in:', error)
    return NextResponse.json(
      { error: 'Failed to clock in' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['employee', 'hr', 'admin', 'manager'] })

