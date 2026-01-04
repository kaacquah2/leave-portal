/**
 * Leave Deferment Request Approval API
 * Handles approval workflow: Supervisor → HR → Authorized Officer
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import { sendNotification } from '@/lib/notification-service'

// Force static export configuration (required for static export mode)
// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

// PATCH approve/reject deferment request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      const body = await req.json()
      const { action, comments } = body // action: 'approve' | 'reject'

      if (!action || !['approve', 'reject'].includes(action)) {
        return NextResponse.json(
          { error: 'action must be "approve" or "reject"' },
          { status: 400 }
        )
      }

      const deferment = await prisma.leaveDefermentRequest.findUnique({
        where: { id },
        include: {
          staff: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              email: true,
              immediateSupervisorId: true,
              managerId: true,
            },
          },
        },
      })

      if (!deferment) {
        return NextResponse.json({ error: 'Deferment request not found' }, { status: 404 })
      }

      const currentUserStaff = await prisma.staffMember.findUnique({
        where: { staffId: user.staffId || undefined },
        select: { staffId: true },
      })

      if (!currentUserStaff) {
        return NextResponse.json({ error: 'Staff record not found' }, { status: 404 })
      }

      // Determine current workflow stage and next stage
      let updateData: any = {}
      let nextNotifiedRole: string | null = null

      if (deferment.status === 'pending') {
        // Supervisor approval stage
        if (!hasPermission(user.role as any, 'leave:approve:team')) {
          return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        // Verify supervisor is the staff's supervisor
        if (deferment.staff.immediateSupervisorId !== currentUserStaff.staffId &&
            deferment.staff.managerId !== currentUserStaff.staffId) {
          return NextResponse.json({ error: 'You are not authorized to approve this request' }, { status: 403 })
        }

        if (action === 'approve') {
          updateData = {
            status: 'supervisor_approved',
            supervisorRecommendation: comments || 'Approved by supervisor',
            supervisorApprovedBy: user.id,
            supervisorApprovedAt: new Date(),
          }
          nextNotifiedRole = 'HR_OFFICER'
        } else {
          updateData = {
            status: 'rejected',
            rejectedBy: user.id,
            rejectedAt: new Date(),
            rejectionReason: comments || 'Rejected by supervisor',
          }
        }
      } else if (deferment.status === 'supervisor_approved') {
        // HR validation stage
        if (!hasPermission(user.role as any, 'leave:approve:all')) {
          return NextResponse.json({ error: 'Permission denied - HR access required' }, { status: 403 })
        }

        if (action === 'approve') {
          updateData = {
            status: 'hr_validated',
            hrValidation: comments || 'Validated by HR',
            hrValidatedBy: user.id,
            hrValidatedAt: new Date(),
          }
          nextNotifiedRole = 'CHIEF_DIRECTOR' // Authorized Officer
        } else {
          updateData = {
            status: 'rejected',
            rejectedBy: user.id,
            rejectedAt: new Date(),
            rejectionReason: comments || 'Rejected by HR',
          }
        }
      } else if (deferment.status === 'hr_validated') {
        // Authorized Officer (Chief Director) final approval
        if (user.role !== 'CHIEF_DIRECTOR' && user.role !== 'chief_director' && user.role !== 'HR_DIRECTOR' && user.role !== 'hr_director') {
          return NextResponse.json({ error: 'Permission denied - Authorized Officer access required' }, { status: 403 })
        }

        if (action === 'approve') {
          updateData = {
            status: 'approved',
            authorizedOfficer: `${user.email}`,
            authorizedOfficerApprovedBy: user.id,
            authorizedOfficerApprovedAt: new Date(),
            approvedBy: user.id,
            approvedAt: new Date(),
          }
        } else {
          updateData = {
            status: 'rejected',
            rejectedBy: user.id,
            rejectedAt: new Date(),
            rejectionReason: comments || 'Rejected by authorized officer',
          }
        }
      } else {
        return NextResponse.json(
          { error: `Cannot ${action} request in ${deferment.status} status` },
          { status: 400 }
        )
      }

      const updatedDeferment = await prisma.leaveDefermentRequest.update({
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

      // Notify employee
      const employeeUser = await prisma.user.findFirst({
        where: { staffId: deferment.staffId },
      })

      if (employeeUser) {
        const portalUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        await sendNotification({
          userId: employeeUser.id,
          type: action === 'approve' ? 'leave_approved' : 'leave_rejected',
          title: `Deferment Request ${action === 'approve' ? 'Approved' : 'Rejected'}`,
          message: `Your leave deferment request for ${deferment.unusedDays} ${deferment.leaveType} days has been ${action === 'approve' ? 'approved' : 'rejected'}. ${comments ? `Comments: ${comments}` : ''}`,
          link: portalUrl ? `${portalUrl}/deferments/${id}` : `/deferments/${id}`,
          priority: 'normal',
        })
      }

      // Notify next approver if approved
      if (action === 'approve' && nextNotifiedRole) {
        const nextApprovers = await prisma.user.findMany({
          where: {
            role: { in: [nextNotifiedRole, nextNotifiedRole.toLowerCase()] },
            active: true,
          },
        })

        const portalUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        for (const approver of nextApprovers) {
          await sendNotification({
            userId: approver.id,
            type: 'leave_reminder',
            title: 'Leave Deferment Request - Action Required',
            message: `Deferment request from ${deferment.staff.firstName} ${deferment.staff.lastName} (${deferment.unusedDays} ${deferment.leaveType} days) requires your approval.`,
            link: portalUrl ? `${portalUrl}/deferments/${id}` : `/deferments/${id}`,
            priority: 'high',
          })
        }
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: `LEAVE_DEFERMENT_${action.toUpperCase()}`,
          user: user.email || 'unknown',
          userRole: user.role,
          details: JSON.stringify({
            defermentId: id,
            staffId: deferment.staffId,
            previousStatus: deferment.status,
            newStatus: updatedDeferment.status,
            comments,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        deferment: updatedDeferment,
        message: `Deferment request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      })
    } catch (error: any) {
      console.error('Error updating deferment request:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update deferment request' },
        { status: 500 }
      )
    }
  })(request)
}

