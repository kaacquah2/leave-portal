import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { hashPassword } from '@/lib/auth'
import { sendEmail, generateNewUserCredentialsEmail } from '@/lib/email'

// GET all users (admin only)
export const GET = withAuth(async ({ user }: AuthContext) => {
  try {
    // Only admin can access this route (check normalized roles)
    const normalizedRole = user.role?.toUpperCase()
    const isAdmin = user.role === 'admin' || 
                   normalizedRole === 'SYS_ADMIN' || 
                   normalizedRole === 'SYSTEM_ADMIN' || 
                   normalizedRole === 'SECURITY_ADMIN'
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const users = await prisma.user.findMany({
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Format response to match what the frontend expects
    const formattedUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      staffId: u.staffId,
      active: u.active,
      emailVerified: u.emailVerified,
      lastLogin: u.lastLogin,
      staff: u.staff,
    }))

    return NextResponse.json(formattedUsers)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['admin', 'SYS_ADMIN', 'SYSTEM_ADMIN', 'SECURITY_ADMIN'] })

// POST create new user with staff member (admin only)
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only admin can access this route (check normalized roles)
    const normalizedRole = user.role?.toUpperCase()
    const isAdmin = user.role === 'admin' || 
                   normalizedRole === 'SYS_ADMIN' || 
                   normalizedRole === 'SYSTEM_ADMIN' || 
                   normalizedRole === 'SECURITY_ADMIN'
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      // User account fields
      email,
      password,
      role,
      active = true,
      // Staff member fields
      staffId,
      firstName,
      lastName,
      phone,
      department,
      position,
      grade,
      level,
      joinDate,
    } = body

    // Validate required fields
    if (!email || !password || !staffId || !firstName || !lastName || 
        !phone || !department || !position || !grade || !level || !joinDate) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Check if staff member with this staffId already exists
    const existingStaff = await prisma.staffMember.findUnique({
      where: { staffId },
    })

    if (existingStaff) {
      return NextResponse.json(
        { error: 'Staff member with this Staff ID already exists' },
        { status: 400 }
      )
    }

    // Check if staffId is already linked to a user
    const existingStaffUser = await prisma.user.findUnique({
      where: { staffId },
    })

    if (existingStaffUser) {
      return NextResponse.json(
        { error: 'Staff ID is already linked to another user account' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create staff member and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create staff member
      const staff = await tx.staffMember.create({
        data: {
          staffId,
          firstName,
          lastName,
          email: email.toLowerCase(),
          phone,
          department,
          position,
          grade,
          level,
          joinDate: new Date(joinDate),
          active: true,
          employmentStatus: 'active',
        },
      })

      // Create user account
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: role || 'employee',
          staffId: staff.staffId,
          active,
          emailVerified: false,
        },
        include: {
          staff: true,
        },
      })

      // Create initial leave balance
      await tx.leaveBalance.create({
        data: {
          staffId: staff.staffId,
          annual: 0,
          sick: 0,
          unpaid: 0,
          specialService: 0,
          training: 0,
          study: 0,
          maternity: 0,
          paternity: 0,
          compassionate: 0,
        },
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'USER_CREATED',
          user: user.email,
          staffId: staff.staffId,
          details: `Admin ${user.email} created user account for ${email} (${staffId}) with role ${role}`,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        },
      })

      return { user: newUser, staff }
    })

    // Send email with credentials (non-blocking)
    let emailSent = false
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const loginUrl = `${appUrl}/login`
      
      const emailHtml = generateNewUserCredentialsEmail(
        result.user.email,
        password, // Send plain password (only time it's sent)
        loginUrl,
        `${result.staff.firstName} ${result.staff.lastName}`,
        result.staff.staffId,
        result.user.role
      )

      emailSent = await sendEmail({
        to: result.user.email,
        subject: 'Your HR Leave Portal Account Credentials',
        html: emailHtml,
      })
    } catch (emailError) {
      console.error('Failed to send credentials email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        staffId: result.user.staffId,
        active: result.user.active,
        staff: {
          staffId: result.staff.staffId,
          firstName: result.staff.firstName,
          lastName: result.staff.lastName,
          department: result.staff.department,
        },
      },
      emailSent,
    })
  } catch (error) {
    console.error('Error creating user:', error)
    
    // Handle Prisma unique constraint errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        const target = (error as any).meta?.target
        if (Array.isArray(target) && target.includes('email')) {
          return NextResponse.json(
            { error: 'User with this email already exists' },
            { status: 400 }
          )
        }
        if (Array.isArray(target) && target.includes('staffId')) {
          return NextResponse.json(
            { error: 'Staff ID is already in use' },
            { status: 400 }
          )
        }
      }
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['admin', 'SYS_ADMIN', 'SYSTEM_ADMIN', 'SECURITY_ADMIN'] })

