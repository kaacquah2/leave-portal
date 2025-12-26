import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth'

// GET all job postings
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const department = searchParams.get('department')

    const where: any = {}
    if (status) where.status = status
    if (department) where.department = department

    const jobs = await prisma.jobPosting.findMany({
      where,
      include: {
        candidates: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
            appliedDate: true,
          },
        },
      },
      orderBy: { postedDate: 'desc' },
    })

    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Error fetching job postings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job postings' },
      { status: 500 }
    )
  }
}

// POST create job posting
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user || (user.role !== 'hr' && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Only HR and admins can create job postings' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, department, position, description, requirements, status, closingDate } = body

    if (!title || !department || !position || !description || !requirements) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    const job = await prisma.jobPosting.create({
      data: {
        title,
        department,
        position,
        description,
        requirements,
        status: status || 'draft',
        postedBy: user.email,
        closingDate: closingDate ? new Date(closingDate) : null,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'JOB_POSTING_CREATED',
        user: user.email,
        details: `Job posting created: ${title}`,
      },
    })

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error('Error creating job posting:', error)
    return NextResponse.json(
      { error: 'Failed to create job posting' },
      { status: 500 }
    )
  }
}

