import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET single timesheet
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const timesheet = await prisma.timesheet.findUnique({
        where: { id },
        include: { staff: true },
      })

      if (!timesheet) {
        return NextResponse.json(
          { error: 'Timesheet not found' },
          { status: 404 }
        )
      }

      // Employees can only view their own timesheets
      if (user.role === 'employee' && timesheet.staffId !== user.staffId) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      return NextResponse.json(timesheet)
    } catch (error) {
      console.error('Error fetching timesheet:', error)
      return NextResponse.json(
        { error: 'Failed to fetch timesheet' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })(request)
}

// PATCH update timesheet
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {

    const body = await request.json()
    const { hours, status, comments } = body

    const existing = await prisma.timesheet.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (user.role === 'employee' && existing.staffId !== user.staffId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Calculate total hours if hours updated
    let totalHours = existing.totalHours
    if (hours) {
      totalHours = Array.isArray(hours)
        ? hours.reduce((sum: number, day: any) => sum + (day.hours || 0), 0)
        : existing.totalHours
    }

    const updateData: any = {
      totalHours,
    }

    if (hours) updateData.hours = hours
    if (status) {
      updateData.status = status
      if (status === 'submitted') {
        updateData.submittedAt = new Date()
      }
    }
    if (comments !== undefined) updateData.comments = comments

    const timesheet = await prisma.timesheet.update({
      where: { id },
      data: updateData,
      include: { staff: true },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'TIMESHEET_UPDATED',
        user: user.email,
        staffId: timesheet.staffId,
        details: `Timesheet updated: ${status || 'edited'}`,
      },
    })

    return NextResponse.json(timesheet)
    } catch (error) {
      console.error('Error updating timesheet:', error)
      return NextResponse.json(
        { error: 'Failed to update timesheet' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })(request)
}

