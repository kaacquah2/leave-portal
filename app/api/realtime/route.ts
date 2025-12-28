import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'


// Server-Sent Events endpoint for real-time updates
export async function GET(request: NextRequest) {
  // Get token from cookies (EventSource sends cookies automatically for same-origin requests)
  const { getTokenFromRequest } = await import('@/lib/auth')
  const token = getTokenFromRequest(request)

  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Authenticate user
  let user = null
  try {
    user = await getUserFromToken(token)
  } catch (error) {
    return new Response('Authentication failed', { status: 401 })
  }

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  })

  // Create a readable stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      // Send initial connection message
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }

      send(JSON.stringify({ type: 'connected', message: 'Real-time updates connected' }))

      // Poll database for changes
      let lastLeaveCount = 0
      let lastBalanceCount = 0
      let lastNotificationCount = 0

      const checkForUpdates = async () => {
        try {
          // Check for new leave requests (for managers/HR)
          if (user.role === 'manager' || user.role === 'hr' || user.role === 'admin') {
            const leaveCount = await prisma.leaveRequest.count({
              where: { status: 'pending' },
            })
            if (leaveCount !== lastLeaveCount) {
              lastLeaveCount = leaveCount
              send(JSON.stringify({
                type: 'leaves_updated',
                count: leaveCount,
                message: `${leaveCount} pending leave requests`,
              }))
            }
          }

          // Check for leave balance updates (for employees)
          if (user.role === 'employee' && user.staffId) {
            const balance = await prisma.leaveBalance.findUnique({
              where: { staffId: user.staffId },
            })
            // Use a hash of balance data to detect changes
            const balanceHash = balance ? JSON.stringify(balance) : ''
            if (balanceHash !== lastBalanceCount.toString()) {
              lastBalanceCount = balanceHash.length
              send(JSON.stringify({
                type: 'balance_updated',
                message: 'Leave balance updated',
              }))
            }
          }

          // Check for new notifications
          // Note: Notification model might need userId field - adjust based on your schema
          try {
            const notificationCount = await prisma.notification.count({
              where: {
                read: false,
                // Add userId filter if your schema supports it
              },
            })
            if (notificationCount !== lastNotificationCount) {
              lastNotificationCount = notificationCount
              send(JSON.stringify({
                type: 'notification',
                count: notificationCount,
                message: `${notificationCount} new notifications`,
              }))
            }
          } catch (error) {
            // Notification model might not exist or have different structure
            // Silently continue
          }

          // Send heartbeat every 30 seconds
          send(JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() }))
        } catch (error) {
          console.error('Error checking for updates:', error)
          send(JSON.stringify({ type: 'error', message: 'Error checking updates' }))
        }
      }

      // Initial check
      await checkForUpdates()

      // Poll every 10 seconds
      const interval = setInterval(checkForUpdates, 10000)

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, { headers })
}

