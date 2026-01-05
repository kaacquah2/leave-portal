/**
 * Pending Leave Approvals for Head of Department (HoD)
 * Returns leave requests pending HoD approval (Director or Head of Independent Unit)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { getUserRBACContext } from '@/lib/roles'
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

    // Get all leave requests with pending HoD approval
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

    // Filter leaves where HoD approval is pending
    const pendingHoDLeaves = leaves.filter(leave => {
      const steps = leave.approvalSteps || []
      const hodStep = steps.find(s => 
        (s.approverRole === 'HEAD_OF_DEPARTMENT' || s.approverRole === 'DIRECTOR') && 
        s.status === 'pending'
      )
      
      if (hodStep) {
        // Check if user is the HoD (Director of same directorate or Head of Independent Unit)
        if (rbacContext.directorate && leave.staff.directorate === rbacContext.directorate) {
          return true
        }
        // For independent units, check if user is head of that unit
        if (rbacContext.unit && leave.staff.unit === rbacContext.unit) {
          return true
        }
      }
      return false
    })

    return NextResponse.json({
      leaves: pendingHoDLeaves,
      count: pendingHoDLeaves.length,
    })
  } catch (error) {
    console.error('Error fetching HoD pending approvals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['HEAD_OF_DEPARTMENT', 'DIRECTOR', 'head_of_department', 'hod', 'director', 'directorate_head', 'deputy_director'] })

