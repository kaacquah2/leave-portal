import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH update leave template
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const template = await prisma.leaveRequestTemplate.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.leaveType && { leaveType: body.leaveType }),
        ...(body.defaultDays !== undefined && { defaultDays: body.defaultDays }),
        ...(body.defaultReason && { defaultReason: body.defaultReason }),
        ...(body.department !== undefined && { department: body.department }),
        ...(body.active !== undefined && { active: body.active }),
      },
    })
    return NextResponse.json(template)
  } catch (error) {
    console.error('Error updating leave template:', error)
    return NextResponse.json({ error: 'Failed to update leave template' }, { status: 500 })
  }
}

