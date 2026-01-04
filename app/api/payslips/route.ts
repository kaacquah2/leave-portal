/**
 * GET /api/payslips
 * 
 * Get payslips for the current user or all payslips (for HR/Admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'

// Force static export configuration (required for static export mode)
// Note: Uses cookies via withAuth, will be skipped during static export (works at runtime)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const staffId = searchParams.get('staffId')
      const period = searchParams.get('period') // YYYY-MM format
      const year = searchParams.get('year')
      const month = searchParams.get('month')

      // Build where clause
      const where: any = {}

      // If staffId provided, filter by it
      if (staffId) {
        where.staffId = staffId
      } else {
        // If no staffId and user is not HR/Admin, only show their own payslips
        if (!['HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN', 'hr', 'hr_officer', 'hr_director', 'admin'].includes(user.role)) {
          if (user.staffId) {
            where.staffId = user.staffId
          } else {
            // User has no staffId, return empty
            return NextResponse.json([])
          }
        }
      }

      // Filter by period if provided (YYYY-MM format)
      if (period) {
        where.month = period
        // Extract year from period for consistency
        const [yearStr] = period.split('-')
        where.year = parseInt(yearStr)
      } else {
        if (year) where.year = parseInt(year)
        if (month) {
          // If year is provided, construct YYYY-MM format
          if (year) {
            const monthStr = month.toString().padStart(2, '0')
            where.month = `${year}-${monthStr}`
          } else {
            // If only month provided, filter by month pattern (e.g., "-01", "-02")
            const monthStr = month.toString().padStart(2, '0')
            where.month = { contains: `-${monthStr}` }
          }
        }
      }

      const payslips = await prisma.payslip.findMany({
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
        orderBy: [
          { year: 'desc' },
          { month: 'desc' },
        ],
      })

      return NextResponse.json(payslips)
    } catch (error: any) {
      console.error('Error fetching payslips:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch payslips' },
        { status: 500 }
      )
    }
  })(request)
}

