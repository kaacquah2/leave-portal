import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, getUserFromToken } from './auth'
import { addCorsHeaders, handleCorsPreflight } from '../cors'
import type { AuthUser } from '../types/auth'

// Re-export AuthUser for use in other modules
export type { AuthUser }

// Re-export CORS functions for use in other modules
export { addCorsHeaders, handleCorsPreflight }
import { isSessionExpired, updateSessionActivity, isAccountLocked } from '../security'
import { prisma } from '../prisma'

/**
 * Type alias for API responses to reduce repetition
 */
export type ApiResponse<T = any> = NextResponse<T> | NextResponse<{ error: string }>

/**
 * Role mapping for backward compatibility and normalization
 * All keys are normalized to lowercase for consistent lookups
 * Maps various role formats to their canonical equivalent sets
 */
const ROLE_EQUIVALENTS: Record<string, Set<string>> = {
  // Admin roles - all consolidated to SYSTEM_ADMIN
  'system_admin': new Set(['system_admin', 'sys_admin', 'admin']),
  'sys_admin': new Set(['system_admin', 'sys_admin', 'admin']),
  'admin': new Set(['system_admin', 'sys_admin', 'admin']),
  
  // HR roles
  'hr': new Set(['hr', 'hr_officer', 'hr_assistant']),
  'hr_assistant': new Set(['hr', 'hr_officer', 'hr_assistant']),
  'hr_officer': new Set(['hr', 'hr_officer', 'hr_assistant']),
  'hr_director': new Set(['hr_director']),
  
  // Employee roles
  'employee': new Set(['employee']),
  
  // Manager/Supervisor roles
  'manager': new Set(['manager', 'supervisor']),
  'supervisor': new Set(['manager', 'supervisor']),
  
  // Director roles
  'deputy_director': new Set(['deputy_director', 'director', 'directorate_head']),
  'director': new Set(['deputy_director', 'director', 'directorate_head']),
  'directorate_head': new Set(['deputy_director', 'director', 'directorate_head']),
  
  // Auditor roles
  'auditor': new Set(['auditor', 'internal_auditor']),
  'internal_auditor': new Set(['auditor', 'internal_auditor']),
  
  // Chief Director
  'chief_director': new Set(['chief_director']),
}

/**
 * Get all equivalent roles for a given role (normalized to lowercase)
 * Uses Set for O(1) lookups and precomputed equivalents
 */
function getRoleEquivalents(role: string): Set<string> {
  const normalized = role.toLowerCase()
  
  // Direct lookup in normalized map
  if (ROLE_EQUIVALENTS[normalized]) {
    return ROLE_EQUIVALENTS[normalized]
  }
  
  // Fallback: return set with normalized role only
  return new Set([normalized])
}

/**
 * Check if user role matches any of the allowed roles (with normalization)
 * Optimized with Set operations for O(1) lookups instead of nested loops
 */
function hasMatchingRole(userRole: string, allowedRoles: string[]): boolean {
  if (allowedRoles.length === 0) return false
  
  // Normalize user role to lowercase
  const normalizedUserRole = userRole.toLowerCase()
  
  // Get equivalent set for user role
  const userEquivalents = getRoleEquivalents(userRole)
  
  // Check each allowed role
  for (const allowedRole of allowedRoles) {
    const normalizedAllowedRole = allowedRole.toLowerCase()
    
    // Direct case-insensitive match
    if (normalizedUserRole === normalizedAllowedRole) {
      return true
    }
    
    // Get equivalent set for allowed role
    const allowedEquivalents = getRoleEquivalents(allowedRole)
    
    // Check for intersection between user and allowed equivalents
    // Using Set intersection for O(n) instead of nested loops O(n*m)
    for (const userEq of userEquivalents) {
      if (allowedEquivalents.has(userEq)) {
        return true
      }
    }
  }
  
  return false
}

export interface AuthContext {
  user: AuthUser
  request: NextRequest
}

export type AuthHandler<T = any> = (context: AuthContext) => Promise<ApiResponse<T>>

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
): (request: NextRequest) => Promise<ApiResponse<T>> {
  return async (request: NextRequest): Promise<ApiResponse<T>> => {
    // Handle CORS preflight requests
    const preflightResponse = handleCorsPreflight(request)
    if (preflightResponse) {
      return preflightResponse as ApiResponse<T>
    }
    
    // Allow public routes (no auth required)
    if (options.public) {
      // For public routes, we still need to provide a user object structure
      // but it won't be validated
      const mockUser = { id: '', email: '', role: 'public', staffId: null } as AuthUser
      const response = await handler({ user: mockUser, request })
      return addCorsHeaders(response, request) as ApiResponse<T>
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
      const response = NextResponse.json(
        { error: 'Unauthorized - No authentication token found. Please log in first.' },
        { status: 401 }
      )
      return addCorsHeaders(response, request)
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
      const response = NextResponse.json(
        { error: 'Invalid or expired token. Please log in again.' },
        { status: 401 }
      )
      return addCorsHeaders(response, request)
    }

    // Check if account is locked
    const locked = await isAccountLocked(user.id)
    if (locked) {
      const response = NextResponse.json(
        { error: 'Account is locked due to too many failed login attempts. Please try again later.' },
        { status: 403 }
      )
      return addCorsHeaders(response, request)
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
        const response = NextResponse.json(
          { error: 'Session expired. Please login again.' },
          { status: 401 }
        )
        return addCorsHeaders(response, request)
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
        const response = NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
        return addCorsHeaders(response, request)
      }
    }

    // Call the handler with authenticated context
    const response = await handler({ user, request })
    return addCorsHeaders(response, request) as ApiResponse<T>
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
    const response = NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
    return {
      error: addCorsHeaders(response, request)
    }
  }

  const user = await getUserFromToken(token)
  if (!user) {
    const response = NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    )
    return {
      error: addCorsHeaders(response, request)
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
  return hasMatchingRole(user.role, ['SYSTEM_ADMIN', 'SYS_ADMIN', 'admin'])
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

