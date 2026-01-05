/**
 * Notification Preferences API
 * 
 * Ghana Government Compliance:
 * - Data Protection Act 843: User preferences stored securely
 * - Audit trail for preference changes
 * 
 * Legal References:
 * - Data Protection Act, 2012 (Act 843), Section 24 (Data Access)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { logDataAccess } from '@/lib/data-access-logger'

// Force static export configuration (required for static export mode)

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
export async function GET(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Get IP and user agent for data access logging
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Get or create notification preferences
      let preferences = await prisma.notificationPreference.findUnique({
        where: { userId: user.id },
      })

      // Create default preferences if they don't exist
      if (!preferences) {
        preferences = await prisma.notificationPreference.create({
          data: {
            userId: user.id,
            emailEnabled: true,
            pushEnabled: true,
            inAppEnabled: true,
            leaveNotifications: true,
            approvalNotifications: true,
            systemNotifications: true,
            reminderNotifications: true,
            escalationNotifications: true,
          },
        })
      }

      // Log data access (Data Protection Act 843 compliance)
      await logDataAccess({
        userId: user.id,
        userRole: user.role,
        dataType: 'staff_profile',
        action: 'view',
        ip,
        userAgent,
        metadata: { type: 'notification_preferences' },
      })

      return NextResponse.json(preferences)
    } catch (error) {
      console.error('Error fetching notification preferences:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notification preferences' },
        { status: 500 }
      )
    }
  })(request)
}

/**
 * PUT /api/notifications/preferences
 * Update user notification preferences
 */
export async function PUT(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      const body = await req.json()

      // Get IP and user agent
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Update or create preferences
      const preferences = await prisma.notificationPreference.upsert({
        where: { userId: user.id },
        update: {
          emailEnabled: body.emailEnabled,
          pushEnabled: body.pushEnabled,
          inAppEnabled: body.inAppEnabled,
          leaveNotifications: body.leaveNotifications,
          approvalNotifications: body.approvalNotifications,
          systemNotifications: body.systemNotifications,
          reminderNotifications: body.reminderNotifications,
          escalationNotifications: body.escalationNotifications,
          updatedAt: new Date(),
        },
        create: {
          userId: user.id,
          emailEnabled: body.emailEnabled ?? true,
          pushEnabled: body.pushEnabled ?? true,
          inAppEnabled: body.inAppEnabled ?? true,
          leaveNotifications: body.leaveNotifications ?? true,
          approvalNotifications: body.approvalNotifications ?? true,
          systemNotifications: body.systemNotifications ?? true,
          reminderNotifications: body.reminderNotifications ?? true,
          escalationNotifications: body.escalationNotifications ?? true,
        },
      })

      // Log data access (Data Protection Act 843 compliance)
      await logDataAccess({
        userId: user.id,
        userRole: user.role,
        dataType: 'staff_profile',
        action: 'edit',
        ip,
        userAgent,
        metadata: { type: 'notification_preferences', changes: body },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'NOTIFICATION_PREFERENCES_UPDATED',
          user: user.email,
          staffId: user.staffId || undefined,
          details: `User ${user.email} updated notification preferences`,
          ip,
        },
      })

      return NextResponse.json({
        success: true,
        preferences,
        message: 'Notification preferences updated successfully',
      })
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      return NextResponse.json(
        { error: 'Failed to update notification preferences' },
        { status: 500 }
      )
    }
  })(request)
}

