import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all leave requests
export async function GET() {
  try {
    const leaves = await prisma.leaveRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        staff: {
          select: {
            id: true,
            staffId: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
          },
        },
        template: true,
      },
    })
    // Transform dates to ISO strings
    const transformed = leaves.map(leave => ({
      ...leave,
      startDate: leave.startDate.toISOString(),
      endDate: leave.endDate.toISOString(),
      approvalDate: leave.approvalDate?.toISOString(),
      createdAt: leave.createdAt.toISOString(),
      updatedAt: leave.updatedAt.toISOString(),
    }))
    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Error fetching leaves:', error)
    return NextResponse.json({ error: 'Failed to fetch leaves' }, { status: 500 })
  }
}

// POST create new leave request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
      const leave = await prisma.leaveRequest.create({
      data: {
        staffId: body.staffId,
        staffName: body.staffName,
        leaveType: body.leaveType,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        days: body.days,
        reason: body.reason,
        status: body.status || 'pending',
        templateId: body.templateId,
        approvalLevels: body.approvalLevels || null,
      },
    })
    const transformed = {
      ...leave,
      startDate: leave.startDate.toISOString(),
      endDate: leave.endDate.toISOString(),
      approvalDate: leave.approvalDate?.toISOString(),
      createdAt: leave.createdAt.toISOString(),
      updatedAt: leave.updatedAt.toISOString(),
    }
    return NextResponse.json(transformed, { status: 201 })
  } catch (error) {
    console.error('Error creating leave:', error)
    return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 })
  }
}

