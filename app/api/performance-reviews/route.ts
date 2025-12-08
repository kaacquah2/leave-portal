import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all performance reviews
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get('staffId')
    
    const reviews = await prisma.performanceReview.findMany({
      where: staffId ? { staffId } : undefined,
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
}

// POST create performance review
export async function POST(request: NextRequest) {
  try {
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
}

