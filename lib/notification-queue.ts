/**
 * Notification Queue with Deduplication
 * 
 * Manages offline notification queue with:
 * - Deduplication logic
 * - Queue size limits (500 notifications)
 * - Expiration (30 days)
 * - Delivery priority handling
 */

import { prisma } from '@/lib/prisma'
import { sendNotification as sendNotificationDirect } from './notification-service'
import { createHash } from 'crypto'

const MAX_QUEUE_SIZE = 500
const NOTIFICATION_EXPIRY_DAYS = 30

/**
 * Generate deduplication key for a notification
 */
function generateDeduplicationKey(
  userId: string | undefined,
  type: string,
  title: string,
  message: string
): string {
  const content = `${userId || ''}-${type}-${title}-${message}`
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Add notification to queue
 */
export async function queueNotification(data: {
  userId?: string
  staffId?: string
  type: string
  title: string
  message: string
  link?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  metadata?: Record<string, any>
}): Promise<void> {
  try {
    // Check queue size
    const queueSize = await prisma.notificationQueue.count({
      where: { status: 'pending' },
    })

    if (queueSize >= MAX_QUEUE_SIZE) {
      // Remove oldest pending notifications
      const oldestNotifications = await prisma.notificationQueue.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
        take: queueSize - MAX_QUEUE_SIZE + 1,
      })

      for (const notification of oldestNotifications) {
        await prisma.notificationQueue.update({
          where: { id: notification.id },
          data: { status: 'expired' },
        })
      }
    }

    // Generate deduplication key
    const deduplicationKey = generateDeduplicationKey(
      data.userId,
      data.type,
      data.title,
      data.message
    )

    // Check for duplicate
    const existing = await prisma.notificationQueue.findFirst({
      where: {
        deduplicationKey,
        status: 'pending',
        ...(data.userId ? { userId: data.userId } : {}),
      },
    })

    if (existing) {
      // Update existing notification instead of creating duplicate
      await prisma.notificationQueue.update({
        where: { id: existing.id },
        data: {
          priority: data.priority || 'normal',
          updatedAt: new Date(),
          deliveryAttempts: 0, // Reset attempts for updated notification
        },
      })
      return
    }

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + NOTIFICATION_EXPIRY_DAYS)

    // Create notification in queue
    await prisma.notificationQueue.create({
      data: {
        userId: data.userId,
        staffId: data.staffId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        priority: data.priority || 'normal',
        deduplicationKey,
        expiresAt,
        metadata: data.metadata || {},
      },
    })
  } catch (error) {
    console.error('[NotificationQueue] Error queueing notification:', error)
    throw error
  }
}

/**
 * Process pending notifications from queue
 */
export async function processNotificationQueue(): Promise<void> {
  try {
    const pendingNotifications = await prisma.notificationQueue.findMany({
      where: {
        status: 'pending',
        expiresAt: { gte: new Date() }, // Not expired
      },
      orderBy: [
        { priority: 'desc' }, // urgent > high > normal > low
        { createdAt: 'asc' }, // Oldest first within same priority
      ],
      take: 50, // Process in batches
    })

    for (const queuedNotification of pendingNotifications) {
      try {
        // Attempt to send notification
        await sendNotificationDirect({
          userId: queuedNotification.userId || undefined,
          staffId: queuedNotification.staffId || undefined,
          type: queuedNotification.type as any,
          title: queuedNotification.title,
          message: queuedNotification.message,
          link: queuedNotification.link || undefined,
          priority: queuedNotification.priority as any,
          metadata: queuedNotification.metadata as any,
        })

        // Mark as sent
        await prisma.notificationQueue.update({
          where: { id: queuedNotification.id },
          data: {
            status: 'sent',
            updatedAt: new Date(),
          },
        })
      } catch (error) {
        // Increment delivery attempts
        const attempts = queuedNotification.deliveryAttempts + 1

        if (attempts >= 3) {
          // Mark as failed after 3 attempts
          await prisma.notificationQueue.update({
            where: { id: queuedNotification.id },
            data: {
              status: 'failed',
              deliveryAttempts: attempts,
              lastAttemptAt: new Date(),
              updatedAt: new Date(),
            },
          })
        } else {
          // Retry later
          await prisma.notificationQueue.update({
            where: { id: queuedNotification.id },
            data: {
              deliveryAttempts: attempts,
              lastAttemptAt: new Date(),
              updatedAt: new Date(),
            },
          })
        }
      }
    }

    // Clean up expired notifications
    await prisma.notificationQueue.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        status: { in: ['sent', 'failed'] },
      },
    })
  } catch (error) {
    console.error('[NotificationQueue] Error processing queue:', error)
    throw error
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStatistics(): Promise<{
  pending: number
  sent: number
  failed: number
  expired: number
  total: number
}> {
  const [pending, sent, failed, expired, total] = await Promise.all([
    prisma.notificationQueue.count({ where: { status: 'pending' } }),
    prisma.notificationQueue.count({ where: { status: 'sent' } }),
    prisma.notificationQueue.count({ where: { status: 'failed' } }),
    prisma.notificationQueue.count({ where: { status: 'expired' } }),
    prisma.notificationQueue.count(),
  ])

  return { pending, sent, failed, expired, total }
}

