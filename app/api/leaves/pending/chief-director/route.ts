/**
 * Pending Leave Approvals for Chief Director
 * Returns leave requests pending Chief Director final approval
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

    // Get all leave requests with pending Chief Director approval
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'pending',
        hrValidated: true, // HR validation must be completed first
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
            grade: true,
          },
        },
        approvalSteps: {
          orderBy: { level: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Filter leaves where Chief Director approval is pending
    const pendingChiefDirectorLeaves = leaves.filter(leave => {
      const steps = leave.approvalSteps || []
      const chiefDirectorStep = steps.find(s => s.approverRole === 'CHIEF_DIRECTOR' && s.status === 'pending')
      
      // Check if all previous levels are approved
      if (chiefDirectorStep) {
        const previousSteps = steps.filter(s => s.level < chiefDirectorStep.level)
        const allPreviousApproved = previousSteps.every(s => s.status === 'approved' || s.status === 'skipped')
        return allPreviousApproved
      }
      return false
    })

    return NextResponse.json({
      leaves: pendingChiefDirectorLeaves,
      count: pendingChiefDirectorLeaves.length,
    })
  } catch (error) {
    console.error('Error fetching Chief Director pending approvals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['CHIEF_DIRECTOR', 'chief_director'] })

