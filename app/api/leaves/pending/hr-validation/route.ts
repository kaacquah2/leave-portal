/**
 * Pending HR Validation
 * Returns leave requests pending HR Officer validation (mandatory before final approval)
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

    // Get all leave requests with pending HR validation
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'pending',
        hrValidated: false, // HR validation not yet completed
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

    // Filter leaves where HR Officer validation is pending
    const pendingHRValidationLeaves = leaves.filter(leave => {
      const steps = leave.approvalSteps || []
      const hrStep = steps.find(s => s.approverRole === 'HR_OFFICER' && s.status === 'pending')
      
      // Check if previous levels are approved (HR validation comes after HoD)
      if (hrStep) {
        const previousSteps = steps.filter(s => s.level < hrStep.level)
        const allPreviousApproved = previousSteps.every(s => s.status === 'approved' || s.status === 'skipped')
        return allPreviousApproved
      }
      return false
    })

    return NextResponse.json({
      leaves: pendingHRValidationLeaves,
      count: pendingHRValidationLeaves.length,
    })
  } catch (error) {
    console.error('Error fetching HR validation pending approvals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['HR_OFFICER', 'hr_officer', 'hr', 'hr_assistant'] })

