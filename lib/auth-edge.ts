/**
 * Edge-compatible authentication utilities
 * This file only uses Edge Runtime compatible APIs (no Node.js dependencies)
 * Use this in middleware.ts instead of lib/auth.ts
 */
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

export interface AuthUser {
  id: string
  email: string
  role: string
  staffId?: string | null
}

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

