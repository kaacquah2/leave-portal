/**
 * GET /api/performance-reviews
 * 
 * Get performance reviews for the current user or all reviews (for HR/Admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic - this route uses cookies via withAuth and cannot be statically pre-rendered

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const staffId = searchParams.get('staffId')

      // Build where clause
      const where: any = {}

      // If staffId provided, filter by it
      if (staffId) {
        where.staffId = staffId
      } else {
        // If no staffId and user is not HR/Admin, only show their own reviews
        if (!['HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN', 'hr', 'hr_officer', 'hr_director', 'admin'].includes(user.role)) {
          if (user.staffId) {
            where.staffId = user.staffId
          } else {
            // User has no staffId, return empty
            return NextResponse.json([])
          }
        }
      }

      const reviews = await prisma.performanceReview.findMany({
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
        orderBy: { reviewDate: 'desc' },
      })

      return NextResponse.json(reviews)
    } catch (error: any) {
      console.error('Error fetching performance reviews:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch performance reviews' },
        { status: 500 }
      )
    }
  })(request)
}

