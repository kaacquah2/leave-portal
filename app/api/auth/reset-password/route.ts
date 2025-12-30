/**
 * POST /api/auth/reset-password
 * 
 * Reset password using a valid reset token
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword, verifyPasswordResetToken, markPasswordResetTokenAsUsed } from '@/lib/auth'
import { sendEmail, generatePasswordResetSuccessEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, newPassword } = body

    if (!token || !newPassword) {
      return NextResponse.json(
        { 
          error: 'Token and new password are required',
          errorCode: 'MISSING_FIELDS',
          troubleshooting: [
            'Ensure both token and newPassword are provided',
            'Check that the reset link is complete',
            'Try requesting a new password reset if the link is invalid',
          ],
        },
        { status: 400 }
      )
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { 
          error: 'Password must be at least 8 characters long',
          errorCode: 'WEAK_PASSWORD',
          troubleshooting: [
            'Password must be at least 8 characters',
            'Use a combination of letters, numbers, and special characters',
            'Avoid common words or personal information',
          ],
        },
        { status: 400 }
      )
    }

    // Verify token
    const tokenData = await verifyPasswordResetToken(token)
    if (!tokenData) {
      return NextResponse.json(
        { 
          error: 'Invalid or expired reset token',
          errorCode: 'INVALID_TOKEN',
          troubleshooting: [
            'The reset token may have expired (tokens expire after 1 hour)',
            'The reset token may have already been used',
            'Request a new password reset link',
            'Check that you copied the complete link from the email',
          ],
        },
        { status: 400 }
      )
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: tokenData.userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if new password is same as current password
    const isSamePassword = await verifyPassword(newPassword, user.passwordHash)
    if (isSamePassword) {
      return NextResponse.json(
        { 
          error: 'New password must be different from current password',
          errorCode: 'SAME_PASSWORD',
          troubleshooting: [
            'Choose a different password than your current one',
            'Use a password you have not used before',
          ],
        },
        { status: 400 }
      )
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword)

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0, // Reset failed attempts on password reset
        lockedUntil: null, // Unlock account if locked
      },
    })

    // Mark token as used
    await markPasswordResetTokenAsUsed(token)

    // Delete all sessions (force re-login)
    await prisma.session.deleteMany({
      where: { userId: user.id },
    })

    // Create audit log
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_RESET',
        user: user.email,
        userRole: user.role,
        details: `Password reset completed for user: ${user.email}`,
        ip,
      },
    })

    // Send confirmation email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Successful',
        html: generatePasswordResetSuccessEmail(user.email),
      })
    } catch (emailError) {
      // Log but don't fail the request if email fails
      console.error('Failed to send password reset confirmation email:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    })
  } catch (error: any) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to reset password',
        errorCode: 'RESET_FAILED',
        troubleshooting: [
          'Check that the reset token is valid',
          'Ensure the password meets requirements',
          'Try requesting a new password reset if this persists',
          'Contact IT support if the issue continues',
        ],
      },
      { status: 500 }
    )
  }
}

