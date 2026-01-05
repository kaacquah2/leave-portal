import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, createToken, createSession } from '@/lib/auth'
import { addCorsHeaders, handleCorsPreflight } from '@/lib/cors'


// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  // Handle CORS preflight requests
  const preflightResponse = handleCorsPreflight(request)
  if (preflightResponse) {
    return preflightResponse
  }
  try {
    const body = await request.json()
    const { email, password, role, staffId } = body

    if (!email || !password) {
      const response = NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
      return addCorsHeaders(response, request)
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      const response = NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
      return addCorsHeaders(response, request)
    }

    // If staffId is provided, verify it exists
    if (staffId) {
      const staff = await prisma.staffMember.findUnique({
        where: { staffId },
      })

      if (!staff) {
        const response = NextResponse.json(
          { error: 'Staff member not found' },
          { status: 400 }
        )
        return addCorsHeaders(response, request)
      }

      // Check if staff already has a user account
      const existingStaffUser = await prisma.user.findUnique({
        where: { staffId },
      })

      if (existingStaffUser) {
        const response = NextResponse.json(
          { error: 'Staff member already has an account' },
          { status: 400 }
        )
        return addCorsHeaders(response, request)
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role || 'employee',
        staffId: staffId || null,
        active: true,
      },
      include: {
        staff: true,
      },
    })

    // Create token and session
    const token = await createToken({
      id: user.id,
      email: user.email,
      role: user.role,
      staffId: user.staffId,
    })

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined
    await createSession(user.id, token, ip, userAgent)

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_CREATED',
        user: user.email,
        details: `New user registered: ${user.email} with role ${user.role}`,
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
        } : null,
      },
      token,
    }, { status: 201 })

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
    console.error('Registration error:', error)
    const response = NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    )
    return addCorsHeaders(response, request)
  }
}

