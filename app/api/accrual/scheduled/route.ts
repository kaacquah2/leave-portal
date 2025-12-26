import { NextRequest, NextResponse } from 'next/server'
import { processLeaveAccrual, processLeaveExpiration } from '@/lib/leave-accrual'
import { prisma } from '@/lib/prisma'

/**
 * Scheduled accrual endpoint - can be called by cron jobs
 * Should be protected by API key or similar in production
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API key or secret (in production, use proper authentication)
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.ACCRUAL_CRON_SECRET || 'change-me-in-production'
    
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const {
      processExpiration = true,
      processCarryForward = false,
      accrualDate,
    } = body

    // Process accrual for all active staff
    const accrualResult = await processLeaveAccrual({
      accrualDate: accrualDate ? new Date(accrualDate) : new Date(),
      processExpiration,
      processCarryForward,
      processedBy: 'scheduled-job',
    })

    // Process expiration
    let expirationResult = null
    if (processExpiration) {
      expirationResult = await processLeaveExpiration(
        accrualDate ? new Date(accrualDate) : new Date()
      )
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'LEAVE_ACCRUAL_SCHEDULED',
        user: 'scheduled-job',
        details: `Scheduled accrual: ${accrualResult.processed} records processed`,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      },
    })

    return NextResponse.json({
      success: accrualResult.success && (!expirationResult || expirationResult.success),
      accrual: accrualResult,
      expiration: expirationResult,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error in scheduled accrual:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process scheduled accrual' },
      { status: 500 }
    )
  }
}

