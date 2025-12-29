import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createToken, createSession, getUserFromToken } from '@/lib/auth'


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { staff: true },
    })

    if (!user) {
      console.error(`Login failed: User not found for email: ${email}`)
      return NextResponse.json(
        { 
          error: 'Invalid email or password',
          errorCode: 'USER_NOT_FOUND',
          troubleshooting: [
            'Verify that your email address is correct',
            'Check for typos in your email address',
            'Contact HR if you believe your account should exist',
            'Clear browser cookies and try again',
          ],
        },
        { status: 401 }
      )
    }

    if (!user.active) {
      console.error(`Login failed: User is inactive for email: ${email}`)
      return NextResponse.json(
        { 
          error: 'Your account is inactive',
          errorCode: 'ACCOUNT_INACTIVE',
          troubleshooting: [
            'Your account has been deactivated',
            'Please contact HR to reactivate your account',
            'If you recently changed roles, your account may need to be updated',
            'Contact IT support if you believe this is an error',
          ],
        },
        { status: 403 }
      )
    }

    // Check if staff member is terminated (if user has associated staff)
    if (user.staff) {
      if ((user.staff as any).employmentStatus !== 'active') {
        const statusMessages: Record<string, string> = {
          'terminated': 'Your account has been terminated',
          'resigned': 'Your account is no longer active (resigned)',
          'retired': 'Your account is no longer active (retired)',
          'suspended': 'Your account has been suspended',
        }
        
        const message = statusMessages[(user.staff as any).employmentStatus] || 'Your account is not active'
        console.error(`Login failed: Staff member status is ${(user.staff as any).employmentStatus} for email: ${email}`)
        
        return NextResponse.json(
          { 
            error: message,
            errorCode: 'STAFF_NOT_ACTIVE',
            employmentStatus: (user.staff as any).employmentStatus,
            troubleshooting: [
              'Your staff account is not in an active status',
              'Please contact HR for assistance',
              'If you believe this is an error, contact IT support',
            ],
          },
          { status: 403 }
        )
      }
      
      if (!user.staff.active) {
        console.error(`Login failed: Staff member is inactive for email: ${email}`)
        return NextResponse.json(
          { 
            error: 'Your staff account is inactive',
            errorCode: 'STAFF_INACTIVE',
            troubleshooting: [
              'Your staff record has been deactivated',
              'Please contact HR to reactivate your account',
              'Contact IT support if you believe this is an error',
            ],
          },
          { status: 403 }
        )
      }
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      console.error(`Login failed: Invalid password for email: ${email}`)
      return NextResponse.json(
        { 
          error: 'Invalid email or password',
          errorCode: 'INVALID_PASSWORD',
          troubleshooting: [
            'Verify that your password is correct',
            'Check for typos in your password',
            'Make sure Caps Lock is not enabled',
            'If you forgot your password, contact HR to reset it',
            'Clear browser cookies and try again',
          ],
        },
        { status: 401 }
      )
    }

    // Create token
    const token = await createToken({
      id: user.id,
      email: user.email,
      role: user.role,
      staffId: user.staffId,
    })

    // Create session
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined
    await createSession(user.id, token, ip, userAgent)

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        user: user.email,
        details: `User logged in: ${user.email}`,
        ip: ip || undefined,
      },
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        staffId: user.staffId,
        staff: user.staff ? {
          staffId: user.staff.staffId,
          firstName: user.staff.firstName,
          lastName: user.staff.lastName,
          department: user.staff.department,
        } : null,
      },
      // Token is set in httpOnly cookie, not returned in response
    })

    // Set cookie
    // Vercel sets VERCEL=1, and always uses HTTPS, so secure should be true
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
    
    // Cookie settings for Vercel deployment
    // - secure: true on Vercel (HTTPS only)
    // - sameSite: 'lax' for same-site requests (works for same-origin)
    // - httpOnly: true for security (prevents XSS)
    // - No domain set (defaults to current domain, works for vercel.app)
    // - path: '/' (available for all paths)
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      // Explicitly don't set domain - let it default to current domain
      // This ensures it works on vercel.app subdomains
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    )
  }
}

