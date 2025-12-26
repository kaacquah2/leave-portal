import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET single attendance record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const attendance = await prisma.attendance.findUnique({
        where: { id },
        include: { staff: true },
      })

      if (!attendance) {
        return NextResponse.json(
          { error: 'Attendance record not found' },
          { status: 404 }
        )
      }

      // Employees can only view their own attendance
      if (user.role === 'employee' && attendance.staffId !== user.staffId) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      return NextResponse.json(attendance)
    } catch (error) {
      console.error('Error fetching attendance:', error)
      return NextResponse.json(
        { error: 'Failed to fetch attendance' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })(request)
}

// PATCH update attendance record
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const existing = await prisma.attendance.findUnique({
        where: { id },
      })

      if (!existing) {
        return NextResponse.json(
          { error: 'Attendance record not found' },
          { status: 404 }
        )
      }

      // Employees can only update their own attendance
      if (user.role === 'employee' && existing.staffId !== user.staffId) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const { clockIn, clockOut, breakDuration, status, notes, correctedBy, correctionReason } = body

      // Calculate total hours if clock in/out provided
      let totalHours = existing.totalHours
      if (clockIn && clockOut) {
        const start = new Date(clockIn)
        const end = new Date(clockOut)
        const diffMs = end.getTime() - start.getTime()
        const diffHours = diffMs / (1000 * 60 * 60)
        totalHours = breakDuration ? diffHours - (breakDuration / 60) : diffHours
      }

      const attendance = await prisma.attendance.update({
      where: { id },
      data: {
        clockIn: clockIn ? new Date(clockIn) : existing.clockIn,
        clockOut: clockOut ? new Date(clockOut) : existing.clockOut,
        breakDuration: breakDuration !== undefined ? breakDuration : existing.breakDuration,
        totalHours,
        status: status || existing.status,
        notes: notes !== undefined ? notes : existing.notes,
        correctedBy: correctedBy || existing.correctedBy,
        correctionReason: correctionReason || existing.correctionReason,
      },
      include: { staff: true },
    })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'ATTENDANCE_UPDATED',
          user: user.email,
          staffId: attendance.staffId,
          details: `Attendance record updated for ${attendance.date.toISOString()}`,
        },
      })

      return NextResponse.json(attendance)
    } catch (error) {
      console.error('Error updating attendance:', error)
      return NextResponse.json(
        { error: 'Failed to update attendance' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })(request)
}

// DELETE attendance record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {

      await prisma.attendance.delete({
        where: { id },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'ATTENDANCE_DELETED',
          user: user.email,
          details: `Attendance record deleted: ${id}`,
        },
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error deleting attendance:', error)
      return NextResponse.json(
        { error: 'Failed to delete attendance' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

