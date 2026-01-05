/**
 * Pending Leave Approvals for Director
 * Returns leave requests pending director approval (Unit Head leave)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { getUserRBACContext } from '@/lib/roles'
import { getApprovalSteps } from '@/lib/ghana-civil-service-approval-workflow-db'

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

    // Get all leave requests with pending director approval
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
            position: true,
          },
        },
        approvalSteps: {
          orderBy: { level: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Filter leaves where director approval is pending (typically Unit Head leave)
    const pendingDirectorLeaves = leaves.filter(leave => {
      const steps = leave.approvalSteps || []
      const directorStep = steps.find(s => 
        (s.approverRole === 'DIRECTOR' || s.approverRole === 'HEAD_OF_DEPARTMENT') && 
        s.status === 'pending'
      )
      
      // Check if user is the director (same directorate)
      if (directorStep && rbacContext.directorate && leave.staff.directorate === rbacContext.directorate) {
        return true
      }
      return false
    })

    return NextResponse.json({
      leaves: pendingDirectorLeaves,
      count: pendingDirectorLeaves.length,
    })
  } catch (error) {
    console.error('Error fetching director pending approvals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['DIRECTOR', 'director', 'directorate_head', 'deputy_director'] })

