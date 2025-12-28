import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { createPasswordResetToken } from '@/lib/auth'
import { sendEmail, generatePasswordResetEmail, generateNewUserCredentialsEmail } from '@/lib/email'


// GET all password reset requests
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR and admin can view password reset requests
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const status = request.nextUrl.searchParams.get('status') || undefined
    const where: any = {}
    if (status) {
      where.status = status
    }

    const requests = await prisma.passwordResetRequest.findMany({
      where,
      include: {
        user: {
          include: {
            staff: {
              select: {
                firstName: true,
                lastName: true,
                staffId: true,
                department: true,
              },
            },
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
      take: 100, // Limit to recent 100 requests
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching password reset requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch password reset requests' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin'] })

// POST approve password reset request
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR and admin can approve password reset requests
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { requestId, action, rejectionReason } = body // action: 'approve' | 'reject'

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Request ID and action are required' },
        { status: 400 }
      )
    }

    const resetRequest = await prisma.passwordResetRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          include: {
            staff: true,
          },
        },
      },
    })

    if (!resetRequest) {
      return NextResponse.json(
        { error: 'Password reset request not found' },
        { status: 404 }
      )
    }

    if (resetRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Request has already been ${resetRequest.status}` },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      // Generate reset token
      const resetToken = await createPasswordResetToken(resetRequest.userId)

      // Update request status
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24) // Token valid for 24 hours

      await prisma.passwordResetRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: user.email,
          resetToken,
          tokenExpiresAt: expiresAt,
        },
      })

      // Send email with reset link
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}`

      const userName = resetRequest.user.staff
        ? `${resetRequest.user.staff.firstName} ${resetRequest.user.staff.lastName}`
        : undefined

      const emailSent = await sendEmail({
        to: resetRequest.email,
        subject: 'Password Reset Approved - HR Leave Portal',
        html: generatePasswordResetEmail(resetLink, userName),
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'password_reset_approved',
          user: user.email,
          staffId: resetRequest.user.staffId || undefined,
          details: `Password reset request approved for ${resetRequest.email}. Email sent: ${emailSent}`,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Password reset request approved. User will receive an email with reset instructions.',
        resetToken, // Include token in case admin wants to provide it manually
      })
    } else if (action === 'reject') {
      // Update request status
      await prisma.passwordResetRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          rejectedAt: new Date(),
          rejectedBy: user.email,
          rejectionReason: rejectionReason || 'No reason provided',
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'password_reset_rejected',
          user: user.email,
          staffId: resetRequest.user.staffId || undefined,
          details: `Password reset request rejected for ${resetRequest.email}. Reason: ${rejectionReason || 'No reason provided'}`,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Password reset request rejected.',
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error processing password reset request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin'] })

