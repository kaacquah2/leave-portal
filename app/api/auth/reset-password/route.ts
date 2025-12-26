import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, createPasswordResetToken, verifyPasswordResetToken, markPasswordResetTokenAsUsed } from '@/lib/auth'
import { sendEmail, generatePasswordResetEmail, generatePasswordResetSuccessEmail } from '@/lib/email'
import { getDatabaseErrorMessage } from '@/lib/db-utils'

// POST request password reset (creates a request that needs admin approval)
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      include: { staff: true },
    })

    // For security, don't reveal if user exists or not
    // Always return success message
    if (user) {
      // Check if there's already a pending request
      const existingRequest = await prisma.passwordResetRequest.findFirst({
        where: {
          userId: user.id,
          status: 'pending',
        },
        orderBy: { requestedAt: 'desc' },
      })

      if (existingRequest) {
        return NextResponse.json({
          message: 'A password reset request is already pending. Please wait for admin approval or contact HR if urgent.',
        })
      }

      // Create password reset request (pending admin approval)
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      const userAgent = request.headers.get('user-agent') || undefined

      await prisma.passwordResetRequest.create({
        data: {
          userId: user.id,
          email: user.email,
          status: 'pending',
          ip,
          userAgent,
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'password_reset_requested',
          user: user.email,
          staffId: user.staffId || undefined,
          details: `Password reset requested for ${email}. Awaiting admin approval.`,
          ip,
        },
      })
    }

    return NextResponse.json({
      message: 'If an account with that email exists, your password reset request has been submitted and is pending admin approval. You will receive an email once it is approved.',
    })
  } catch (error: any) {
    console.error('Error processing password reset request:', error)
    
    // Check for database connection errors
    const dbError = getDatabaseErrorMessage(error)
    if (dbError.statusCode === 503) {
      return NextResponse.json(
        { 
          error: dbError.message,
          details: dbError.details
        },
        { status: dbError.statusCode }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}

// PUT reset password with token
export async function PUT(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Verify the reset token - check both PasswordResetToken and PasswordResetRequest
    let tokenData = await verifyPasswordResetToken(token)
    let resetRequest = null

    // If not found in PasswordResetToken, check PasswordResetRequest
    if (!tokenData) {
      resetRequest = await prisma.passwordResetRequest.findUnique({
        where: { resetToken: token },
        include: { user: true },
      })

      if (!resetRequest) {
        return NextResponse.json(
          { error: 'Invalid or expired reset token' },
          { status: 400 }
        )
      }

      if (resetRequest.status !== 'approved') {
        return NextResponse.json(
          { error: 'Password reset request has not been approved yet' },
          { status: 400 }
        )
      }

      if (resetRequest.tokenExpiresAt && resetRequest.tokenExpiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Reset token has expired. Please request a new password reset.' },
          { status: 400 }
        )
      }

      tokenData = { userId: resetRequest.userId }
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword)

    // Update user password
    const user = await prisma.user.update({
      where: { id: tokenData.userId },
      data: { passwordHash },
      include: { staff: true },
    })

    // Mark token as used
    await markPasswordResetTokenAsUsed(token)

    // Update password reset request status if it exists
    if (resetRequest) {
      await prisma.passwordResetRequest.update({
        where: { id: resetRequest.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      })
    }

    // Send success email
    const userName = user.staff 
      ? `${user.staff.firstName} ${user.staff.lastName}`
      : undefined

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Successful - HR Leave Portal',
      html: generatePasswordResetSuccessEmail(userName),
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'password_reset_completed',
        user: user.email,
        staffId: user.staffId || undefined,
        details: 'Password successfully reset',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      },
    })

    return NextResponse.json({
      message: 'Password has been successfully reset. You can now log in with your new password.',
    })
  } catch (error: any) {
    console.error('Error resetting password:', error)
    
    // Check for database connection errors
    const dbError = getDatabaseErrorMessage(error)
    if (dbError.statusCode === 503) {
      return NextResponse.json(
        { 
          error: dbError.message,
          details: dbError.details
        },
        { status: dbError.statusCode }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}

