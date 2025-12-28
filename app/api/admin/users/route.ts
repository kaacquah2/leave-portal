import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { sendEmail, generateNewUserCredentialsEmail } from '@/lib/email'


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

// POST create user (and optionally staff member)
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {

    const body = await request.json()
    const { 
      email, 
      password, 
      role, 
      staffId, 
      active,
      // Staff member fields (optional - if provided, create staff member too)
      firstName,
      lastName,
      phone,
      department,
      position,
      grade,
      level,
      joinDate,
    } = body

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password, and role are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // If staff member fields are provided, create staff member first
    let createdStaffId = staffId || null
    
    if (firstName && lastName && phone && department && position && grade && level && joinDate) {
      // Check if staffId is provided and if it already exists
      if (staffId) {
        const existingStaff = await prisma.staffMember.findUnique({
          where: { staffId },
        })

        if (existingStaff) {
          return NextResponse.json(
            { error: 'Staff member with this Staff ID already exists' },
            { status: 400 }
          )
        }

        // Check if staff already has a user account
        const existingStaffUser = await prisma.user.findUnique({
          where: { staffId },
        })

        if (existingStaffUser) {
          return NextResponse.json(
            { error: 'Staff member already has a user account' },
            { status: 400 }
          )
        }
      }

      // Check if email is already used by another staff member
      const existingStaffByEmail = await prisma.staffMember.findUnique({
        where: { email },
      })

      if (existingStaffByEmail) {
        return NextResponse.json(
          { error: 'Email is already associated with another staff member' },
          { status: 400 }
        )
      }

      // Create staff member
      const newStaff = await prisma.staffMember.create({
        data: {
          staffId: staffId!,
          firstName,
          lastName,
          email,
          phone,
          department,
          position,
          grade,
          level,
          joinDate: new Date(joinDate),
          active: active !== undefined ? active : true,
        },
      })

      createdStaffId = newStaff.staffId
    } else if (staffId) {
      // If staffId is provided but staff doesn't exist, check if it exists
      const existingStaff = await prisma.staffMember.findUnique({
        where: { staffId },
      })

      if (!existingStaff) {
        return NextResponse.json(
          { error: 'Staff member with this Staff ID does not exist. Please create the staff member first or provide all staff details.' },
          { status: 400 }
        )
      }

      // Check if staff already has a user account
      const existingStaffUser = await prisma.user.findUnique({
        where: { staffId },
      })

      if (existingStaffUser) {
        return NextResponse.json(
          { error: 'Staff member already has a user account' },
          { status: 400 }
        )
      }

      createdStaffId = staffId
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user account
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        staffId: createdStaffId,
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
        details: `User created: ${email} with role ${role}${createdStaffId ? ` (Staff ID: ${createdStaffId})` : ''}`,
      },
    })

    // Send welcome email with credentials
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const loginUrl = `${baseUrl}/`
    
    const userName = newUser.staff 
      ? `${newUser.staff.firstName} ${newUser.staff.lastName}`
      : undefined

    const emailSent = await sendEmail({
      to: email,
      subject: 'Your HR Leave Portal Account Credentials',
      html: generateNewUserCredentialsEmail(
        email,
        password, // Send plain password (user should change it on first login)
        loginUrl,
        userName,
        createdStaffId || undefined,
        role
      ),
    })

    if (!emailSent) {
      console.warn(`Failed to send credentials email to ${email}. User account was created but email notification failed.`)
      // Don't fail the request if email fails - user account is still created
    }

    // Remove password hash from response
    const safeUser = {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      staffId: newUser.staffId,
      active: newUser.active,
      staff: newUser.staff,
      emailSent, // Include email status in response
    }

    return NextResponse.json(safeUser, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field'
      return NextResponse.json(
        { error: `${field} already exists` },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin'] })

