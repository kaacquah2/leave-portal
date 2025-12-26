import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request }: AuthContext) => {
    try {

    const body = await request.json()
    const { approved } = body // true for approve, false for reject

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

    if (timesheet.status !== 'submitted') {
      return NextResponse.json(
        { error: 'Timesheet must be submitted before approval' },
        { status: 400 }
      )
    }

    const updated = await prisma.timesheet.update({
      where: { id },
      data: {
        status: approved ? 'approved' : 'rejected',
        approvedBy: approved ? user.email : null,
        approvedAt: approved ? new Date() : null,
        rejectedBy: approved ? null : user.email,
        rejectedAt: approved ? null : new Date(),
      },
      include: { staff: true },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        staffId: timesheet.staffId,
        type: approved ? 'timesheet_approved' : 'timesheet_rejected',
        title: `Timesheet ${approved ? 'Approved' : 'Rejected'}`,
        message: `Your timesheet for week ${timesheet.weekStart.toISOString().split('T')[0]} has been ${approved ? 'approved' : 'rejected'}.`,
        link: `/timesheets/${id}`,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: approved ? 'TIMESHEET_APPROVED' : 'TIMESHEET_REJECTED',
        user: user.email,
        staffId: timesheet.staffId,
        details: `Timesheet ${approved ? 'approved' : 'rejected'} for week ${timesheet.weekStart.toISOString()}`,
      },
    })

      return NextResponse.json(updated)
    } catch (error) {
      console.error('Error approving timesheet:', error)
      return NextResponse.json(
        { error: 'Failed to approve timesheet' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin', 'manager'] })(request)
}

