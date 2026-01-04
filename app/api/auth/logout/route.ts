import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, deleteSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addCorsHeaders, handleCorsPreflight } from '@/lib/cors'

// Handle OPTIONS preflight requests

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 })
}

export async function POST(request: NextRequest) {
  // Handle CORS preflight requests (fallback, though OPTIONS should be handled above)
  const preflightResponse = handleCorsPreflight(request)
  if (preflightResponse) {
    return preflightResponse
  }
  try {
    const token = getTokenFromRequest(request)

    if (token) {
      await deleteSession(token)

      // Create audit log
      const user = await prisma.user.findFirst({
        where: {
          sessions: {
            some: {
              token,
            },
          },
        },
      })

      if (user) {
        await prisma.auditLog.create({
          data: {
            action: 'LOGOUT',
            user: user.email,
            details: `User logged out: ${user.email}`,
          },
        })
      }
    }

    const response = NextResponse.json({ success: true })
    // Delete cookie with same settings as when it was set
    // This ensures it's properly cleared
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.VERCEL === '1' || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    })
    return addCorsHeaders(response, request)
  } catch (error) {
    console.error('Logout error:', error)
    const response = NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
    return addCorsHeaders(response, request)
  }
}

