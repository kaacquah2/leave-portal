/**
 * Pending Leave Approvals for Unit Head
 * Returns leave requests pending unit head approval
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

    // Get all leave requests with pending unit head approval
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
          },
        },
        approvalSteps: {
          orderBy: { level: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Filter leaves where unit head approval is pending and user is unit head
    const pendingUnitHeadLeaves = leaves.filter(leave => {
      const steps = leave.approvalSteps || []
      const unitHeadStep = steps.find(s => s.approverRole === 'UNIT_HEAD' && s.status === 'pending')
      
      // Check if user is the unit head (same unit)
      if (unitHeadStep && rbacContext.unit && leave.staff.unit === rbacContext.unit) {
        return true
      }
      return false
    })

    return NextResponse.json({
      leaves: pendingUnitHeadLeaves,
      count: pendingUnitHeadLeaves.length,
    })
  } catch (error) {
    console.error('Error fetching unit head pending approvals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['UNIT_HEAD', 'unit_head'] })

