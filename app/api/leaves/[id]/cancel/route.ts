import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth'
import { restoreLeaveBalance } from '@/lib/leave-balance-utils'
import { isEmployee } from '@/lib/auth-proxy'

// Force static export configuration (required for static export mode)

// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

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
    if (isEmployee({ role: user.role, staffId: user.staffId } as any) && leave.staffId !== user.staffId) {
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
    
    // CRITICAL FIX: Restore balance if leave was previously approved
    const wasApproved = leave.status === 'approved'
    if (wasApproved) {
      const restorationResult = await restoreLeaveBalance(
        leave.staffId,
        leave.leaveType,
        leave.days
      )
      
      if (!restorationResult.success) {
        console.error('Failed to restore leave balance on cancellation:', restorationResult.error)
        // Continue with cancellation but log error
      } else {
        // Log balance restoration
        await prisma.auditLog.create({
          data: {
            action: 'LEAVE_BALANCE_RESTORED',
            user: user.email || 'system',
            staffId: leave.staffId,
            details: JSON.stringify({
              leaveRequestId: id,
              leaveType: leave.leaveType,
              daysRestored: leave.days,
              newBalance: restorationResult.newBalance,
              reason: 'cancelled',
            }),
          },
        })
      }
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

