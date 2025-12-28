import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'


// GET approval history for a leave request
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url)
    const leaveRequestId = searchParams.get('leaveRequestId')

    if (!leaveRequestId) {
      return NextResponse.json({ error: 'leaveRequestId is required' }, { status: 400 })
    }

    // Check if user has permission to view this leave request
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      select: { staffId: true },
    })

    if (!leave) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    // Employees can only view their own leave history
    if (user.role === 'employee' && user.staffId !== leave.staffId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get approval history from audit logs (filtered for this leave request)
    const history = await prisma.auditLog.findMany({
      where: {
        details: {
          contains: leaveRequestId,
        },
        OR: [
          { action: 'leave_approved' },
          { action: 'leave_rejected' },
          { action: 'leave_delegated' },
          { action: 'leave_escalated' },
          { action: 'leave_reminder_sent' },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    })

    // Also get from approvalLevels if available
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      select: { approvalLevels: true, createdAt: true },
    })

    const approvalHistory: any[] = []

    // Add submission event
    approvalHistory.push({
      id: `submission-${leaveRequestId}`,
      leaveRequestId,
      action: 'submitted',
      performedBy: leave.staffId,
      performedByName: 'Staff Member',
      performedAt: leaveRequest?.createdAt.toISOString() || new Date().toISOString(),
      level: undefined,
      comments: 'Leave request submitted',
    })

    // Parse approval levels for history
    if (leaveRequest?.approvalLevels) {
      const levels = leaveRequest.approvalLevels as any[]
      levels.forEach((level) => {
        if (level.status !== 'pending' && level.approvalDate) {
          approvalHistory.push({
            id: `level-${level.level}-${leaveRequestId}`,
            leaveRequestId,
            action: level.status === 'approved' ? 'approved' : 'rejected',
            performedBy: level.approverName || 'Unknown',
            performedByName: level.approverName || 'Unknown',
            performedAt: level.approvalDate,
            level: level.level,
            comments: level.comments,
            previousStatus: 'pending',
            newStatus: level.status,
          })
        }

        if (level.delegatedTo && level.delegationDate) {
          approvalHistory.push({
            id: `delegation-${level.level}-${leaveRequestId}`,
            leaveRequestId,
            action: 'delegated',
            performedBy: level.approverName || 'Unknown',
            performedByName: level.approverName || 'Unknown',
            performedAt: level.delegationDate,
            level: level.level,
            comments: `Delegated to ${level.delegatedToName || 'delegate'}`,
            metadata: {
              delegatedTo: level.delegatedTo,
              delegatedToName: level.delegatedToName,
            },
          })
        }
      })
    }

    // Add audit log entries
    history.forEach((log) => {
      approvalHistory.push({
        id: log.id,
        leaveRequestId,
        action: log.action.replace('leave_', '') as any,
        performedBy: log.user,
        performedByName: log.user,
        performedAt: log.timestamp.toISOString(),
        comments: log.details,
      })
    })

    // Sort by date
    approvalHistory.sort((a, b) => 
      new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
    )

    return NextResponse.json(approvalHistory)
  } catch (error) {
    console.error('Error fetching approval history:', error)
    return NextResponse.json({ error: 'Failed to fetch approval history' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

// POST create approval history entry
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const body = await request.json()
    const { leaveRequestId, action, level, comments, previousStatus, newStatus, metadata } = body

    if (!leaveRequestId || !action) {
      return NextResponse.json({ error: 'leaveRequestId and action are required' }, { status: 400 })
    }

    // Create audit log entry
    const staffMember = await prisma.staffMember.findUnique({
      where: { staffId: user.staffId || '' },
      select: { firstName: true, lastName: true },
    })

    const performedByName = staffMember
      ? `${staffMember.firstName} ${staffMember.lastName}`
      : user.email || 'Unknown'

    await prisma.auditLog.create({
      data: {
        action: `leave_${action}`,
        user: user.email || 'system',
        staffId: user.staffId || undefined,
        details: JSON.stringify({
          leaveRequestId,
          level,
          comments,
          previousStatus,
          newStatus,
          metadata,
          performedBy: performedByName,
        }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating approval history:', error)
    return NextResponse.json({ error: 'Failed to create approval history' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin', 'manager'] })

