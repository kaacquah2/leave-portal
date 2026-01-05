/**
 * POST /api/audit/sync
 * Log sync operation for audit
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth'
import { logSyncOperation } from '@/lib/comprehensive-audit'

// Force dynamic execution (required for Prisma database access)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // Explicitly set to nodejs runtime
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      const body = await req.json()
      const { action, syncType, recordsProcessed, errors } = body

      if (!action || !syncType) {
        return NextResponse.json(
          { error: 'Missing required fields: action, syncType' },
          { status: 400 }
        )
      }

      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      await logSyncOperation(
        user.id,
        user.role,
        action as 'started' | 'completed' | 'failed',
        syncType as 'pull' | 'push' | 'full',
        recordsProcessed,
        errors,
        { deviceId: user.id },
        ip,
        userAgent
      )

      return NextResponse.json({ success: true })
    } catch (error: any) {
      console.error('Error logging sync operation:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to log sync operation' },
        { status: 500 }
      )
    }
  })(request)
}

