/**
 * Edge-compatible authentication utilities
 * This file only uses Edge Runtime compatible APIs (no Node.js dependencies)
 * Use this in middleware.ts instead of lib/auth.ts
 */
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

// Import shared types
import type { AuthUser } from '../types/auth'
export type { AuthUser }

/**
 * Verify JWT token without database checks (Edge-compatible)
 * This is a lightweight verification for middleware
 * Full verification with session checks should be done in API routes using getUserFromToken
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (payload && typeof payload === 'object' && 'id' in payload && 'email' in payload && 'role' in payload) {
      return {
        id: String(payload.id),
        email: String(payload.email),
        role: String(payload.role),
        staffId: payload.staffId ? String(payload.staffId) : null,
      }
    }
    return null
  } catch (error) {
    return null
  }
}

/**
 * Extract token from request (Edge-compatible)
 */
export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Also check cookies
  const cookies = request.headers.get('cookie')
  if (cookies) {
    const tokenMatch = cookies.match(/token=([^;]+)/)
    if (tokenMatch) {
      return tokenMatch[1]
    }
  }

  return null
}

/**
 * Get user from token (Edge-compatible, lightweight)
 * This is a lightweight version that only verifies the JWT token
 * For full verification with session checks, use getUserFromToken from auth.ts in API routes
 */
export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  return verifyToken(token)
}

