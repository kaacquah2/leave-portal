import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET all users
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {

    const users = await prisma.user.findMany({
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Remove password hashes from response
    const safeUsers = users.map((u: any) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      staffId: u.staffId,
      active: u.active,
      emailVerified: u.emailVerified,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt,
      staff: u.staff,
    }))

    return NextResponse.json(safeUsers)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin'] })

// POST create user
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {

    const body = await request.json()
    const { email, password, role, staffId, active } = body

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password, and role are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        staffId: staffId || null,
        active: active !== undefined ? active : true,
      },
      include: {
        staff: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_CREATED',
        user: user.email,
        details: `User created: ${email} with role ${role}`,
      },
    })

    // Remove password hash from response
    const safeUser = {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      staffId: newUser.staffId,
      active: newUser.active,
      staff: newUser.staff,
    }

    return NextResponse.json(safeUser, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin'] })

