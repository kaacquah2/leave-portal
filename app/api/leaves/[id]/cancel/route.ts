import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
    })

    if (!leave) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (user.role === 'employee' && leave.staffId !== user.staffId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Can only cancel pending or approved leaves
    if (leave.status === 'rejected') {
      return NextResponse.json(
        { error: 'Cannot cancel a rejected leave request' },
        { status: 400 }
      )
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'cancelled',
      },
      include: { staff: true },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        staffId: leave.staffId,
        type: 'leave_cancelled',
        title: 'Leave Request Cancelled',
        message: `Your leave request for ${leave.startDate.toISOString().split('T')[0]} has been cancelled.`,
        link: `/leaves/${id}`,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'LEAVE_CANCELLED',
        user: user.email,
        staffId: leave.staffId,
        details: `Leave request cancelled: ${leave.leaveType} from ${leave.startDate.toISOString()}`,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error cancelling leave:', error)
    return NextResponse.json(
      { error: 'Failed to cancel leave request' },
      { status: 500 }
    )
  }
}

