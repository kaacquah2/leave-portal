import { prisma } from './prisma'

// Note: web-push needs to be installed: npm install web-push
// This file provides the utility function but requires VAPID keys to be configured

interface PushNotificationPayload {
  title: string
  message: string
  link?: string
  id?: string
  type?: string
  important?: boolean
}

/**
 * Send push notification to a user
 * Requires VAPID keys to be configured in environment variables
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
) {
  try {
    // Check if web-push is available
    let webpush: any
    try {
      webpush = require('web-push')
    } catch (error) {
      console.warn('web-push not installed. Install with: npm install web-push')
      return
    }

    // Configure VAPID if not already configured
    const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@example.com'
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('VAPID keys not configured. Push notifications will not be sent.')
      return
    }

    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)

    // Get user's push subscription
    const subscription = await prisma.pushSubscription.findUnique({
      where: { userId },
    })

    if (!subscription) {
      console.log(`User ${userId} has no push subscription`)
      return
    }

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      message: payload.message,
      body: payload.message,
      link: payload.link || '/',
      id: payload.id,
      type: payload.type,
      important: payload.important || false,
    })

    // Send notification
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      notificationPayload
    )

    console.log(`Push notification sent successfully to user ${userId}`)
  } catch (error: any) {
    console.error('Error sending push notification:', error)

    // Handle expired/invalid subscriptions
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired or not found, remove it
      console.log(`Removing expired subscription for user ${userId}`)
      await prisma.pushSubscription.deleteMany({
        where: { userId },
      })
    } else if (error.statusCode === 429) {
      // Rate limited
      console.warn('Push notification rate limited')
    } else {
      // Other errors - log but don't throw
      console.error('Unexpected error sending push notification:', error.message)
    }
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  payload: PushNotificationPayload
) {
  const results = await Promise.allSettled(
    userIds.map(userId => sendPushNotification(userId, payload))
  )

  const successful = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  console.log(`Push notifications sent: ${successful} successful, ${failed} failed`)
  
  return { successful, failed }
}

/**
 * Send push notification to all subscribed users
 */
export async function sendPushNotificationToAll(
  payload: PushNotificationPayload
) {
  const subscriptions = await prisma.pushSubscription.findMany({
    select: { userId: true },
  })

  const userIds = subscriptions.map(s => s.userId)
  
  if (userIds.length === 0) {
    console.log('No push subscriptions found')
    return { successful: 0, failed: 0 }
  }

  return sendPushNotificationToUsers(userIds, payload)
}

