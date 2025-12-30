/**
 * POST /api/auth/2fa/verify
 * 
 * Verify 2FA code and enable 2FA for the current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'
import { authenticator } from 'otplib'

export async function POST(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const body = await request.json()
      const { code, secret } = body

      if (!code || !secret) {
        return NextResponse.json(
          { error: 'Code and secret are required' },
          { status: 400 }
        )
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      })

      if (!dbUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      // Verify the code matches the secret
      const isValid = authenticator.verify({
        token: code,
        secret: secret || dbUser.twoFactorSecret || '',
      })

      if (!isValid) {
        return NextResponse.json(
          { 
            error: 'Invalid verification code',
            errorCode: 'INVALID_CODE',
            troubleshooting: [
              'Make sure you entered the 6-digit code correctly',
              'Check that your device time is synchronized',
              'Try generating a new code from your authenticator app',
            ],
          },
          { status: 400 }
        )
      }

      // Enable 2FA
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: secret || dbUser.twoFactorSecret,
        },
      })

      // Get backup codes (they were generated in the generate step)
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          twoFactorBackupCodes: true,
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: '2FA_ENABLED',
          user: user.email,
          userRole: user.role,
          details: 'Two-factor authentication enabled',
        },
      })

      return NextResponse.json({
        success: true,
        enabled: true,
        backupCodes: updatedUser?.twoFactorBackupCodes || [],
        message: 'Two-factor authentication has been enabled',
      })
    } catch (error: any) {
      console.error('Error verifying 2FA code:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to verify 2FA code' },
        { status: 500 }
      )
    }
  })(request)
}

