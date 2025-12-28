import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'


// GET all performance reviews
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get('staffId')
    
    // Role-based filtering
    let where: any = {}
    if (user.role === 'employee' && user.staffId) {
      // Employees can only see their own reviews
      where.staffId = user.staffId
    } else if (staffId) {
      where.staffId = staffId
    }
    // HR, admin, and managers can see all (no where clause if no staffId filter)
    
    const reviews = await prisma.performanceReview.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        staff: true,
      },
    })
    return NextResponse.json(reviews)
  } catch (error) {
    console.error('Error fetching performance reviews:', error)
    return NextResponse.json({ error: 'Failed to fetch performance reviews' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

// POST create performance review
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR, admin, and managers can create performance reviews
    if (user.role !== 'hr' && user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const review = await prisma.performanceReview.create({
      data: {
        staffId: body.staffId,
        reviewPeriod: body.reviewPeriod,
        reviewDate: new Date(body.reviewDate),
        reviewedBy: body.reviewedBy,
        rating: body.rating,
        strengths: body.strengths || [],
        areasForImprovement: body.areasForImprovement || [],
        goals: body.goals || [],
        comments: body.comments,
        status: body.status || 'draft',
      },
    })
    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error('Error creating performance review:', error)
    return NextResponse.json({ error: 'Failed to create performance review' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin', 'manager'] })

