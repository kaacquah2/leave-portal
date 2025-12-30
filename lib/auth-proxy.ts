import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, getUserFromToken, type AuthUser } from './auth'

// Re-export AuthUser for use in other modules
export type { AuthUser }
import { isSessionExpired, updateSessionActivity, isAccountLocked } from './security'
import { prisma } from './prisma'

/**
 * Role mapping for backward compatibility and normalization
 * Maps various role formats to their canonical equivalents
 */
const ROLE_EQUIVALENTS: Record<string, string[]> = {
  // Admin roles
  'admin': ['admin', 'SYS_ADMIN', 'SYSTEM_ADMIN', 'SECURITY_ADMIN'],
  'SYS_ADMIN': ['admin', 'SYS_ADMIN', 'SYSTEM_ADMIN', 'SECURITY_ADMIN'],
  'SYSTEM_ADMIN': ['admin', 'SYS_ADMIN', 'SYSTEM_ADMIN', 'SECURITY_ADMIN'],
  'SECURITY_ADMIN': ['admin', 'SYS_ADMIN', 'SYSTEM_ADMIN', 'SECURITY_ADMIN'],
  
  // HR roles
  'hr': ['hr', 'HR_OFFICER', 'hr_officer'],
  'hr_assistant': ['hr_assistant', 'HR_OFFICER', 'hr', 'hr_officer'],
  'HR_OFFICER': ['hr', 'HR_OFFICER', 'hr_officer', 'hr_assistant'],
  'hr_officer': ['hr', 'HR_OFFICER', 'hr_officer', 'hr_assistant'],
  'hr_director': ['hr_director', 'HR_DIRECTOR'],
  'HR_DIRECTOR': ['hr_director', 'HR_DIRECTOR'],
  
  // Employee roles
  'employee': ['employee', 'EMPLOYEE'],
  'EMPLOYEE': ['employee', 'EMPLOYEE'],
  
  // Manager/Supervisor roles
  'manager': ['manager', 'SUPERVISOR', 'supervisor'],
  'supervisor': ['manager', 'SUPERVISOR', 'supervisor'],
  'SUPERVISOR': ['manager', 'SUPERVISOR', 'supervisor'],
  
  // Director roles
  'deputy_director': ['deputy_director', 'DIRECTOR', 'director', 'directorate_head'],
  'director': ['deputy_director', 'DIRECTOR', 'director', 'directorate_head'],
  'DIRECTOR': ['deputy_director', 'DIRECTOR', 'director', 'directorate_head'],
  'directorate_head': ['deputy_director', 'DIRECTOR', 'director', 'directorate_head'],
}

/**
 * Get all equivalent roles for a given role
 */
function getRoleEquivalents(role: string): string[] {
  const normalized = role.toLowerCase()
  const upper = role.toUpperCase()
  
  // Check direct mapping
  if (ROLE_EQUIVALENTS[role]) {
    return ROLE_EQUIVALENTS[role]
  }
  if (ROLE_EQUIVALENTS[normalized]) {
    return ROLE_EQUIVALENTS[normalized]
  }
  if (ROLE_EQUIVALENTS[upper]) {
    return ROLE_EQUIVALENTS[upper]
  }
  
  // Return the role itself and normalized versions
  return [role, normalized, upper]
}

/**
 * Check if user role matches any of the allowed roles (with normalization)
 */
function hasMatchingRole(userRole: string, allowedRoles: string[]): boolean {
  // Direct match
  if (allowedRoles.includes(userRole)) {
    return true
  }
  
  // Get equivalents for user role
  const userEquivalents = getRoleEquivalents(userRole)
  
  // Check if any allowed role matches any user equivalent
  for (const allowedRole of allowedRoles) {
    const allowedEquivalents = getRoleEquivalents(allowedRole)
    
    // Check for intersection
    if (userEquivalents.some(eq => allowedEquivalents.includes(eq))) {
      return true
    }
    
    // Also check case-insensitive match
    if (userRole.toLowerCase() === allowedRole.toLowerCase()) {
      return true
    }
  }
  
  return false
}

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

    // Check role-based access (with role normalization)
    if (options.allowedRoles && options.allowedRoles.length > 0) {
      if (!hasMatchingRole(user.role, options.allowedRoles)) {
        // Log for debugging
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
          console.log('[Auth Debug] Role check failed:', {
            userRole: user.role,
            allowedRoles: options.allowedRoles,
            url: request.url,
            path: request.nextUrl.pathname,
          })
        }
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
 * Helper to check if user has required role (with normalization)
 */
export function hasRole(user: AuthUser, allowedRoles: string[]): boolean {
  return hasMatchingRole(user.role, allowedRoles)
}

/**
 * Helper functions for common role checks (with normalization)
 */
export function isAdmin(user: AuthUser): boolean {
  return hasMatchingRole(user.role, ['admin', 'SYS_ADMIN', 'SYSTEM_ADMIN', 'SECURITY_ADMIN'])
}

export function isHR(user: AuthUser): boolean {
  return hasMatchingRole(user.role, ['hr', 'hr_assistant', 'HR_OFFICER', 'HR_DIRECTOR', 'hr_officer', 'hr_director'])
}

export function isHROfficer(user: AuthUser): boolean {
  return hasMatchingRole(user.role, ['hr', 'hr_assistant', 'HR_OFFICER', 'hr_officer'])
}

export function isHRDirector(user: AuthUser): boolean {
  return hasMatchingRole(user.role, ['HR_DIRECTOR', 'hr_director'])
}

export function isEmployee(user: AuthUser): boolean {
  return hasMatchingRole(user.role, ['employee', 'EMPLOYEE'])
}

export function isManager(user: AuthUser): boolean {
  return hasMatchingRole(user.role, ['manager', 'supervisor', 'SUPERVISOR', 'deputy_director', 'DIRECTOR'])
}

export function isAuditor(user: AuthUser): boolean {
  return hasMatchingRole(user.role, ['auditor', 'AUDITOR', 'internal_auditor'])
}

export function isChiefDirector(user: AuthUser): boolean {
  return hasMatchingRole(user.role, ['CHIEF_DIRECTOR', 'chief_director'])
}

