/**
 * GET /api/recruitment/candidates
 * POST /api/recruitment/candidates
 * 
 * List and create candidates
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext, isHR, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List candidates

// Force static export configuration (required for static export mode)

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const jobPostingId = searchParams.get('jobPostingId')
      const status = searchParams.get('status')
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')

      const where: any = {}

      if (jobPostingId) {
        where.jobPostingId = jobPostingId
      }

      if (status && status !== 'all') {
        where.status = status
      }

      const [data, total] = await Promise.all([
        prisma.candidate.findMany({
          where,
          include: {
            jobPosting: {
              select: {
                id: true,
                title: true,
                department: true,
                position: true,
              },
            },
            interviews: {
              orderBy: { scheduledDate: 'desc' },
            },
          },
          orderBy: { appliedDate: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.candidate.count({ where }),
      ])

      return NextResponse.json({
        success: true,
        data,
        total,
        limit,
        offset,
      })
    } catch (error: any) {
      console.error('Error fetching candidates:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch candidates' },
        { status: 500 }
      )
    }
  })(request)
}

// POST - Create candidate application
export async function POST(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const body = await request.json()
      const {
        jobPostingId,
        firstName,
        lastName,
        email,
        phone,
        resumeUrl,
        coverLetter,
      } = body

      if (!jobPostingId || !firstName || !lastName || !email || !phone) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        )
      }

      // Verify job posting exists and is open
      const jobPosting = await prisma.jobPosting.findUnique({
        where: { id: jobPostingId },
      })

      if (!jobPosting) {
        return NextResponse.json(
          { error: 'Job posting not found' },
          { status: 404 }
        )
      }

      if (jobPosting.status !== 'published') {
        return NextResponse.json(
          { error: 'Job posting is not open for applications' },
          { status: 400 }
        )
      }

      // Check if candidate already applied
      const existing = await prisma.candidate.findFirst({
        where: {
          jobPostingId,
          email: email.toLowerCase(),
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'You have already applied for this position' },
          { status: 400 }
        )
      }

      const candidate = await prisma.candidate.create({
        data: {
          jobPostingId,
          firstName,
          lastName,
          email: email.toLowerCase(),
          phone,
          resumeUrl: resumeUrl || null,
          coverLetter: coverLetter || null,
        },
        include: {
          jobPosting: {
            select: {
              id: true,
              title: true,
              department: true,
              position: true,
            },
          },
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'CANDIDATE_APPLIED',
          user: user.email,
          userRole: user.role,
          details: `Candidate applied: ${firstName} ${lastName} for ${jobPosting.title}`,
          metadata: {
            candidateId: candidate.id,
            jobPostingId,
          },
        },
      })

      return NextResponse.json({
        success: true,
        data: candidate,
      })
    } catch (error: any) {
      console.error('Error creating candidate:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create candidate application' },
        { status: 500 }
      )
    }
  })(request)
}

