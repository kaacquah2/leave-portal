import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET single leave request
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
      include: {
        staff: true,
        template: true,
      },
    })
    if (!leave) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }
    return NextResponse.json(leave)
  } catch (error) {
    console.error('Error fetching leave:', error)
    return NextResponse.json({ error: 'Failed to fetch leave' }, { status: 500 })
  }
}

// PATCH update leave request (for approval/rejection)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
    })
    
    if (!leave) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    // Handle approval levels
    let approvalLevels = leave.approvalLevels as any
    let status = body.status || leave.status

    if (body.level !== undefined && approvalLevels) {
      approvalLevels = approvalLevels.map((al: any) =>
        al.level === body.level
          ? {
              ...al,
              status: body.status,
              approverName: body.approvedBy,
              approvalDate: new Date().toISOString(),
              ...(body.comments && { comments: body.comments }),
            }
          : al
      )

      // Check if all levels are approved
      const allApproved = approvalLevels.every((al: any) => al.status === 'approved')
      const anyRejected = approvalLevels.some((al: any) => al.status === 'rejected')

      if (allApproved) {
        status = 'approved'
      } else if (anyRejected) {
        status = 'rejected'
      } else {
        status = 'pending'
      }
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: {
        status,
        approvedBy: body.approvedBy || leave.approvedBy,
        approvalDate: status !== 'pending' ? new Date() : leave.approvalDate,
        approvalLevels: approvalLevels || null,
      },
    })
    const transformed = {
      ...updated,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      approvalDate: updated.approvalDate?.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }
    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Error updating leave:', error)
    return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 })
  }
}

