import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// POST disable 2FA
export const POST = withAuth(async ({ user }: AuthContext) => {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorEnabled: true },
    })

    if (!dbUser || !dbUser.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      )
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: '2FA_DISABLED',
        user: user.email || 'system',
        staffId: user.staffId || undefined,
        details: 'Two-factor authentication disabled',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disabling 2FA:', error)
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['employee', 'hr', 'manager', 'admin'] })

