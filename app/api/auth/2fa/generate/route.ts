import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { authenticator } from 'otplib'

// POST generate 2FA secret
export const POST = withAuth(async ({ user }: AuthContext) => {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, twoFactorEnabled: true },
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (dbUser.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is already enabled' },
        { status: 400 }
      )
    }

    // Generate secret
    const secret = authenticator.generateSecret()
    
    // Generate backup codes (8 codes)
    const backupCodes = Array.from({ length: 8 }, () => {
      return Math.random().toString(36).substring(2, 10).toUpperCase()
    })

    // Store secret temporarily (not enabled yet, will be enabled after verification)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secret,
        twoFactorBackupCodes: backupCodes,
        // Don't enable yet - wait for verification
      },
    })

    return NextResponse.json({
      secret,
      email: dbUser.email,
      backupCodes,
    })
  } catch (error) {
    console.error('Error generating 2FA secret:', error)
    return NextResponse.json(
      { error: 'Failed to generate 2FA secret' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['employee', 'hr', 'manager', 'admin'] })

