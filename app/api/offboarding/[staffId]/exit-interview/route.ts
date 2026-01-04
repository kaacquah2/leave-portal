/**
 * Exit Interview API
 * 
 * Ghana Government Compliance:
 * - Office of the Head of Civil Service (OHCS) offboarding procedures
 * - Exit interview requirements
 * - Audit trail for all exit interviews
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { logDataAccess } from '@/lib/data-access-logger'
import { hasPermission } from '@/lib/permissions'
import { mapToMoFARole } from '@/lib/role-mapping'

// Force static export configuration (required for static export mode)
// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ staffId: 'dummy' }]
}

/**
 * GET /api/offboarding/[staffId]/exit-interview
 * Get exit interview for staff member
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  const { staffId } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Check permissions
      const normalizedRole = mapToMoFARole(user.role)
      const canViewAll = hasPermission(normalizedRole, 'employee:view:all')
      const canViewOwn = user.staffId === staffId

      if (!canViewAll && !canViewOwn) {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        )
      }

      // Get IP and user agent
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Get exit interview
      const exitInterview = await prisma.$queryRaw`
        SELECT * FROM "ExitInterview" 
        WHERE "staffId" = ${staffId}
        ORDER BY "interviewDate" DESC
        LIMIT 1
      `.catch(async () => {
        return await prisma.exitInterview.findFirst({
          where: { staffId },
          orderBy: { interviewDate: 'desc' },
        })
      })

      // Log data access
      await logDataAccess({
        userId: user.id,
        userRole: user.role,
        staffId,
        dataType: 'staff_profile',
        action: 'view',
        ip,
        userAgent,
        metadata: { type: 'exit_interview' },
      })

      return NextResponse.json({ exitInterview })
    } catch (error) {
      console.error('Error fetching exit interview:', error)
      return NextResponse.json(
        { error: 'Failed to fetch exit interview' },
        { status: 500 }
      )
    }
  })(request)
}

/**
 * POST /api/offboarding/[staffId]/exit-interview
 * Create or update exit interview
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  const { staffId } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR can create exit interviews
      const normalizedRole = mapToMoFARole(user.role)
      if (!hasPermission(normalizedRole, 'employee:update') && 
          normalizedRole !== 'HR_OFFICER' && 
          user.role !== 'hr') {
        return NextResponse.json(
          { error: 'Forbidden - Only HR can create exit interviews' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const {
        interviewDate,
        conductedBy,
        reasonForLeaving,
        satisfactionRating,
        feedback,
        recommendations,
        status = 'scheduled',
      } = body

      if (!interviewDate || !conductedBy) {
        return NextResponse.json(
          { error: 'Missing required fields: interviewDate, conductedBy' },
          { status: 400 }
        )
      }

      // Validate satisfaction rating
      if (satisfactionRating && (satisfactionRating < 1 || satisfactionRating > 5)) {
        return NextResponse.json(
          { error: 'Satisfaction rating must be between 1 and 5' },
          { status: 400 }
        )
      }

      // Get IP and user agent
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Create exit interview
      const exitInterview = await prisma.exitInterview.create({
        data: {
          staffId,
          interviewDate: new Date(interviewDate),
          conductedBy,
          reasonForLeaving: reasonForLeaving || null,
          satisfactionRating: satisfactionRating || null,
          feedback: feedback || null,
          recommendations: recommendations || null,
          status,
        },
      })

      // Log data access
      await logDataAccess({
        userId: user.id,
        userRole: user.role,
        staffId,
        dataType: 'staff_profile',
        action: 'edit',
        ip,
        userAgent,
        metadata: { type: 'exit_interview', interviewId: exitInterview.id },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'EXIT_INTERVIEW_CREATED',
          user: user.email,
          staffId,
          details: `HR ${user.email} created exit interview for staff ${staffId}`,
          ip,
        },
      })

      return NextResponse.json({
        success: true,
        exitInterview,
        message: 'Exit interview created successfully',
      })
    } catch (error) {
      console.error('Error creating exit interview:', error)
      return NextResponse.json(
        { error: 'Failed to create exit interview' },
        { status: 500 }
      )
    }
  })(request)
}

