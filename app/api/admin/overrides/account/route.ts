import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin } from '@/lib/auth'
import { ADMIN_ROLES } from '@/lib/roles'

// Force static export configuration
export const dynamic = 'force-static'

// POST unlock account
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only admin can access this route
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, email, action, reason } = body

    if (!action || !['unlock', 'lock', 'reset-password'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be unlock, lock, or reset-password' },
        { status: 400 }
      )
    }

    // Find user by ID or email
    const targetUser = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : email
      ? await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
      : null

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    let updated
    let details = ''

    switch (action) {
      case 'unlock':
        updated = await prisma.user.update({
          where: { id: targetUser.id },
          data: {
            active: true,
            // Clear any lock flags if you have them
          },
        })
        details = `Unlocked account for ${targetUser.email}`
        break

      case 'lock':
        updated = await prisma.user.update({
          where: { id: targetUser.id },
          data: {
            active: false,
          },
        })
        details = `Locked account for ${targetUser.email}`
        break

      case 'reset-password':
        // In production, you would generate a temporary password and send it via email
        // For now, we'll just log the action
        details = `Password reset initiated for ${targetUser.email}`
        updated = targetUser
        break
    }

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: `ADMIN_OVERRIDE_ACCOUNT_${action.toUpperCase()}`,
        user: user.email,
        userRole: user.role,
        staffId: targetUser.staffId,
        details: `${details} by ${user.email}. Reason: ${reason || 'Admin override'}`,
        timestamp: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        active: updated.active,
      },
      action,
      message: `Account ${action}ed successfully`,
    })
  } catch (error) {
    console.error('Error performing account override:', error)
    return NextResponse.json(
      { error: 'Failed to perform account override' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

