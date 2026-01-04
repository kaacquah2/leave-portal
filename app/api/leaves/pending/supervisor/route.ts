/**
 * Pending Leave Approvals for Supervisor
 * Returns leave requests pending supervisor approval
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { getUserRBACContext } from '@/lib/mofa-rbac-middleware'
import { getApprovalSteps } from '@/lib/ghana-civil-service-approval-workflow-db'

// Force static export configuration

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export function generateStaticParams() {
  return []
}

export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const rbacContext = await getUserRBACContext(user)
    if (!rbacContext) {
      return NextResponse.json({ error: 'Unable to verify user permissions' }, { status: 500 })
    }

    // Get all leave requests with pending supervisor approval
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'pending',
      },
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            email: true,
            unit: true,
            directorate: true,
            immediateSupervisorId: true,
          },
        },
        approvalSteps: {
          orderBy: { level: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Filter leaves where supervisor approval is pending
    const pendingSupervisorLeaves = leaves.filter(leave => {
      const steps = leave.approvalSteps || []
      const supervisorStep = steps.find(s => s.approverRole === 'SUPERVISOR' && s.status === 'pending')
      
      // Check if user is the supervisor (via immediateSupervisorId or unit-based)
      if (supervisorStep && user.staffId) {
        return leave.staff.immediateSupervisorId === user.staffId ||
               (rbacContext.unit && leave.staff.unit === rbacContext.unit)
      }
      return false
    })

    return NextResponse.json({
      leaves: pendingSupervisorLeaves,
      count: pendingSupervisorLeaves.length,
    })
  } catch (error) {
    console.error('Error fetching supervisor pending approvals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['SUPERVISOR', 'supervisor', 'manager'] })

