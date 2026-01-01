/**
 * Scheduled Approval Reminders Script
 * Sends reminders for pending approvals
 * 
 * Usage:
 * - Add to cron: 0 9 * * * (runs daily at 9 AM)
 * - Or run manually: tsx scripts/scheduled-reminders.ts
 */

// Load environment variables
import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { checkApprovalDelays, sendAlertNotifications } from '../lib/monitoring'

async function main() {
  console.log('📧 Starting approval reminder processing...')
  console.log(`📅 Date: ${new Date().toISOString()}`)

  try {
    // Get approval delays
    const alerts = await checkApprovalDelays()

    if (alerts.length === 0) {
      console.log('✅ No pending approvals requiring reminders')
      return
    }

    console.log(`📋 Found ${alerts.length} pending approval(s) requiring reminders`)

    // Send reminder notifications
    await sendAlertNotifications(alerts)

    // Also create in-app notifications and send emails via API
    const leaveIds = alerts.map(alert => alert.details.leaveId).filter(Boolean)

    if (leaveIds.length > 0) {
      // Call the reminders API to send notifications
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      if (!appUrl) {
        console.error('ERROR: NEXT_PUBLIC_APP_URL or VERCEL_URL must be set in environment variables')
        return
      }
      const response = await fetch(`${appUrl}/api/approvals/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: In production, you'd need to authenticate this request
          // For now, this is a placeholder
        },
        body: JSON.stringify({
          leaveIds,
          sendEmail: true,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`✅ Sent ${result.notified} reminder(s)`)
      } else {
        console.error('⚠️  Failed to send reminders via API')
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'APPROVAL_REMINDERS_PROCESSED',
        user: 'system',
        details: JSON.stringify({
          remindersSent: alerts.length,
          timestamp: new Date().toISOString(),
        }),
      },
    })

    console.log('✅ Approval reminder processing completed')
  } catch (error: any) {
    console.error('❌ Reminder processing failed:', error)
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

