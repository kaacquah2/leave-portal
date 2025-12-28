import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET 2FA status
export const GET = withAuth(async ({ user }: AuthContext) => {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        twoFactorEnabled: true,
        email: true,
      },
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      enabled: dbUser.twoFactorEnabled || false,
      email: dbUser.email,
    })
  } catch (error) {
    console.error('Error fetching 2FA status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch 2FA status' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['employee', 'hr', 'manager', 'admin'] })

