/**
 * Cron Job Endpoint: Check and Send Escalation Reminders
 * Should be called periodically (e.g., every hour) to check for pending approvals
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkAndSendEscalationReminders } from '@/lib/notification-service'

// This endpoint should be protected with a secret token in production
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (if configured)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check and send escalation reminders
    await checkAndSendEscalationReminders()

    return NextResponse.json({ 
      success: true, 
      message: 'Escalation reminders processed',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error processing escalation reminders:', error)
    return NextResponse.json(
      { error: 'Failed to process escalation reminders' },
      { status: 500 }
    )
  }
}

// Also support POST for cron services that use POST
export async function POST(request: NextRequest) {
  return GET(request)
}

