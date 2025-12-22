import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth-edge'

// Routes that don't require authentication
const publicRoutes = [
  '/',
  '/api/auth/login',
  '/api/auth/register',
  '/reset-password',
]

// Role-based page routes - handled client-side now
const rolePageRoutes: Record<string, string[]> = {
  '/admin': ['admin'],
  '/hr': ['hr'],
  '/manager': ['manager'],
  '/employee': ['employee'],
}

/**
 * Minimal middleware for Next.js 16
 * Only handles page route redirects - API routes use auth-proxy instead
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes and API routes (handled by auth-proxy)
  if (publicRoutes.some(route => pathname.startsWith(route)) || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Only handle page route authentication checks
  // API routes should use withAuth() from lib/auth-proxy.ts
  const token = request.cookies.get('token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    // Redirect to login for pages
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Verify token
  const user = await verifyToken(token)
  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Check role-based access for page routes
  for (const [route, allowedRoles] of Object.entries(rolePageRoutes)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      if (!allowedRoles.includes(user.role)) {
        // Redirect to home if user doesn't have access
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match page routes only (not API routes)
     * API routes should use withAuth() proxy instead
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

