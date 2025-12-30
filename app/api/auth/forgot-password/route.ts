/**
 * POST /api/auth/forgot-password
 * 
 * Request password reset - sends reset email
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPasswordResetToken } from '@/lib/auth'
import { sendEmail, generatePasswordResetEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { 
          error: 'Email is required',
          errorCode: 'MISSING_EMAIL',
        },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user && user.active) {
      // Create password reset token
      const token = await createPasswordResetToken(user.id)

      // Create password reset request
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

      // Send reset email
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/reset-password?token=${token}`
      
      try {
        await sendEmail({
          to: user.email,
          subject: 'Password Reset Request',
          html: generatePasswordResetEmail(resetUrl, user.email),
        })
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError)
        // Still return success to prevent enumeration
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'PASSWORD_RESET_REQUESTED',
          user: user.email,
          userRole: user.role,
          details: `Password reset requested for user: ${user.email}`,
          ip,
        },
      })
    }

    // Always return success (security best practice - prevents email enumeration)
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    })
  } catch (error: any) {
    console.error('Forgot password error:', error)
    // Still return success to prevent enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    })
  }
}

