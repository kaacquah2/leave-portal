import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin } from '@/lib/auth-proxy'
import { ADMIN_ROLES } from '@/lib/role-utils'

// Force static export configuration
export const dynamic = 'force-static'

// POST force leave approval/reversal
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only admin can access this route
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { leaveId, action, reason } = body

    if (!leaveId || !action) {
      return NextResponse.json(
        { error: 'Leave ID and action are required' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject', 'reverse'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be approve, reject, or reverse' },
        { status: 400 }
      )
    }

    // Get leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      )
    }

    let newStatus: 'approved' | 'rejected' | 'cancelled' = 'approved'
    if (action === 'reject') {
      newStatus = 'rejected'
    } else if (action === 'reverse') {
      newStatus = 'cancelled'
    }

    // Update leave request
    const updateData: any = {
      status: newStatus,
      approvedBy: action === 'reverse' ? null : `${user.email} (Admin Override)`,
      approvalDate: action === 'reverse' ? null : new Date(),
    }
    
    // Add rejection reason if rejecting (store in reason field or notes)
    if (action === 'reject' && reason) {
      // Store rejection reason in the reason field or create a note
      // Since rejectionReason doesn't exist, we'll update the reason field
      updateData.reason = `${leaveRequest.reason}\n\n[REJECTED - Admin Override]\nReason: ${reason}`
    }
    
    const updated = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: updateData,
    })

    // Update approval steps
    if (action !== 'reverse') {
      await prisma.approvalStep.updateMany({
        where: { leaveRequestId: leaveId },
        data: {
          status: newStatus,
          approverName: `${user.email} (Admin Override)`,
          approvalDate: new Date(),
        },
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ADMIN_OVERRIDE_LEAVE',
        user: user.email,
        userRole: user.role,
        staffId: leaveRequest.staffId,
        details: `Admin override: ${action} leave request ${leaveId} for ${leaveRequest.staff.firstName} ${leaveRequest.staff.lastName}. Reason: ${reason || 'Admin override'}`,
        timestamp: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      leaveRequest: updated,
      action,
      message: `Leave request ${action}d successfully`,
    })
  } catch (error) {
    console.error('Error performing leave override:', error)
    return NextResponse.json(
      { error: 'Failed to perform leave override' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

