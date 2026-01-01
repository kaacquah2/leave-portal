/**
 * GET /api/admin/password-reset-requests
 * POST /api/admin/password-reset-requests
 * PATCH /api/admin/password-reset-requests
 * 
 * Admin management of password reset requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { ADMIN_ROLES, HR_ROLES } from '@/lib/role-utils'
import { prisma } from '@/lib/prisma'
import { createPasswordResetToken } from '@/lib/auth'
import { sendEmail, generatePasswordResetEmail } from '@/lib/email'

// GET - List password reset requests
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only admin and HR roles can access
      const { isAdmin, isHR } = await import('@/lib/auth-proxy')
      if (!isAdmin(user) && !isHR(user)) {
        return NextResponse.json(
          { error: 'Forbidden - Admin/HR access required' },
          { status: 403 }
        )
      }

      const searchParams = request.nextUrl.searchParams
      const status = searchParams.get('status') || 'all'
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')

      const where: any = {}
      if (status !== 'all') {
        where.status = status
      }

      const [requests, total] = await Promise.all([
        prisma.passwordResetRequest.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                active: true,
                staff: {
                  select: {
                    staffId: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: { requestedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.passwordResetRequest.count({ where }),
      ])

      return NextResponse.json({
        success: true,
        requests,
        total,
        limit,
        offset,
      })
    } catch (error: any) {
      console.error('Error fetching password reset requests:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch password reset requests' },
        { status: 500 }
      )
    }
  }, { allowedRoles: [...ADMIN_ROLES, ...HR_ROLES] })(request)
}

// POST - Create password reset request (admin-initiated)
export async function POST(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only admin and HR roles can create requests
      const allowedRoles = ['SYS_ADMIN', 'HR_OFFICER', 'HR_DIRECTOR', 'admin', 'hr', 'hr_officer', 'hr_director']
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden - Admin/HR access required' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const { email, autoApprove } = body

      if (!email) {
        return NextResponse.json(
          { error: 'Email is required' },
          { status: 400 }
        )
      }

      // Find user
      const targetUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      })

      if (!targetUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      const userAgent = request.headers.get('user-agent') || undefined

      // Create password reset request
      const resetRequest = await prisma.passwordResetRequest.create({
        data: {
          userId: targetUser.id,
          email: targetUser.email,
          status: autoApprove ? 'approved' : 'pending',
          requestedAt: new Date(),
          approvedAt: autoApprove ? new Date() : null,
          approvedBy: autoApprove ? user.email : null,
          ip,
          userAgent,
        },
      })

      // If auto-approved, generate token and send email
      if (autoApprove) {
        const token = await createPasswordResetToken(targetUser.id)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        if (!appUrl) {
          throw new Error('NEXT_PUBLIC_APP_URL or VERCEL_URL must be set in environment variables')
        }
        const resetUrl = `${appUrl}/reset-password?token=${token}`

        await prisma.passwordResetRequest.update({
          where: { id: resetRequest.id },
          data: {
            resetToken: token,
            tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
            completedAt: null, // Will be set when password is reset
          },
        })

        try {
          await sendEmail({
            to: targetUser.email,
            subject: 'Password Reset Approved',
            html: generatePasswordResetEmail(resetUrl, targetUser.email),
          })
        } catch (emailError) {
          console.error('Failed to send password reset email:', emailError)
        }
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'ADMIN_PASSWORD_RESET_REQUEST_CREATED',
          user: user.email,
          userRole: user.role,
          details: JSON.stringify({
            targetUser: targetUser.email,
            autoApprove,
            requestId: resetRequest.id,
          }),
          ip,
        },
      })

      return NextResponse.json({
        success: true,
        request: resetRequest,
        message: autoApprove 
          ? 'Password reset request approved and email sent'
          : 'Password reset request created',
      })
    } catch (error: any) {
      console.error('Error creating password reset request:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create password reset request' },
        { status: 500 }
      )
    }
  }, { allowedRoles: [...ADMIN_ROLES, ...HR_ROLES] })(request)
}

// PATCH - Update password reset request (approve/reject)
export async function PATCH(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only admin and HR roles can update requests
      const allowedRoles = ['SYS_ADMIN', 'HR_OFFICER', 'HR_DIRECTOR', 'admin', 'hr', 'hr_officer', 'hr_director']
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden - Admin/HR access required' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const { id, action, rejectionReason } = body

      if (!id || !action) {
        return NextResponse.json(
          { error: 'Request ID and action are required' },
          { status: 400 }
        )
      }

      const resetRequest = await prisma.passwordResetRequest.findUnique({
        where: { id },
        include: { user: true },
      })

      if (!resetRequest) {
        return NextResponse.json(
          { error: 'Password reset request not found' },
          { status: 404 }
        )
      }

      if (resetRequest.status !== 'pending') {
        return NextResponse.json(
          { error: `Request is already ${resetRequest.status}` },
          { status: 400 }
        )
      }

      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined

      if (action === 'approve') {
        // Generate reset token
        const token = await createPasswordResetToken(resetRequest.userId)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        if (!appUrl) {
          throw new Error('NEXT_PUBLIC_APP_URL or VERCEL_URL must be set in environment variables')
        }
        const resetUrl = `${appUrl}/reset-password?token=${token}`

        // Update request
        await prisma.passwordResetRequest.update({
          where: { id },
          data: {
            status: 'approved',
            approvedAt: new Date(),
            approvedBy: user.email,
            resetToken: token,
            tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          },
        })

        // Send email
        try {
          await sendEmail({
            to: resetRequest.email,
            subject: 'Password Reset Approved',
            html: generatePasswordResetEmail(resetUrl, resetRequest.email),
          })
        } catch (emailError) {
          console.error('Failed to send password reset email:', emailError)
        }

        // Create audit log
        await prisma.auditLog.create({
          data: {
            action: 'PASSWORD_RESET_REQUEST_APPROVED',
            user: user.email,
            userRole: user.role,
            details: JSON.stringify({
              targetUser: resetRequest.email,
              requestId: id,
            }),
            ip,
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Password reset request approved and email sent',
        })
      } else if (action === 'reject') {
        // Update request
        await prisma.passwordResetRequest.update({
          where: { id },
          data: {
            status: 'rejected',
            rejectedAt: new Date(),
            rejectedBy: user.email,
            rejectionReason: rejectionReason || 'Rejected by administrator',
          },
        })

        // Create audit log
        await prisma.auditLog.create({
          data: {
            action: 'PASSWORD_RESET_REQUEST_REJECTED',
            user: user.email,
            userRole: user.role,
            details: JSON.stringify({
              targetUser: resetRequest.email,
              requestId: id,
              reason: rejectionReason,
            }),
            ip,
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Password reset request rejected',
        })
      } else {
        return NextResponse.json(
          { error: 'Invalid action. Use "approve" or "reject"' },
          { status: 400 }
        )
      }
    } catch (error: any) {
      console.error('Error updating password reset request:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update password reset request' },
        { status: 500 }
      )
    }
  }, { allowedRoles: [...ADMIN_ROLES, ...HR_ROLES] })(request)
}

