/**
 * Session timeout middleware
 * Checks session validity and updates last activity
 */

import { NextRequest, NextResponse } from 'next/server'
import { isSessionExpired, updateSessionActivity } from '@/lib/security'
import { prisma } from '@/lib/prisma'

export async function checkSessionTimeout(request: NextRequest): Promise<NextResponse | null> {
  // Skip for API routes that don't require session
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/logout')) {
    return null
  }

  // Get session token from cookie
  const sessionToken = request.cookies.get('session-token')?.value

  if (!sessionToken) {
    return null // No session, let auth middleware handle it
  }

  try {
    // Find session
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: { select: { sessionTimeout: true } } },
    })

    if (!session) {
      return null // Session not found, let auth middleware handle it
    }

    // Check if session expired
    const expired = await isSessionExpired(session.id)

    if (expired) {
      // Session expired, clear cookie and return 401
      const response = NextResponse.json(
        { error: 'Session expired. Please login again.' },
        { status: 401 }
      )
      response.cookies.delete('session-token')
      return response
    }

    // Update last activity
    await updateSessionActivity(session.id)

    return null // Session valid, continue
  } catch (error) {
    console.error('Error checking session timeout:', error)
    return null // On error, let request continue
  }
}

