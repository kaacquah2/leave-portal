import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET all staff (or own staff for employees)
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // HR and admin can view all staff
    if (user.role === 'hr' || user.role === 'admin') {
      const staff = await prisma.staffMember.findMany({
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(staff)
    }

    // Employees and managers can only view their own staff record
    if (user.role === 'employee' || user.role === 'manager') {
      if (!user.staffId) {
        return NextResponse.json(
          { error: 'No staff record associated with this account' },
          { status: 404 }
        )
      }

      const staff = await prisma.staffMember.findUnique({
        where: { staffId: user.staffId },
      })

      if (!staff) {
        return NextResponse.json(
          { error: 'Staff member not found' },
          { status: 404 }
        )
      }

      // Return as array to maintain consistency with the all-staff response
      return NextResponse.json([staff])
    }

    // Default: forbidden
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

// POST create new staff
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR and admin can create staff
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

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
}, { allowedRoles: ['hr', 'admin'] })

