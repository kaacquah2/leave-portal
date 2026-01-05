/**
 * GET /api/performance/goals
 * POST /api/performance/goals
 * 
 * Get and create performance goals
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const staffId = searchParams.get('staffId')
      const status = searchParams.get('status')

      const where: any = {}

      if (staffId) {
        where.staffId = staffId
      } else if (!['HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN', 'hr', 'hr_officer', 'hr_director', 'admin'].includes(user.role)) {
        if (user.staffId) {
          where.staffId = user.staffId
        } else {
          return NextResponse.json([])
        }
      }

      if (status) {
        where.status = status
      }

      const goals = await prisma.performanceGoal.findMany({
        where,
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
        orderBy: { dueDate: 'asc' },
      })

      return NextResponse.json(goals)
    } catch (error: any) {
      console.error('Error fetching performance goals:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch performance goals' },
        { status: 500 }
      )
    }
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      const body = await req.json()
      const {
        staffId,
        title,
        description,
        category,
        targetValue,
        currentValue,
        dueDate,
        reviewId,
      } = body

      if (!staffId || !title || !category) {
        return NextResponse.json(
          { error: 'staffId, title, and category are required' },
          { status: 400 }
        )
      }

      // Check if user has permission to create goals for this staff
      if (staffId !== user.staffId && !['HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN', 'hr', 'hr_officer', 'hr_director', 'admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const goal = await prisma.performanceGoal.create({
        data: {
          staffId,
          title,
          description,
          category,
          targetValue,
          currentValue,
          dueDate: dueDate ? new Date(dueDate) : null,
          reviewId,
          createdBy: user.email,
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
          action: 'PERFORMANCE_GOAL_CREATED',
          user: user.email,
          userRole: user.role,
          staffId,
          details: `Created performance goal: ${title} for ${staffId}`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json(goal, { status: 201 })
    } catch (error: any) {
      console.error('Error creating performance goal:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create performance goal' },
        { status: 500 }
      )
    }
  })(request)
}

