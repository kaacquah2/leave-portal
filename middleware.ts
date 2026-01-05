import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit, RATE_LIMITS, createRateLimitResponse, type RateLimitConfig } from '@/lib/rate-limit'

/**
 * Public routes that don't require authentication
 * These routes are accessible without a valid JWT token
 */
const publicRoutes = [
  // Root page
  '/',
  // Authentication endpoints (public)
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/refresh',
  // Public pages
  '/reset-password',
  '/change-password',
  // Health check endpoint (may be public for monitoring)
  '/api/health',
]

/**
 * Public API routes that should have rate limiting but no auth
 * These are separate from publicRoutes to apply different rate limits
 */
const publicApiRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
]

/**
 * Role-based page routes - protected server-side and client-side
 * These routes require authentication and specific roles
 */
const rolePageRoutes: Record<string, string[]> = {
  '/admin': ['admin', 'SYSTEM_ADMIN', 'SYS_ADMIN'],
  '/hr': ['hr', 'hr_assistant', 'HR_OFFICER', 'HR_DIRECTOR'],
  '/hr-director': ['HR_DIRECTOR', 'hr_director'],
  '/chief-director': ['CHIEF_DIRECTOR', 'chief_director'],
  '/director': ['DIRECTOR', 'director', 'directorate_head', 'deputy_director'],
  '/unit-head': ['UNIT_HEAD', 'unit_head'],
  '/supervisor': ['SUPERVISOR', 'supervisor', 'manager'],
  '/employee': ['EMPLOYEE', 'employee'],
  '/auditor': ['AUDITOR', 'internal_auditor'],
  '/hod': ['HEAD_OF_DEPARTMENT', 'head_of_department', 'hod'],
  '/head-independent-unit': ['HEAD_OF_INDEPENDENT_UNIT', 'head_of_independent_unit'],
}

/**
 * Enhanced middleware for Next.js 16
 * 
 * Responsibilities:
 * 1. Rate limiting for API routes (especially public auth endpoints)
 * 2. Basic route protection and validation
 * 3. Documentation of authentication flow
 * 
 * Authentication Strategy:
 * - Page routes (/hr, /manager, etc.): Handled client-side using cookies
 *   - Middleware allows them through to avoid redirect loops
 *   - Client-side code checks authentication and redirects if needed
 * 
 * - API routes: Protected by withAuth() wrapper from lib/auth-proxy.ts
 *   - ALL API routes (except public auth routes) MUST use withAuth()
 *   - Example:
 *     ```typescript
 *     import { withAuth } from '@/lib/auth'
 *     
 *     export async function GET(request: NextRequest) {
 *       return withAuth(async ({ user }) => {
 *         // Your handler code here
 *         return NextResponse.json({ data: '...' })
 *       }, { allowedRoles: ['admin', 'hr'] })(request)
 *     }
 *     ```
 *   - The withAuth() wrapper handles:
 *     * Token extraction and validation
 *     * Session timeout checking
 *     * Account lock status
 *     * Role-based access control
 *     * CORS headers
 * 
 * Rate Limiting:
 * - Public auth endpoints have stricter limits (5 requests per 15 minutes)
 * - General API endpoints have default limits (100 requests per minute)
 * - Rate limits are applied at middleware level for early rejection
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    // Determine rate limit configuration based on route
    let rateLimitConfig: RateLimitConfig = RATE_LIMITS.default
    
    if (pathname.startsWith('/api/auth/login')) {
      rateLimitConfig = RATE_LIMITS.login
    } else if (pathname.startsWith('/api/auth/forgot-password')) {
      rateLimitConfig = RATE_LIMITS.forgotPassword
    } else if (pathname.startsWith('/api/auth/reset-password')) {
      rateLimitConfig = RATE_LIMITS.resetPassword
    } else if (pathname.startsWith('/api/auth/register')) {
      rateLimitConfig = RATE_LIMITS.register
    }

    // Check rate limit
    const rateLimitResult = await rateLimit(request, rateLimitConfig)
    
    if (!rateLimitResult.allowed) {
      // Return rate limit response with appropriate headers
      return createRateLimitResponse(rateLimitResult, rateLimitConfig.maxRequests)
    }

    // Add rate limit headers to successful requests
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', String(rateLimitConfig.maxRequests))
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime))
    
    // For public API routes, allow through without auth check
    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
      return response
    }

    // For protected API routes, add documentation header
    // Note: Actual authentication is handled by withAuth() wrapper in each route
    // This middleware only applies rate limiting
    response.headers.set('X-Auth-Required', 'true')
    response.headers.set('X-Auth-Method', 'withAuth-wrapper')
    
    return response
  }

  // Allow public page routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Server-side route protection for role-based page routes
  // This adds an extra layer of security beyond client-side checks
  const roleRouteMatch = Object.entries(rolePageRoutes).find(
    ([route]) => pathname === route || pathname.startsWith(`${route}/`)
  )
  
  if (roleRouteMatch) {
    const [route, allowedRoles] = roleRouteMatch
    
    // Get session token from cookie or Bearer header (supports both web and desktop)
    // Web clients use httpOnly cookies, desktop clients use Bearer tokens
    // Use Edge-compatible functions for middleware - import directly to avoid Prisma dependency
    const { getTokenFromRequest, getUserFromToken } = await import('@/lib/auth/auth-edge')
    const sessionToken = getTokenFromRequest(request)
    
    if (!sessionToken) {
      // No session - redirect to login
      const loginUrl = new URL('/', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // Verify token and check role (lightweight check - full auth in page component)
    try {
      const user = await getUserFromToken(sessionToken)
      
      if (!user) {
        // Invalid token - redirect to login
        const loginUrl = new URL('/', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        const response = NextResponse.redirect(loginUrl)
        response.cookies.delete('token')
        return response
      }
      
      // Check if user role matches allowed roles for this route
      const { mapToMoFARole } = await import('@/lib/role-mapping')
      const normalizedRole = mapToMoFARole(user.role)
      const normalizedAllowedRoles = allowedRoles.map(r => mapToMoFARole(r))
      
      if (!normalizedAllowedRoles.includes(normalizedRole)) {
        // Role mismatch - redirect to user's role route
        const { getRoleRoute } = await import('@/lib/role-mapping')
        const userRoute = getRoleRoute(normalizedRole)
        return NextResponse.redirect(new URL(userRoute, request.url))
      }
      
      // Role matches - allow through (client-side will do full verification)
      return NextResponse.next()
    } catch (error) {
      // Error verifying token - redirect to login
      console.error('[Middleware] Error verifying token:', error)
      const loginUrl = new URL('/', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Allow all other routes through (static assets, etc.)
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all routes including API routes for rate limiting
     * Exclude static assets and Next.js internal routes
     * 
     * Note: API routes are matched here for rate limiting purposes.
     * Authentication for API routes is handled by withAuth() wrapper
     * in each individual route handler.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

