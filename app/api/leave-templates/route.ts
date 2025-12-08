import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all leave templates
export async function GET() {
  try {
    const templates = await prisma.leaveRequestTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching leave templates:', error)
    return NextResponse.json({ error: 'Failed to fetch leave templates' }, { status: 500 })
  }
}

// POST create leave template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const template = await prisma.leaveRequestTemplate.create({
      data: {
        name: body.name,
        leaveType: body.leaveType,
        defaultDays: body.defaultDays,
        defaultReason: body.defaultReason,
        department: body.department,
        active: body.active ?? true,
      },
    })
    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error creating leave template:', error)
    return NextResponse.json({ error: 'Failed to create leave template' }, { status: 500 })
  }
}

