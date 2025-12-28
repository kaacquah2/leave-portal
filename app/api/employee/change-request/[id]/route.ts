import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// PATCH update change request status (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request }: AuthContext) => {
    try {
    const body = await request.json()
    const { status, rejectionReason } = body

    // Only HR and Admin can approve/reject
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only HR and Admin can review change requests' },
        { status: 403 }
      )
    }

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "approved" or "rejected"' },
        { status: 400 }
      )
    }

    // Find change request
    const changeRequest = await prisma.profileChangeRequest.findUnique({
      where: { id },
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

    if (!changeRequest) {
      return NextResponse.json(
        { error: 'Change request not found' },
        { status: 404 }
      )
    }

    if (changeRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Change request has already been reviewed' },
        { status: 400 }
      )
    }

    // Update change request
    const updated = await prisma.profileChangeRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy: user.email || 'system',
        reviewedAt: new Date(),
        ...(status === 'rejected' && rejectionReason && { rejectionReason }),
        ...(status === 'approved' && { completedAt: new Date() }),
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: `PROFILE_CHANGE_${status.toUpperCase()}`,
        user: user.email || 'system',
        staffId: changeRequest.staffId,
        details: `Profile change request ${status} for ${changeRequest.section} section`,
      },
    })

    // If approved, create notification for employee
    if (status === 'approved') {
      const staffUser = await prisma.user.findUnique({
        where: { staffId: changeRequest.staffId },
      })

      if (staffUser) {
        await prisma.notification.create({
          data: {
            userId: staffUser.id,
            staffId: changeRequest.staffId,
            type: 'system',
            title: 'Profile Change Approved',
            message: `Your request to update ${changeRequest.section} information has been approved.`,
            link: `/employee?tab=profile`,
          },
        })
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating change request:', error)
    return NextResponse.json(
      { error: 'Failed to update change request' },
      { status: 500 }
    )
  }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

