/**
 * POST /api/auth/2fa/generate
 * 
 * Generate 2FA secret and backup codes for the current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'
import { authenticator } from 'otplib'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      })

      if (!dbUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      // Generate secret
      const secret = authenticator.generateSecret()

      // Generate backup codes (10 codes, 8 characters each)
      const backupCodes: string[] = []
      for (let i = 0; i < 10; i++) {
        const code = randomBytes(4).toString('hex').toUpperCase()
        backupCodes.push(code)
      }

      // Store secret and backup codes (but don't enable yet - user needs to verify first)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorSecret: secret,
          twoFactorBackupCodes: backupCodes,
          // Don't enable yet - wait for verification
          twoFactorEnabled: false,
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: '2FA_SECRET_GENERATED',
          user: user.email,
          userRole: user.role,
          details: 'Two-factor authentication secret generated',
        },
      })

      return NextResponse.json({
        success: true,
        secret,
        backupCodes,
        email: dbUser.email,
        message: '2FA secret generated. Please verify to enable.',
      })
    } catch (error: any) {
      console.error('Error generating 2FA secret:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to generate 2FA secret' },
        { status: 500 }
      )
    }
  })(request)
}

