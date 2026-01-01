/**
 * GET /api/performance/pips/[id]
 * PATCH /api/performance/pips/[id]
 * DELETE /api/performance/pips/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'

// Force static export configuration (required for static export mode)

// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const { id } = await params

      const pip = await prisma.performanceImprovementPlan.findUnique({
        where: { id },
        include: {
          staff: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              department: true,
            },
          },
        },
      })

      if (!pip) {
        return NextResponse.json(
          { error: 'Performance Improvement Plan not found' },
          { status: 404 }
        )
      }

      // Check permission
      if (pip.staffId !== user.staffId && !['HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN', 'hr', 'hr_officer', 'hr_director', 'admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      return NextResponse.json(pip)
    } catch (error: any) {
      console.error('Error fetching performance improvement plan:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch performance improvement plan' },
        { status: 500 }
      )
    }
  })(request)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      const { id } = await params
      const body = await req.json()

      const pip = await prisma.performanceImprovementPlan.findUnique({
        where: { id },
      })

      if (!pip) {
        return NextResponse.json(
          { error: 'Performance Improvement Plan not found' },
          { status: 404 }
        )
      }

      // Only HR/Admin can update
      if (!['HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN', 'hr', 'hr_officer', 'hr_director', 'admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const updated = await prisma.performanceImprovementPlan.update({
        where: { id },
        data: {
          ...(body.title && { title: body.title }),
          ...(body.description && { description: body.description }),
          ...(body.performanceIssues && { performanceIssues: body.performanceIssues }),
          ...(body.expectedOutcomes && { expectedOutcomes: body.expectedOutcomes }),
          ...(body.actionItems && { actionItems: body.actionItems }),
          ...(body.startDate && { startDate: new Date(body.startDate) }),
          ...(body.endDate && { endDate: new Date(body.endDate) }),
          ...(body.reviewDate && { reviewDate: new Date(body.reviewDate) }),
          ...(body.status && { status: body.status }),
          ...(body.progressNotes && { progressNotes: body.progressNotes }),
          ...(body.outcome && { outcome: body.outcome }),
          ...(body.outcomeNotes && { outcomeNotes: body.outcomeNotes }),
          ...(body.approvedBy && { approvedBy: body.approvedBy, approvedAt: new Date() }),
        },
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

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'PERFORMANCE_IMPROVEMENT_PLAN_UPDATED',
          user: user.email,
          userRole: user.role,
          staffId: pip.staffId,
          details: `Updated Performance Improvement Plan: ${updated.title}`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json(updated)
    } catch (error: any) {
      console.error('Error updating performance improvement plan:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update performance improvement plan' },
        { status: 500 }
      )
    }
  })(request)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      const { id } = await params

      const pip = await prisma.performanceImprovementPlan.findUnique({
        where: { id },
      })

      if (!pip) {
        return NextResponse.json(
          { error: 'Performance Improvement Plan not found' },
          { status: 404 }
        )
      }

      // Only HR/Admin can delete
      if (!['HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN', 'hr', 'hr_officer', 'hr_director', 'admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      await prisma.performanceImprovementPlan.delete({
        where: { id },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'PERFORMANCE_IMPROVEMENT_PLAN_DELETED',
          user: user.email,
          userRole: user.role,
          staffId: pip.staffId,
          details: `Deleted Performance Improvement Plan: ${pip.title}`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json({ success: true })
    } catch (error: any) {
      console.error('Error deleting performance improvement plan:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to delete performance improvement plan' },
        { status: 500 }
      )
    }
  })(request)
}

