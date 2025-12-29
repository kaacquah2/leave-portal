import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, deleteSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


export async function POST(request: NextRequest) {
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
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}

