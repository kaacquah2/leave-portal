/**
 * GET /api/performance/feedback360
 * POST /api/performance/feedback360
 * 
 * Get and create 360-degree feedback
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
      const reviewPeriod = searchParams.get('reviewPeriod')
      const reviewerId = searchParams.get('reviewerId')

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

      if (reviewPeriod) {
        where.reviewPeriod = reviewPeriod
      }

      if (reviewerId) {
        where.reviewerId = reviewerId
      }

      const feedbacks = await prisma.feedback360.findMany({
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
        orderBy: { submittedAt: 'desc' },
      })

      return NextResponse.json(feedbacks)
    } catch (error: any) {
      console.error('Error fetching 360 feedback:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch 360 feedback' },
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
        reviewerName,
        reviewerRole,
        reviewPeriod,
        rating,
        strengths,
        areasForImprovement,
        communication,
        teamwork,
        leadership,
        problemSolving,
        comments,
        anonymous,
      } = body

      if (!staffId || !reviewerName || !reviewerRole || !reviewPeriod || !rating) {
        return NextResponse.json(
          { error: 'staffId, reviewerName, reviewerRole, reviewPeriod, and rating are required' },
          { status: 400 }
        )
      }

      // Get reviewer staff ID
      const reviewerStaffId = user.staffId || staffId // Use current user's staffId as reviewer

      const feedback = await prisma.feedback360.create({
        data: {
          staffId,
          reviewerId: reviewerStaffId,
          reviewerName,
          reviewerRole,
          reviewPeriod,
          rating,
          strengths: strengths || [],
          areasForImprovement: areasForImprovement || [],
          communication,
          teamwork,
          leadership,
          problemSolving,
          comments,
          anonymous: anonymous || false,
          status: 'submitted',
          submittedAt: new Date(),
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
          action: 'FEEDBACK_360_CREATED',
          user: user.email,
          userRole: user.role,
          staffId,
          details: `Created 360-degree feedback for ${staffId} by ${reviewerName}`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json(feedback, { status: 201 })
    } catch (error: any) {
      console.error('Error creating 360 feedback:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create 360 feedback' },
        { status: 500 }
      )
    }
  })(request)
}

