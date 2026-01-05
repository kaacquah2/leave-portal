/**
 * Pending Leave Approvals for HR Director
 * Returns leave requests pending HR Director approval (HR staff leave)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { getUserRBACContext } from '@/lib/roles'
import { getApprovalSteps } from '@/lib/ghana-civil-service-approval-workflow-db'
import { isHRMD } from '@/lib/ghana-civil-service-unit-mapping'

// Force static export configuration

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export function generateStaticParams() {
  return []
}

export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const rbacContext = await getUserRBACContext(user)
    if (!rbacContext) {
      return NextResponse.json({ error: 'Unable to verify user permissions' }, { status: 500 })
    }

    // Get all leave requests with pending HR Director approval
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

    // Filter leaves where HR Director approval is pending (HR staff leave)
    const pendingHRDirectorLeaves = leaves.filter(leave => {
      // Check if leave is from HRMD staff
      if (!isHRMD(leave.staff.unit)) {
        return false
      }

      const steps = leave.approvalSteps || []
      const hrDirectorStep = steps.find(s => s.approverRole === 'HR_DIRECTOR' && s.status === 'pending')
      
      return !!hrDirectorStep
    })

    return NextResponse.json({
      leaves: pendingHRDirectorLeaves,
      count: pendingHRDirectorLeaves.length,
    })
  } catch (error) {
    console.error('Error fetching HR Director pending approvals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['HR_DIRECTOR', 'hr_director'] })

