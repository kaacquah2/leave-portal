/**
 * POST /api/workflows/[id]/activate
 * Activate a workflow version
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth'
import { activateWorkflowVersion } from '@/lib/workflow-engine'
import { HR_DIRECTOR, SYSTEM_ADMIN } from '@/lib/roles'

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'

// Generate static params for dynamic route (required for static export)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

const ALLOWED_ROLES = [HR_DIRECTOR, SYSTEM_ADMIN, 'HR_DIRECTOR', 'hr_director', 'SYSTEM_ADMIN', 'admin', 'SYS_ADMIN']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      if (!ALLOWED_ROLES.includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden - Only HR Director and System Admin can activate workflows' },
          { status: 403 }
        )
      }

      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      const workflow = await activateWorkflowVersion(id, user.id, ip, userAgent)

      return NextResponse.json({ workflow })
    } catch (error: any) {
      console.error('Error activating workflow:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to activate workflow' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ALLOWED_ROLES })(request)
}

