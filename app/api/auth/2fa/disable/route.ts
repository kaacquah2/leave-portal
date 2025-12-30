/**
 * POST /api/auth/2fa/disable
 * 
 * Disable 2FA for the current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'

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

      if (!dbUser.twoFactorEnabled) {
        return NextResponse.json(
          { error: '2FA is not enabled for this account' },
          { status: 400 }
        )
      }

      // Disable 2FA (but keep secret and backup codes in case user wants to re-enable)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: false,
          // Optionally clear secret and backup codes for security
          // twoFactorSecret: null,
          // twoFactorBackupCodes: [],
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: '2FA_DISABLED',
          user: user.email,
          userRole: user.role,
          details: 'Two-factor authentication disabled',
        },
      })

      return NextResponse.json({
        success: true,
        enabled: false,
        message: 'Two-factor authentication has been disabled',
      })
    } catch (error: any) {
      console.error('Error disabling 2FA:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to disable 2FA' },
        { status: 500 }
      )
    }
  })(request)
}

