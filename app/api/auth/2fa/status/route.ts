/**
 * GET /api/auth/2fa/status
 * 
 * Get 2FA status for the current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          twoFactorEnabled: true,
          twoFactorSecret: true,
          twoFactorBackupCodes: true,
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
        hasSecret: !!dbUser.twoFactorSecret,
        hasBackupCodes: dbUser.twoFactorBackupCodes && dbUser.twoFactorBackupCodes.length > 0,
        backupCodesCount: dbUser.twoFactorBackupCodes?.length || 0,
      })
    } catch (error: any) {
      console.error('Error fetching 2FA status:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch 2FA status' },
        { status: 500 }
      )
    }
  })(request)
}

