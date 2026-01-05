/**
 * Training Certificate Management API
 * 
 * Ghana Government Compliance:
 * - Public Services Commission (PSC) training guidelines
 * - Certificate verification and tracking
 * - Audit trail for all certificates
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { logDataAccess } from '@/lib/data-access-logger'
import { hasPermission } from '@/lib/roles'
import { mapToMoFARole } from '@/lib/roles'

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
/**
 * GET /api/training/certificates
 * Get training certificates
 */
export async function GET(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      const { searchParams } = new URL(req.url)
      const staffId = searchParams.get('staffId')
      const verified = searchParams.get('verified')

      // Check permissions
      const normalizedRole = mapToMoFARole(user.role)
      const canViewAll = hasPermission(normalizedRole, 'employee:view:all')
      const canViewOwn = user.staffId === staffId

      if (staffId && !canViewAll && !canViewOwn) {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        )
      }

      // Build where clause
      const where: any = {}
      if (staffId) where.staffId = staffId
      if (verified !== null) where.verified = verified === 'true'

      // Get certificates
      const certificates = await prisma.$queryRaw`
        SELECT * FROM "TrainingCertificate"
        WHERE ${Object.keys(where).length > 0 
          ? Object.entries(where).map(([k, v]) => `${k} = ${v}`).join(' AND ')
          : '1=1'}
        ORDER BY "issueDate" DESC
      `.catch(async () => {
        return await prisma.trainingCertificate.findMany({
          where,
          orderBy: { issueDate: 'desc' },
        }).catch(() => [])
      })

      return NextResponse.json({ certificates })
    } catch (error) {
      console.error('Error fetching certificates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch certificates' },
        { status: 500 }
      )
    }
  })(request)
}

/**
 * POST /api/training/certificates
 * Create training certificate
 */
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR can create certificates
      const normalizedRole = mapToMoFARole(user.role)
      if (!hasPermission(normalizedRole, 'employee:update') && 
          normalizedRole !== 'HR_OFFICER' && 
          user.role !== 'hr' && 
          user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - Only HR can create certificates' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const {
        staffId,
        trainingProgramId,
        certificateNumber,
        certificateName,
        issuingOrganization,
        issueDate,
        expiryDate,
        fileUrl,
      } = body

      if (!staffId || !certificateNumber || !certificateName || !issuingOrganization || !issueDate) {
        return NextResponse.json(
          { error: 'Missing required fields: staffId, certificateNumber, certificateName, issuingOrganization, issueDate' },
          { status: 400 }
        )
      }

      // Get IP and user agent
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Create certificate
      const certificate = await prisma.trainingCertificate.create({
        data: {
          staffId,
          trainingProgramId: trainingProgramId || null,
          certificateNumber,
          certificateName,
          issuingOrganization,
          issueDate: new Date(issueDate),
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          fileUrl: fileUrl || null,
          verified: false,
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
        metadata: { type: 'training_certificate', certificateId: certificate.id },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'TRAINING_CERTIFICATE_CREATED',
          user: user.email,
          staffId,
          details: `HR ${user.email} created training certificate ${certificateNumber} for staff ${staffId}`,
          ip,
        },
      })

      return NextResponse.json({
        success: true,
        certificate,
        message: 'Training certificate created successfully',
      })
    } catch (error) {
      console.error('Error creating certificate:', error)
      return NextResponse.json(
        { error: 'Failed to create certificate' },
        { status: 500 }
      )
    }
  })(request)
}

