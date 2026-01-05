/**
 * GET /api/recruitment/interviews
 * POST /api/recruitment/interviews
 * 
 * List and create interviews
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext, isHR, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { HR_ROLES, ADMIN_ROLES } from '@/lib/roles'

// GET - List interviews

// Force static export configuration (required for static export mode)

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const candidateId = searchParams.get('candidateId')
      const status = searchParams.get('status')
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')

      const where: any = {}

      if (candidateId) {
        where.candidateId = candidateId
      }

      if (status && status !== 'all') {
        where.status = status
      }

      const [data, total] = await Promise.all([
        prisma.interview.findMany({
          where,
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                jobPosting: {
                  select: {
                    id: true,
                    title: true,
                    department: true,
                    position: true,
                  },
                },
              },
            },
          },
          orderBy: { scheduledDate: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.interview.count({ where }),
      ])

      return NextResponse.json({
        success: true,
        data,
        total,
        limit,
        offset,
      })
    } catch (error: any) {
      console.error('Error fetching interviews:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch interviews' },
        { status: 500 }
      )
    }
  })(request)
}

// POST - Create interview
export async function POST(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only HR and Admin can create interviews
      if (!isHR(user) && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'Forbidden - HR or Admin access required' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const {
        candidateId,
        scheduledDate,
        interviewType,
        interviewers,
        location,
        notes,
      } = body

      if (!candidateId || !scheduledDate || !interviewType || !interviewers || interviewers.length === 0) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        )
      }

      // Verify candidate exists
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
      })

      if (!candidate) {
        return NextResponse.json(
          { error: 'Candidate not found' },
          { status: 404 }
        )
      }

      const interview = await prisma.interview.create({
        data: {
          candidateId,
          scheduledDate: new Date(scheduledDate),
          interviewType,
          interviewers,
          location: location || null,
          notes: notes || null,
        },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              jobPosting: {
                select: {
                  id: true,
                  title: true,
                  department: true,
                  position: true,
                },
              },
            },
          },
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'INTERVIEW_SCHEDULED',
          user: user.email,
          userRole: user.role,
          details: `Interview scheduled for ${candidate.firstName} ${candidate.lastName}`,
          metadata: {
            interviewId: interview.id,
            candidateId,
            scheduledDate,
          },
        },
      })

      return NextResponse.json({
        success: true,
        data: interview,
      })
    } catch (error: any) {
      console.error('Error creating interview:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create interview' },
        { status: 500 }
      )
    }
  }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES] })(request)
}

