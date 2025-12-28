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
    response.cookies.delete('token')
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}

