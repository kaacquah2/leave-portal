/**
 * Leave Encashment Request Approval API
 * Only HR Director or Chief Director can approve
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notification-service'

// Force static export configuration (required for static export mode)
// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

// PATCH approve/reject encashment request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR Director or Chief Director can approve
      if (user.role !== 'HR_DIRECTOR' && user.role !== 'hr_director' &&
          user.role !== 'CHIEF_DIRECTOR' && user.role !== 'chief_director') {
        return NextResponse.json({ error: 'Permission denied - HR Director or Chief Director access required' }, { status: 403 })
      }

      const body = await req.json()
      const { action, amount } = body // action: 'approve' | 'reject'

      if (!action || !['approve', 'reject'].includes(action)) {
        return NextResponse.json(
          { error: 'action must be "approve" or "reject"' },
          { status: 400 }
        )
      }

      const encashment = await prisma.leaveEncashmentRequest.findUnique({
        where: { id },
        include: {
          staff: {
            include: {
              leaveBalance: true,
            },
          },
        },
      })

      if (!encashment) {
        return NextResponse.json({ error: 'Encashment request not found' }, { status: 404 })
      }

      if (encashment.status !== 'pending') {
        return NextResponse.json(
          { error: `Cannot ${action} request in ${encashment.status} status` },
          { status: 400 }
        )
      }

      let updateData: any = {}

      if (action === 'approve') {
        // Verify staff has sufficient balance
        const balanceField = encashment.leaveType.toLowerCase() === 'annual' ? 'annual' :
                             encashment.leaveType.toLowerCase() === 'sick' ? 'sick' :
                             encashment.leaveType.toLowerCase() === 'special service' ? 'specialService' : null

        if (!balanceField || !encashment.staff.leaveBalance) {
          return NextResponse.json({ error: 'Invalid leave type or balance not found' }, { status: 400 })
        }

        const currentBalance = encashment.staff.leaveBalance[balanceField as keyof typeof encashment.staff.leaveBalance] as number
        if (currentBalance < encashment.days) {
          return NextResponse.json(
            { error: `Staff only has ${currentBalance} ${encashment.leaveType} days, cannot encash ${encashment.days} days` },
            { status: 400 }
          )
        }

        // Deduct leave balance
        await prisma.leaveBalance.update({
          where: { staffId: encashment.staffId },
          data: {
            [balanceField]: currentBalance - encashment.days,
          },
        })

        updateData = {
          status: 'approved',
          authorizedBy: user.id,
          approvedAt: new Date(),
          amount: amount || null, // Optional encashment amount
        }
      } else {
        updateData = {
          status: 'rejected',
          rejectedBy: user.id,
          rejectedAt: new Date(),
        }
      }

      const updatedEncashment = await prisma.leaveEncashmentRequest.update({
        where: { id },
        data: updateData,
        include: {
          staff: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      })

      // Notify staff member
      const staffUser = await prisma.user.findFirst({
        where: { staffId: encashment.staffId },
      })

      if (staffUser) {
        const portalUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        await sendNotification({
          userId: staffUser.id,
          type: action === 'approve' ? 'leave_approved' : 'leave_rejected',
          title: `Leave Encashment Request ${action === 'approve' ? 'Approved' : 'Rejected'}`,
          message: `Your leave encashment request for ${encashment.days} ${encashment.leaveType} days has been ${action === 'approve' ? 'approved' : 'rejected'}.${action === 'approve' && amount ? ` Amount: ${amount}` : ''}`,
          link: portalUrl ? `${portalUrl}/encashments/${id}` : `/encashments/${id}`,
          priority: 'normal',
        })
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: `LEAVE_ENCASHMENT_${action.toUpperCase()}`,
          user: user.email || 'unknown',
          userRole: user.role,
          details: JSON.stringify({
            encashmentId: id,
            staffId: encashment.staffId,
            leaveType: encashment.leaveType,
            days: encashment.days,
            reason: encashment.reason,
            amount: action === 'approve' ? amount : null,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        encashment: updatedEncashment,
        message: `Encashment request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      })
    } catch (error: any) {
      console.error('Error updating encashment request:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update encashment request' },
        { status: 500 }
      )
    }
  })(request)
}

