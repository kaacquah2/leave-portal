import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { authenticator } from 'otplib'

// POST verify and enable 2FA
export const POST = withAuth(async ({ user, request }: AuthContext) => {
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
      select: {
        twoFactorSecret: true,
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

    // Verify code
    const isValid = authenticator.verify({
      token: code,
      secret: secret || dbUser.twoFactorSecret || '',
    })

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Generate new backup codes
    const backupCodes = Array.from({ length: 8 }, () => {
      return Math.random().toString(36).substring(2, 10).toUpperCase()
    })

    // Enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret || dbUser.twoFactorSecret,
        twoFactorBackupCodes: backupCodes,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: '2FA_ENABLED',
        user: user.email || 'system',
        staffId: user.staffId || undefined,
        details: 'Two-factor authentication enabled',
      },
    })

    return NextResponse.json({
      success: true,
      backupCodes,
    })
  } catch (error) {
    console.error('Error verifying 2FA:', error)
    return NextResponse.json(
      { error: 'Failed to verify 2FA code' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['employee', 'hr', 'manager', 'admin'] })

