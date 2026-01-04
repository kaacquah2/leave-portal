/**
 * POST /api/push/unsubscribe
 * 
 * Unsubscribe user from push notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export async function POST(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const body = await request.json()
      const { endpoint } = body

      // Delete push subscription
      if (endpoint) {
        await prisma.pushSubscription.deleteMany({
          where: {
            userId: user.id,
            endpoint,
          },
        })
      } else {
        // Delete all subscriptions for user
        await prisma.pushSubscription.deleteMany({
          where: { userId: user.id },
        })
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'PUSH_SUBSCRIPTION_REMOVED',
          user: user.email,
          userRole: user.role,
          details: 'User unsubscribed from push notifications',
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Successfully unsubscribed from push notifications',
      })
    } catch (error: any) {
      console.error('Error unsubscribing from push notifications:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to unsubscribe from push notifications' },
        { status: 500 }
      )
    }
  })(request)
}

