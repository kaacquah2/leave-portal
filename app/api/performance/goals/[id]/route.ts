/**
 * GET /api/performance/goals/[id]
 * PATCH /api/performance/goals/[id]
 * DELETE /api/performance/goals/[id]
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

      const goal = await prisma.performanceGoal.findUnique({
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

      if (!goal) {
        return NextResponse.json(
          { error: 'Performance goal not found' },
          { status: 404 }
        )
      }

      // Check permission
      if (goal.staffId !== user.staffId && !['HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN', 'hr', 'hr_officer', 'hr_director', 'admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      return NextResponse.json(goal)
    } catch (error: any) {
      console.error('Error fetching performance goal:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch performance goal' },
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

      const goal = await prisma.performanceGoal.findUnique({
        where: { id },
      })

      if (!goal) {
        return NextResponse.json(
          { error: 'Performance goal not found' },
          { status: 404 }
        )
      }

      // Check permission
      if (goal.staffId !== user.staffId && !['HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN', 'hr', 'hr_officer', 'hr_director', 'admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const updated = await prisma.performanceGoal.update({
        where: { id },
        data: {
          ...(body.title && { title: body.title }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.category && { category: body.category }),
          ...(body.targetValue !== undefined && { targetValue: body.targetValue }),
          ...(body.currentValue !== undefined && { currentValue: body.currentValue }),
          ...(body.dueDate && { dueDate: new Date(body.dueDate) }),
          ...(body.status && { status: body.status }),
          ...(body.progress !== undefined && { progress: body.progress }),
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
          action: 'PERFORMANCE_GOAL_UPDATED',
          user: user.email,
          userRole: user.role,
          staffId: goal.staffId,
          details: `Updated performance goal: ${updated.title}`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json(updated)
    } catch (error: any) {
      console.error('Error updating performance goal:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update performance goal' },
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

      const goal = await prisma.performanceGoal.findUnique({
        where: { id },
      })

      if (!goal) {
        return NextResponse.json(
          { error: 'Performance goal not found' },
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

      await prisma.performanceGoal.delete({
        where: { id },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'PERFORMANCE_GOAL_DELETED',
          user: user.email,
          userRole: user.role,
          staffId: goal.staffId,
          details: `Deleted performance goal: ${goal.title}`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json({ success: true })
    } catch (error: any) {
      console.error('Error deleting performance goal:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to delete performance goal' },
        { status: 500 }
      )
    }
  })(request)
}

