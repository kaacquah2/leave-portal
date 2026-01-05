import { NextRequest, NextResponse } from 'next/server'
import { runHealthChecks } from '@/lib/monitoring'
import { HR_ROLES, ADMIN_ROLES } from '@/lib/roles'
import type { AuthContext } from '@/lib/auth'

// Force dynamic execution (required for Prisma database access)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // Explicitly set to nodejs runtime

// GET system health status
export async function GET(request: NextRequest) {
  // During static export build, return early without accessing cookies
  // Use a runtime check that Next.js can't statically analyze
  const isBuild = typeof process !== 'undefined' && 
                  process.env.ELECTRON === '1' && 
                  (process.env.NEXT_PHASE === 'phase-production-build' || !globalThis.window)
  
  if (isBuild) {
    return NextResponse.json({
      health: 'ok',
      alerts: [],
      timestamp: new Date().toISOString(),
      note: 'Static export build - full health check requires runtime',
    })
  }

  // At runtime, dynamically import withAuth to avoid static analysis detection
  // Wrap in a function that's only called at runtime
  const runtimeHandler = async () => {
    const { withAuth } = await import('@/lib/auth-proxy')
    return withAuth(async ({ user }: AuthContext) => {
      try {
        // Only HR, HR Assistant, and admin can view system health
        if (user.role !== 'hr' && user.role !== 'hr_assistant' && user.role !== 'admin') {
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
    }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES] })(request)
  }
  
  return runtimeHandler()
}

