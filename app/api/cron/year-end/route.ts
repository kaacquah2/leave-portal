/**
 * Automatic Year-End Processing Cron Job
 * Runs automatically on December 31 at midnight
 * 
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/year-end",
 *     "schedule": "0 0 31 12 *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { processYearEndForAllStaff } from '@/lib/leave-rules'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notification-service'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Also check for Vercel Cron header
      const cronHeader = request.headers.get('x-vercel-cron')
      if (!cronHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    console.log('[Year-End Cron] Starting automatic year-end processing...')
    const year = new Date().getFullYear()

    // Process year-end for all staff
    const results = await processYearEndForAllStaff()

    // Calculate summary statistics
    let totalCarryForward = 0
    let totalForfeited = 0

    results.forEach((result) => {
      result.results.forEach((r) => {
        totalCarryForward += r.carryForwardDays || 0
        totalForfeited += r.forfeitedDays || 0
      })
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'YEAR_END_PROCESSING_COMPLETED',
        user: 'system',
        userRole: 'SYSTEM',
        details: JSON.stringify({
          year,
          processedBy: 'system',
          processAll: true,
          staffProcessed: results.length,
          totalCarryForward,
          totalForfeited,
          timestamp: new Date().toISOString(),
        }),
      },
    })

    // Notify HR about completion
    const hrUsers = await prisma.user.findMany({
      where: {
        role: { in: ['HR_OFFICER', 'HR_DIRECTOR', 'hr', 'hr_officer', 'hr_director'] },
        active: true,
      },
    })

    const portalUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    for (const hrUser of hrUsers) {
      await sendNotification({
        userId: hrUser.id,
        type: 'system',
        title: '✅ Year-End Processing Completed',
        message: `Year-end processing completed automatically. ${results.length} staff members processed. ${totalCarryForward.toFixed(1)} days carried forward, ${totalForfeited.toFixed(1)} days forfeited.`,
        link: portalUrl ? `${portalUrl}/year-end` : '/year-end',
        priority: 'normal',
      })
    }

    console.log(`[Year-End Cron] Completed: ${results.length} staff processed, ${totalCarryForward} days carried forward, ${totalForfeited} days forfeited`)

    return NextResponse.json({
      success: true,
      year,
      staffProcessed: results.length,
      totalCarryForward,
      totalForfeited,
      processedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[Year-End Cron] Error:', error)

    // Create error audit log
    await prisma.auditLog.create({
      data: {
        action: 'YEAR_END_PROCESSING_FAILED',
        user: 'system',
        userRole: 'SYSTEM',
        details: JSON.stringify({
          error: error.message,
          year: new Date().getFullYear(),
          timestamp: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json(
      {
        error: error.message || 'Failed to process year-end leave',
        errorCode: 'PROCESSING_ERROR',
      },
      { status: 500 }
    )
  }
}

