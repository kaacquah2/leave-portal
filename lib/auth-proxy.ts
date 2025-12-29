import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, getUserFromToken, type AuthUser } from './auth'
import { isSessionExpired, updateSessionActivity, isAccountLocked } from './security'
import { prisma } from './prisma'

export interface AuthContext {
  user: AuthUser
  request: NextRequest
}

export type AuthHandler<T = any> = (context: AuthContext) => Promise<NextResponse<T> | NextResponse<{ error: string }>>

export interface AuthOptions {
  /**
   * Roles that are allowed to access this route
   * If not provided, any authenticated user can access
   */
  allowedRoles?: string[]
  /**
   * If true, allows unauthenticated access
   */
  public?: boolean
}

/**
 * Proxy function that handles authentication and role checking
 * Use this to wrap your API route handlers instead of relying on middleware
 */
export function withAuth<T = any>(
  handler: AuthHandler<T>,
  options: AuthOptions = {}
): (request: NextRequest) => Promise<NextResponse<T> | NextResponse<{ error: string }>> {
  return async (request: NextRequest) => {
    // Allow public routes (no auth required)
    if (options.public) {
      // For public routes, we still need to provide a user object structure
      // but it won't be validated
      const mockUser = { id: '', email: '', role: 'guest', staffId: null } as AuthUser
      return handler({ user: mockUser, request })
    }

    // Check authentication
    const token = getTokenFromRequest(request)
    if (!token) {
      // Log for debugging (only in development or when explicitly enabled)
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
        const hasAuthHeader = request.headers.get('authorization')
        const hasCookies = request.headers.get('cookie')
        const cookieCount = request.cookies ? request.cookies.getAll().length : 0
        const cookieNames = request.cookies ? request.cookies.getAll().map(c => c.name) : []
        console.log('[Auth Debug] No token found:', {
          hasAuthHeader: !!hasAuthHeader,
          hasCookies: !!hasCookies,
          cookieCount,
          cookieNames,
          url: request.url,
          path: request.nextUrl.pathname,
        })
        console.log('[Auth Debug] To enable detailed logging, set DEBUG_AUTH=true in Vercel environment variables')
      }
      return NextResponse.json(
        { error: 'Unauthorized - No authentication token found. Please log in first.' },
        { status: 401 }
      )
    }

    // Verify token
    const user = await getUserFromToken(token)
    if (!user) {
      // Log for debugging
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
        console.log('[Auth Debug] Token verification failed:', {
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 20) + '...',
          url: request.url,
          path: request.nextUrl.pathname,
        })
        console.log('[Auth Debug] Possible causes: token expired, session expired, or invalid token')
      }
      return NextResponse.json(
        { error: 'Invalid or expired token. Please log in again.' },
        { status: 401 }
      )
    }

    // Check if account is locked
    const locked = await isAccountLocked(user.id)
    if (locked) {
      return NextResponse.json(
        { error: 'Account is locked due to too many failed login attempts. Please try again later.' },
        { status: 403 }
      )
    }

    // Check session timeout
    const session = await prisma.session.findFirst({
      where: { token, userId: user.id },
    })

    if (session) {
      const expired = await isSessionExpired(session.id)
      if (expired) {
        // Delete expired session
        await prisma.session.delete({ where: { id: session.id } })
        return NextResponse.json(
          { error: 'Session expired. Please login again.' },
          { status: 401 }
        )
      }

      // Update last activity
      await updateSessionActivity(session.id)
    }

    // Check role-based access
    if (options.allowedRoles && options.allowedRoles.length > 0) {
      if (!options.allowedRoles.includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
    }

    // Call the handler with authenticated context
    return handler({ user, request })
  }
}

/**
 * Helper to get authenticated user from request
 * Use this in routes that need to check auth manually
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ user: AuthUser } | { error: NextResponse }> {
  const token = getTokenFromRequest(request)
  if (!token) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  const user = await getUserFromToken(token)
  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }
  }

  return { user }
}

/**
 * Helper to check if user has required role
 */
export function hasRole(user: AuthUser, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role)
}

