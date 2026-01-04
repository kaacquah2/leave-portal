/**
 * Pending Leave Approvals for Head of Independent Unit
 * Returns leave requests pending Head of Independent Unit approval
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { getUserRBACContext } from '@/lib/mofa-rbac-middleware'
import { getApprovalSteps } from '@/lib/ghana-civil-service-approval-workflow-db'
import { isIndependentUnit } from '@/lib/ghana-civil-service-unit-mapping'

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

    // Get all leave requests with pending Head of Independent Unit approval
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

    // Filter leaves where Head of Independent Unit approval is pending
    const pendingIndependentUnitLeaves = leaves.filter(leave => {
      // Check if the leave is from an independent unit
      if (!isIndependentUnit(leave.staff.unit)) {
        return false
      }

      const steps = leave.approvalSteps || []
      const hodStep = steps.find(s => 
        s.approverRole === 'HEAD_OF_INDEPENDENT_UNIT' && 
        s.status === 'pending'
      )
      
      // Check if user is the Head of Independent Unit (same unit)
      if (hodStep && rbacContext.unit && leave.staff.unit === rbacContext.unit) {
        return true
      }
      return false
    })

    return NextResponse.json({
      leaves: pendingIndependentUnitLeaves,
      count: pendingIndependentUnitLeaves.length,
    })
  } catch (error) {
    console.error('Error fetching independent unit pending approvals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['HEAD_OF_INDEPENDENT_UNIT', 'head_of_independent_unit'] })

