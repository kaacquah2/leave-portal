import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth'

// GET all candidates
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const jobPostingId = searchParams.get('jobPostingId')
    const status = searchParams.get('status')

    const where: any = {}
    if (jobPostingId) where.jobPostingId = jobPostingId
    if (status) where.status = status

    const candidates = await prisma.candidate.findMany({
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
        interviews: true,
      },
      orderBy: { appliedDate: 'desc' },
    })

    return NextResponse.json(candidates)
  } catch (error) {
    console.error('Error fetching candidates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch candidates' },
      { status: 500 }
    )
  }
}

// POST create candidate application
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { jobPostingId, firstName, lastName, email, phone, resumeUrl, coverLetter } = body

    if (!jobPostingId || !firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    // Verify job posting exists and is open
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobPostingId },
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job posting not found' },
        { status: 404 }
      )
    }

    if (job.status !== 'published') {
      return NextResponse.json(
        { error: 'Job posting is not accepting applications' },
        { status: 400 }
      )
    }

    const candidate = await prisma.candidate.create({
      data: {
        jobPostingId,
        firstName,
        lastName,
        email,
        phone,
        resumeUrl: resumeUrl || null,
        coverLetter: coverLetter || null,
        status: 'applied',
      },
      include: {
        jobPosting: true,
      },
    })

    // Create notification for HR
    const hrUsers = await prisma.user.findMany({
      where: { role: 'hr' },
    })

    for (const hrUser of hrUsers) {
      await prisma.notification.create({
        data: {
          userId: hrUser.id,
          type: 'recruitment',
          title: 'New Candidate Application',
          message: `${firstName} ${lastName} applied for ${job.title}`,
          link: `/recruitment/candidates/${candidate.id}`,
        },
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CANDIDATE_APPLIED',
        user: email,
        details: `Candidate applied: ${firstName} ${lastName} for ${job.title}`,
      },
    })

    return NextResponse.json(candidate, { status: 201 })
  } catch (error) {
    console.error('Error creating candidate:', error)
    return NextResponse.json(
      { error: 'Failed to create candidate application' },
      { status: 500 }
    )
  }
}

