/**
 * Payroll Approval API
 * 
 * Ghana Government Compliance:
 * - Payroll approval workflow (CAGD requirements)
 * - Only authorized roles can approve
 * - Audit trail for all approvals
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { logDataAccess } from '@/lib/data-access-logger'
import { mapToMoFARole } from '@/lib/roles'

// Force static export configuration (required for static export mode)
// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

/**
 * POST /api/payroll/[id]/approve
 * Approve payroll record
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR Director or Chief Director can approve payroll
      const normalizedRole = mapToMoFARole(user.role)
      if (normalizedRole !== 'HR_DIRECTOR' && 
          normalizedRole !== 'CHIEF_DIRECTOR' && 
          user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - Only HR Director or Chief Director can approve payroll' },
          { status: 403 }
        )
      }

      // Get IP and user agent
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Update payroll status
      const existing = await prisma.payroll.findUnique({ where: { id } })
      if (!existing || existing.status !== 'draft') {
        return NextResponse.json(
          { error: 'Payroll not found or already processed' },
          { status: 400 }
        )
      }
      
      const payroll = await prisma.payroll.update({
        where: { id },
        data: {
          status: 'approved',
          approvedBy: user.email,
          approvedAt: new Date(),
        },
      })

      // Log data access
      await logDataAccess({
        userId: user.id,
        userRole: user.role,
        staffId: undefined, // Payroll is period-based, not staff-based
        dataType: 'salary',
        action: 'edit',
        ip,
        userAgent,
        metadata: { type: 'payroll_approval', payrollId: id, period: payroll.period },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'PAYROLL_APPROVED',
          user: user.email,
          staffId: undefined, // Payroll is period-based
          details: `${normalizedRole} ${user.email} approved payroll ${id} for period ${payroll.period}`,
          ip,
        },
      })

      return NextResponse.json({
        success: true,
        payroll,
        message: 'Payroll approved successfully',
      })
    } catch (error: any) {
      console.error('Error approving payroll:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to approve payroll' },
        { status: 500 }
      )
    }
  })(request)
}

