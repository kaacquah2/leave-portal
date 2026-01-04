import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, getUserFromToken, createToken, createSession } from '@/lib/auth'
import { withAuth, addCorsHeaders, handleCorsPreflight } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'

// Handle OPTIONS preflight requests

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 })
}

/**
 * Refresh authentication token
 * Validates current token and issues a new one with extended expiration
 */
export async function POST(request: NextRequest) {
  // Handle CORS preflight requests
  const preflightResponse = handleCorsPreflight(request)
  if (preflightResponse) {
    return preflightResponse
  }

  try {
    // Get current token from request
    const token = getTokenFromRequest(request)
    if (!token) {
      const response = NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      )
      return addCorsHeaders(response, request)
    }

    // Verify current token and get user
    const user = await getUserFromToken(token)
    if (!user) {
      const response = NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
      return addCorsHeaders(response, request)
    }

    // Check if user account is still active
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!dbUser || !dbUser.active) {
      const response = NextResponse.json(
        { error: 'Account is inactive' },
        { status: 403 }
      )
      return addCorsHeaders(response, request)
    }

    // Create new token
    const newToken = await createToken({
      id: user.id,
      email: user.email,
      role: user.role,
      staffId: user.staffId,
    })

    // Update session with new token
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined
    
    // Delete old session
    await prisma.session.deleteMany({
      where: { token },
    })

    // Create new session
    await createSession(user.id, newToken, ip, userAgent)

    // Check if client is using Bearer tokens (Electron/mobile) or cookies (web)
    const usesBearerToken = request.headers.get('authorization')?.startsWith('Bearer ') ||
                           request.headers.get('x-request-token') === 'true'

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        staffId: user.staffId,
      },
      // Return new token for Bearer token clients (Electron/mobile)
      ...(usesBearerToken ? { token: newToken } : {}),
    })

    // Set new cookie for web clients
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
    response.cookies.set('token', newToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return addCorsHeaders(response, request)
  } catch (error) {
    console.error('Token refresh error:', error)
    const response = NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    )
    return addCorsHeaders(response, request)
  }
}

