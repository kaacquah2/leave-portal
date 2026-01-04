import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createToken, createSession, getUserFromToken } from '@/lib/auth'
import { 
  isPasswordExpired, 
  isAccountLocked, 
  handleFailedLoginAttempt, 
  resetFailedLoginAttempts,
  requirePasswordChange,
  isSeededUser
} from '@/lib/password-policy'
import { rateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { addCorsHeaders, handleCorsPreflight } from '@/lib/cors'

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'

// Handle OPTIONS preflight requests
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 })
}

export async function POST(request: NextRequest) {
  // Handle CORS preflight requests (fallback, though OPTIONS should be handled above)
  const preflightResponse = handleCorsPreflight(request)
  if (preflightResponse) {
    return preflightResponse
  }
  
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, RATE_LIMITS.login)
  if (!rateLimitResult.allowed) {
    const response = createRateLimitResponse(rateLimitResult, RATE_LIMITS.login.maxRequests)
    return addCorsHeaders(response, request)
  }

  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      const response = NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
      return addCorsHeaders(response, request)
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { staff: true },
    })

    if (!user) {
      console.error(`Login failed: User not found for email: ${email}`)
      const response = NextResponse.json(
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
      return addCorsHeaders(response, request)
    }

    if (!user.active) {
      console.error(`Login failed: User is inactive for email: ${email}`)
      const response = NextResponse.json(
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
      return addCorsHeaders(response, request)
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
        
        const response = NextResponse.json(
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
        return addCorsHeaders(response, request)
      }
      
      if (!user.staff.active) {
        console.error(`Login failed: Staff member is inactive for email: ${email}`)
        const response = NextResponse.json(
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
        return addCorsHeaders(response, request)
      }
    }

    // Ghana Government Compliance: Check if account is locked
    const accountLocked = await isAccountLocked(user.id)
    if (accountLocked) {
      const lockInfo = await prisma.user.findUnique({
        where: { id: user.id },
        select: { lockedUntil: true },
      })
      
      const response = NextResponse.json(
        { 
          error: 'Your account has been locked due to multiple failed login attempts',
          errorCode: 'ACCOUNT_LOCKED',
          lockedUntil: lockInfo?.lockedUntil,
          troubleshooting: [
            'Your account has been temporarily locked for security reasons',
            'Please wait 30 minutes and try again',
            'If this persists, contact IT support',
          ],
        },
        { status: 403 }
      )
      return addCorsHeaders(response, request)
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      console.error(`Login failed: Invalid password for email: ${email}`)
      
      // Handle failed login attempt (may lock account)
      const lockResult = await handleFailedLoginAttempt(user.id)
      
      const response = NextResponse.json(
        { 
          error: 'Invalid email or password',
          errorCode: 'INVALID_PASSWORD',
          attemptsRemaining: lockResult.attemptsRemaining,
          accountLocked: lockResult.locked,
          troubleshooting: [
            'Verify that your password is correct',
            'Check for typos in your password',
            'Make sure Caps Lock is not enabled',
            `You have ${lockResult.attemptsRemaining} attempts remaining`,
            'If you forgot your password, contact HR to reset it',
          ],
        },
        { status: 401 }
      )
      return addCorsHeaders(response, request)
    }

    // Reset failed login attempts on successful login
    await resetFailedLoginAttempts(user.id)

    // Ghana Government Compliance: Check if password has expired
    const passwordExpired = await isPasswordExpired(user.id)
    if (passwordExpired) {
      const response = NextResponse.json(
        { 
          error: 'Your password has expired and must be changed',
          errorCode: 'PASSWORD_EXPIRED',
          requiresPasswordChange: true,
          troubleshooting: [
            'Your password has expired (90 days maximum age)',
            'You must change your password before you can log in',
            'Contact HR if you need assistance',
          ],
        },
        { status: 403 }
      )
      return addCorsHeaders(response, request)
    }

    // Ghana Government Compliance: Force password change on first login
    // Exception: Seeded users (test/demo accounts) are exempt from this requirement
    if (!user.passwordChangedAt && !isSeededUser(user.email)) {
      await requirePasswordChange(user.id)
      const response = NextResponse.json(
        { 
          error: 'You must change your password on first login',
          errorCode: 'PASSWORD_CHANGE_REQUIRED',
          requiresPasswordChange: true,
          troubleshooting: [
            'This is your first login',
            'You must change your password before you can continue',
            'This is a security requirement',
          ],
        },
        { status: 403 }
      )
      return addCorsHeaders(response, request)
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

    // Check if client is using Bearer tokens (Electron/mobile) or cookies (web)
    // If Authorization header is present, client is using Bearer tokens and needs token in response
    const usesBearerToken = request.headers.get('authorization')?.startsWith('Bearer ') ||
                           request.headers.get('x-request-token') === 'true'
    
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
      // Return token for Bearer token clients (Electron/mobile)
      // Web clients use httpOnly cookies and can ignore this
      ...(usesBearerToken ? { token } : {}),
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

    return addCorsHeaders(response, request)
  } catch (error) {
    console.error('Login error:', error)
    const response = NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    )
    return addCorsHeaders(response, request)
  }
}

