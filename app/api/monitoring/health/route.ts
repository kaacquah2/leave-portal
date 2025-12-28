import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { checkSystemHealth, runHealthChecks } from '@/lib/monitoring'

// GET system health status
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only HR and admin can view system health
      if (user.role !== 'hr' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const { health, alerts } = await runHealthChecks()

      return NextResponse.json({
        health,
        alerts,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error checking system health:', error)
      return NextResponse.json(
        { error: 'Failed to check system health' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

