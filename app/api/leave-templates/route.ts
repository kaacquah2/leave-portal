import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'


// GET all leave templates
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const templates = await prisma.leaveRequestTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching leave templates:', error)
    return NextResponse.json({ error: 'Failed to fetch leave templates' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

// POST create leave template
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR and admin can create leave templates
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

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
}, { allowedRoles: ['hr', 'admin'] })

