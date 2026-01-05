/**
 * GET /api/recruitment/jobs
 * POST /api/recruitment/jobs
 * 
 * List and create job postings
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext, isHR, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { HR_ROLES, ADMIN_ROLES } from '@/lib/roles'

// GET - List job postings

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const status = searchParams.get('status')
      const department = searchParams.get('department')
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')

      const where: any = {}

      if (status && status !== 'all') {
        where.status = status
      }

      if (department && department !== 'all') {
        where.department = department
      }

      const [data, total] = await Promise.all([
        prisma.jobPosting.findMany({
          where,
          include: {
            candidates: {
              select: {
                id: true,
                status: true,
              },
            },
            _count: {
              select: {
                candidates: true,
              },
            },
          },
          orderBy: { postedDate: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.jobPosting.count({ where }),
      ])

      return NextResponse.json({
        success: true,
        data,
        total,
        limit,
        offset,
      })
    } catch (error: any) {
      console.error('Error fetching job postings:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch job postings' },
        { status: 500 }
      )
    }
  })(request)
}

// POST - Create job posting
export async function POST(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only HR and Admin can create job postings
      if (!isHR(user) && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'Forbidden - HR or Admin access required' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const {
        title,
        department,
        position,
        description,
        requirements,
        status,
        closingDate,
      } = body

      if (!title || !department || !position || !description || !requirements) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        )
      }

      // Get poster name
      const poster = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          staff: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      const postedBy = poster?.staff
        ? `${poster.staff.firstName} ${poster.staff.lastName}`
        : user.email

      const jobPosting = await prisma.jobPosting.create({
        data: {
          title,
          department,
          position,
          description,
          requirements,
          status: status || 'draft',
          postedBy,
          closingDate: closingDate ? new Date(closingDate) : null,
        },
        include: {
          _count: {
            select: {
              candidates: true,
            },
          },
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'JOB_POSTING_CREATED',
          user: user.email,
          userRole: user.role,
          details: `Job posting created: ${title}`,
          metadata: {
            jobPostingId: jobPosting.id,
            department,
            position,
          },
        },
      })

      return NextResponse.json({
        success: true,
        data: jobPosting,
      })
    } catch (error: any) {
      console.error('Error creating job posting:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create job posting' },
        { status: 500 }
      )
    }
  }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES] })(request)
}

