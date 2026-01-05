/**
 * POST /api/auth/change-password
 * 
 * Change password for logged-in users or users requiring password change
 * This route can be used for:
 * - First-time login password change (email + current password + new password)
 * - Expired password change (email + current password + new password)
 * - Regular password change while logged in (current password + new password)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { 
  validatePasswordComplexity, 
  isPasswordInHistory, 
  addPasswordToHistory, 
  setPasswordExpiry,
  isSeededUser
} from '@/lib/password-policy'

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, currentPassword, newPassword } = body

    // Validate required fields
    if (!newPassword) {
      return NextResponse.json(
        { 
          error: 'New password is required',
          errorCode: 'MISSING_NEW_PASSWORD',
        },
        { status: 400 }
      )
    }

    // Determine user - either from auth context (logged in) or email + currentPassword (first login/expired)
    let user = null
    let userId: string | null = null

    // Try to get user from auth context (if logged in)
    try {
      // Check if user is logged in by trying to get auth token from cookie
      const token = request.cookies.get('token')?.value
      if (token) {
        // User might be logged in, try to get user from token
        const { getUserFromToken } = await import('@/lib/auth')
        const tokenUser = await getUserFromToken(token)
        if (tokenUser) {
          user = await prisma.user.findUnique({
            where: { id: tokenUser.id },
          })
          if (user) {
            userId = user.id
          }
        }
      }
    } catch {
      // Not logged in or token invalid, will use email + currentPassword
    }

    // If not logged in, require email and currentPassword
    if (!user || !userId) {
      if (!email || !currentPassword) {
        return NextResponse.json(
          { 
            error: 'Email and current password are required',
            errorCode: 'MISSING_CREDENTIALS',
            troubleshooting: [
              'Please provide your email and current password',
              'This is required for first-time login or expired password changes',
            ],
          },
          { status: 400 }
        )
      }

      // Find user by email
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      })

      if (!user) {
        return NextResponse.json(
          { 
            error: 'Invalid email or password',
            errorCode: 'INVALID_CREDENTIALS',
          },
          { status: 401 }
        )
      }

      // Verify current password
      const isValid = await verifyPassword(currentPassword, user.passwordHash)
      if (!isValid) {
        return NextResponse.json(
          { 
            error: 'Invalid current password',
            errorCode: 'INVALID_CURRENT_PASSWORD',
            troubleshooting: [
              'The current password you entered is incorrect',
              'Please check for typos',
              'Make sure Caps Lock is not enabled',
            ],
          },
          { status: 401 }
        )
      }

      userId = user.id
    } else {
      // User is logged in, but still verify currentPassword if provided
      if (currentPassword) {
        const isValid = await verifyPassword(currentPassword, user.passwordHash)
        if (!isValid) {
          return NextResponse.json(
            { 
              error: 'Invalid current password',
              errorCode: 'INVALID_CURRENT_PASSWORD',
              troubleshooting: [
                'The current password you entered is incorrect',
                'Please check for typos',
                'Make sure Caps Lock is not enabled',
              ],
            },
            { status: 401 }
          )
        }
      }
    }

    // Ghana Government Compliance: Validate password complexity
    const passwordValidation = validatePasswordComplexity(newPassword)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { 
          error: 'Password does not meet complexity requirements',
          errorCode: 'WEAK_PASSWORD',
          errors: passwordValidation.errors,
          troubleshooting: [
            ...passwordValidation.errors,
            'Use a combination of uppercase, lowercase, numbers, and special characters',
            'Avoid common words or personal information',
          ],
        },
        { status: 400 }
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

    // Ghana Government Compliance: Check password history (prevent reuse)
    const isInHistory = await isPasswordInHistory(user.id, newPassword)
    if (isInHistory) {
      return NextResponse.json(
        { 
          error: 'This password has been used recently and cannot be reused',
          errorCode: 'PASSWORD_IN_HISTORY',
          troubleshooting: [
            'You cannot reuse any of your last 5 passwords',
            'Choose a password you have not used before',
            'Use a completely new password',
          ],
        },
        { status: 400 }
      )
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword)

    // Update password and set expiry
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        passwordExpiresAt: null, // Will be set by setPasswordExpiry
        failedLoginAttempts: 0, // Reset failed attempts on password change
        lockedUntil: null, // Unlock account if locked
      },
    })

    // Ghana Government Compliance: Add password to history and set expiry
    await addPasswordToHistory(user.id, passwordHash)
    
    // Set password expiry (90 days) - except for seeded users
    if (!isSeededUser(user.email)) {
      await setPasswordExpiry(user.id)
    } else {
      // Seeded users: set passwordExpiresAt to null (never expire)
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordExpiresAt: null },
      })
    }

    // Create audit log
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_CHANGED',
        user: user.email,
        userRole: user.role,
        details: `Password changed for user: ${user.email}`,
        ip,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error: any) {
    console.error('Password change error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to change password',
        errorCode: 'CHANGE_FAILED',
        troubleshooting: [
          'Check that all fields are filled correctly',
          'Ensure the password meets requirements',
          'Try again or contact IT support if the issue persists',
        ],
      },
      { status: 500 }
    )
  }
}

