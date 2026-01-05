/**
 * POST /api/push/subscribe
 * 
 * Subscribe user to push notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force static export configuration (required for static export mode)

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const body = await request.json()
      const { subscription } = body

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return NextResponse.json(
          { error: 'Invalid subscription data' },
          { status: 400 }
        )
      }

      // Store or update push subscription
      await prisma.pushSubscription.upsert({
        where: { userId: user.id },
        update: {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        create: {
          userId: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'PUSH_SUBSCRIPTION_CREATED',
          user: user.email,
          userRole: user.role,
          details: 'User subscribed to push notifications',
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Successfully subscribed to push notifications',
      })
    } catch (error: any) {
      console.error('Error subscribing to push notifications:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to subscribe to push notifications' },
        { status: 500 }
      )
    }
  })(request)
}

