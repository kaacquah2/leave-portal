/**
 * GET /api/audit/coverage
 * Get audit coverage report
 * 
 * Only AUDITOR, HR_DIRECTOR, and SYSTEM_ADMIN can view coverage reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth'
import { getAuditCoverageReport } from '@/lib/comprehensive-audit'
import { AUDITOR, HR_DIRECTOR, SYSTEM_ADMIN } from '@/lib/roles'

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'

const ALLOWED_ROLES = [
  AUDITOR,
  HR_DIRECTOR,
  SYSTEM_ADMIN,
  'AUDITOR',
  'auditor',
  'HR_DIRECTOR',
  'hr_director',
  'SYSTEM_ADMIN',
  'admin',
  'SYS_ADMIN',
]

export async function GET(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      if (!ALLOWED_ROLES.includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden - Only auditors, HR directors, and system admins can view audit coverage' },
          { status: 403 }
        )
      }

      const { searchParams } = new URL(req.url)
      const startDate = searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default: last 30 days
      const endDate = searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : new Date()

      const report = await getAuditCoverageReport(startDate, endDate)

      return NextResponse.json({ report })
    } catch (error: any) {
      console.error('Error generating audit coverage report:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to generate audit coverage report' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ALLOWED_ROLES })(request)
}

