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
 * Only handles API route authentication - page routes use client-side auth
 * 
 * Note: Page routes (/hr, /manager, etc.) handle authentication client-side
 * using cookies, so we don't redirect them here to avoid conflicts.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow all page routes - they handle authentication client-side
  // This prevents redirect loops when tokens are stored in httpOnly cookies
  if (Object.keys(rolePageRoutes).some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next()
  }

  // Only enforce authentication for API routes (handled by auth-proxy)
  // API routes should use withAuth() from lib/auth-proxy.ts
  if (pathname.startsWith('/api/')) {
    // API routes are handled by auth-proxy, so we just allow them through
    return NextResponse.next()
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

