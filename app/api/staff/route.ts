import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all staff
export async function GET() {
  try {
    const staff = await prisma.staffMember.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(staff)
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }
}

// POST create new staff
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const staff = await prisma.staffMember.create({
      data: {
        staffId: body.staffId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        department: body.department,
        position: body.position,
        grade: body.grade,
        level: body.level,
        photoUrl: body.photoUrl,
        active: body.active ?? true,
        joinDate: new Date(body.joinDate),
      },
    })
    return NextResponse.json(staff, { status: 201 })
  } catch (error) {
    console.error('Error creating staff:', error)
    return NextResponse.json({ error: 'Failed to create staff' }, { status: 500 })
  }
}

