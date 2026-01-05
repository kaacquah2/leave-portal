/**
 * GET /api/approvals/history
 * 
 * Get approval history for a leave request
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'

export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const leaveRequestId = searchParams.get('leaveRequestId')

      if (!leaveRequestId) {
        return NextResponse.json(
          { error: 'leaveRequestId is required' },
          { status: 400 }
        )
      }

      // Get leave request
      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id: leaveRequestId },
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

      // Get approval steps
      const approvalSteps = await prisma.approvalStep.findMany({
        where: { leaveRequestId },
        orderBy: { level: 'asc' },
      })

      // Get approval history
      const approvalHistory = await prisma.leaveApprovalHistory.findMany({
        where: { leaveRequestId },
        orderBy: { timestamp: 'asc' },
      })

      // Combine and format history
      const history = []

      // Add submission event
      history.push({
        id: `submission-${leaveRequest.id}`,
        action: 'submitted',
        actor: {
          staffId: leaveRequest.staff.staffId,
          name: `${leaveRequest.staff.firstName} ${leaveRequest.staff.lastName}`,
        },
        timestamp: leaveRequest.createdAt,
        comment: 'Leave request submitted',
        level: 0,
      })

      // Add approval steps
      for (const step of approvalSteps) {
        // Get approver info if approverStaffId exists
        let approverInfo: { staffId: string; name: string; email: string } | null = null
        if (step.approverStaffId) {
          const approver = await prisma.staffMember.findUnique({
            where: { staffId: step.approverStaffId },
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          })
          if (approver) {
            approverInfo = {
              staffId: approver.staffId,
              name: `${approver.firstName} ${approver.lastName}`,
              email: approver.email,
            }
          }
        }

        if (step.status === 'approved') {
          history.push({
            id: step.id,
            action: 'approved',
            actor: approverInfo,
            timestamp: step.approvalDate || step.createdAt,
            comment: step.comments || 'Approved',
            level: step.level,
            role: step.approverRole,
          })
        } else if (step.status === 'rejected') {
          history.push({
            id: step.id,
            action: 'rejected',
            actor: approverInfo,
            timestamp: step.approvalDate || step.createdAt,
            comment: step.comments || 'Rejected',
            level: step.level,
            role: step.approverRole,
          })
        } else if (step.status === 'pending') {
          history.push({
            id: step.id,
            action: 'pending',
            actor: approverInfo,
            timestamp: step.createdAt,
            comment: `Awaiting ${step.approverRole} approval`,
            level: step.level,
            role: step.approverRole,
          })
        }
      }

      // Add approval history records
      for (const record of approvalHistory) {
        history.push({
          id: record.id,
          action: record.action || 'updated',
          actor: {
            name: record.approverName || 'System',
          },
          timestamp: record.timestamp,
          comment: record.comments || record.action,
        })
      }

      // Sort by timestamp
      history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      // Format for component expectations
      const formattedHistory = history.map((entry) => ({
        id: entry.id,
        leaveRequestId,
        action: entry.action,
        performedBy: entry.actor?.staffId || (entry.actor && 'email' in entry.actor ? entry.actor.email : undefined) || 'system',
        performedByName: entry.actor?.name || 'System',
        performedAt: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
        level: entry.level,
        comments: entry.comment,
        previousStatus: 'previousStatus' in entry ? entry.previousStatus : undefined,
        newStatus: 'newStatus' in entry ? entry.newStatus : undefined,
        metadata: {
          role: entry.role,
          ...(entry.actor && 'email' in entry.actor && { email: entry.actor.email }),
        },
      }))

      return NextResponse.json(formattedHistory)
    } catch (error: any) {
      console.error('Error fetching approval history:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch approval history' },
        { status: 500 }
      )
    }
  })(request)
}

