/**
 * Escalation Job API Endpoint
 * 
 * Can be called manually or via external cron service (cron-job.org, EasyCron, etc.)
 * 
 * Setup with external cron:
 * - URL: https://your-domain.com/api/cron/escalation
 * - Method: GET
 * - Schedule: Daily (e.g., 0 9 * * * for 9 AM daily)
 * - Headers: Authorization: Bearer YOUR_CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkAndEscalatePendingApprovals } from '@/lib/escalation-engine'
import { getServerSession, authOptions } from '@/lib/auth'

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export async function GET(request: NextRequest) {
  // During static export build, return early without accessing headers
  const isBuild = typeof process !== 'undefined' && 
                  process.env.ELECTRON === '1' && 
                  (process.env.NEXT_PHASE === 'phase-production-build' || !globalThis.window)
  
  if (isBuild) {
    return NextResponse.json({
      success: true,
      message: 'Static export build - escalation requires runtime',
      timestamp: new Date().toISOString(),
    })
  }
  
  // Wrap in runtime handler
  const runtimeHandler = async () => {
    try {
    // Verify authorization - either via cron secret or admin session
    const authHeader = request.headers.get('authorization')
    const hasCronSecret = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`
    
    // If no cron secret provided, check if user is admin
    if (!hasCronSecret) {
      const session = await getServerSession(authOptions, request)
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      // Check if user is admin/HR
      const { prisma } = await import('@/lib/prisma')
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      })
      
      const role = user?.role.toUpperCase() || ''
      if (!['HR_DIRECTOR', 'HR_OFFICER', 'SYSTEM_ADMIN', 'SYS_ADMIN'].includes(role)) {
        return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
      }
    }

    const startTime = Date.now()
    await checkAndEscalatePendingApprovals()
    const duration = Date.now() - startTime

    return NextResponse.json({ 
      success: true,
      message: 'Escalation job completed successfully',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Cron] Error in escalation job:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
    }
  }
  
  return runtimeHandler()
}

// Also support POST for external cron services that prefer POST
export async function POST(request: NextRequest) {
  return GET(request)
}

