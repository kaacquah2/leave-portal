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
 * Role-based page routes - handled client-side now
 * These routes handle authentication client-side using cookies
 */
const rolePageRoutes: Record<string, string[]> = {
  '/admin': ['admin'],
  '/hr': ['hr'],
  '/manager': ['manager'],
  '/employee': ['employee'],
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
 *     import { withAuth } from '@/lib/auth-proxy'
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

  // Allow role-based page routes - they handle authentication client-side
  // This prevents redirect loops when tokens are stored in httpOnly cookies
  if (Object.keys(rolePageRoutes).some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next()
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

