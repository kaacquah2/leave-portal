import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin, isHR } from '@/lib/auth-proxy'
import { hashPassword } from '@/lib/auth'
import { sendEmail, generateNewUserCredentialsEmail } from '@/lib/email'
import { validatePasswordComplexity, addPasswordToHistory, setPasswordExpiry } from '@/lib/password-policy'

/**
 * POST /api/admin/users/create-credentials
 * Create login credentials for an existing staff member
 * Admin only
 */
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only admin and HR roles can create credentials
    if (!isAdmin(user) && !isHR(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin or HR access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      staffId,      // Required: Staff ID of existing staff member
      email,        // Required: Email for login
      password,     // Required: Password for login
      role,         // Required: User role
      active = true, // Optional: Account active status
    } = body

    // Validate required fields
    if (!staffId || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: staffId, email, password, role' },
        { status: 400 }
      )
    }

    // Ghana Government Compliance: Validate password complexity
    const passwordValidation = validatePasswordComplexity(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { 
          error: 'Password does not meet complexity requirements',
          errorCode: 'WEAK_PASSWORD',
          errors: passwordValidation.errors,
        },
        { status: 400 }
      )
    }

    // Check if staff member exists
    const staff = await prisma.staffMember.findUnique({
      where: { staffId },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Check if staff member already has a user account
    const existingUser = await prisma.user.findUnique({
      where: { staffId },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Staff member already has a user account. Use the update endpoint to modify credentials.' },
        { status: 400 }
      )
    }

    // Check if email is already in use
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email is already in use by another user account' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user account and update staff email if different
    const result = await prisma.$transaction(async (tx) => {
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

      // Update staff email if it's different
      if (staff.email.toLowerCase() !== email.toLowerCase()) {
        await tx.staffMember.update({
          where: { staffId },
          data: { email: email.toLowerCase() },
        })
      }

      // Create initial leave balance if it doesn't exist
      const existingBalance = await tx.leaveBalance.findUnique({
        where: { staffId },
      })

      if (!existingBalance) {
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
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'USER_CREDENTIALS_CREATED',
          user: user.email,
          userRole: user.role,
          staffId: staff.staffId,
          details: JSON.stringify({
            createdBy: user.email,
            createdFor: email,
            staffId: staff.staffId,
            role: role,
            timestamp: new Date().toISOString(),
          }),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        },
      })

      return { user: newUser, staff }
    })

    // Ghana Government Compliance: Add password to history and set expiry
    await addPasswordToHistory(result.user.id, passwordHash)
    await setPasswordExpiry(result.user.id)

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
      message: 'Login credentials created successfully',
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
      // Include password in response for admin to manually share if email fails
      password: emailSent ? undefined : password,
    })
  } catch (error: any) {
    console.error('Error creating credentials:', error)
    
    // Handle Prisma unique constraint errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        const target = (error as any).meta?.target
        if (Array.isArray(target) && target.includes('email')) {
          return NextResponse.json(
            { error: 'Email is already in use' },
            { status: 400 }
          )
        }
        if (Array.isArray(target) && target.includes('staffId')) {
          return NextResponse.json(
            { error: 'Staff ID is already linked to a user account' },
            { status: 400 }
          )
        }
      }
    }

    return NextResponse.json(
      { error: 'Failed to create login credentials' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['admin', 'SYS_ADMIN', 'HR_OFFICER', 'HR_DIRECTOR', 'hr', 'hr_officer', 'hr_director'] })

