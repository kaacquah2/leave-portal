import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET all staff members
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // HR and admin can view all staff
    // Employees can only view their own record
    // Managers and deputy directors see their team/directorate
    let where: any = {}
    
    if (user.role === 'employee' && user.staffId) {
      where.staffId = user.staffId
    } else if ((user.role === 'manager' || user.role === 'deputy_director') && user.staffId) {
      // Managers and deputy directors see their team/directorate
      // In a full implementation, this would filter by managerId or department
      // For now, they see all (can be enhanced later)
    }
    // HR, HR Assistant, and admin see all (no where clause)

    const staff = await prisma.staffMember.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    
    return NextResponse.json(staff)
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'hr_assistant', 'admin', 'employee', 'manager', 'deputy_director'] })

// POST create staff member
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR and admin can create staff
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Only HR and Admin can create staff members' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.staffId || !body.firstName || !body.lastName || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields: staffId, firstName, lastName, email' },
        { status: 400 }
      )
    }

    // Check if staffId already exists
    const existing = await prisma.staffMember.findUnique({
      where: { staffId: body.staffId },
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'Staff ID already exists' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingEmail = await prisma.staffMember.findUnique({
      where: { email: body.email },
    })
    
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    const staff = await prisma.staffMember.create({
      data: {
        staffId: body.staffId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone || '',
        department: body.department || '',
        position: body.position || '',
        grade: body.grade || '',
        level: body.level || '',
        rank: body.rank,
        step: body.step,
        directorate: body.directorate,
        unit: body.unit,
        photoUrl: body.photoUrl,
        active: body.active ?? true,
        employmentStatus: body.employmentStatus || 'active',
        joinDate: body.joinDate ? new Date(body.joinDate) : new Date(),
        managerId: body.managerId,
      },
    })
    
    return NextResponse.json(staff, { status: 201 })
  } catch (error) {
    console.error('Error creating staff:', error)
    return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin'] })

