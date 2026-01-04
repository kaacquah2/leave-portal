/**
 * Asset Assignment API
 * 
 * Ghana Government Compliance:
 * - Internal Audit Agency (IAA) asset management requirements
 * - Asset assignment tracking
 * - Audit trail for all assignments
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { logDataAccess } from '@/lib/data-access-logger'
import { hasPermission } from '@/lib/permissions'
import { mapToMoFARole } from '@/lib/role-mapping'

// Force static export configuration (required for static export mode)
// For static export, API routes are not generated but need generateStaticParams
// Return a dummy value to satisfy Next.js static export requirements
export function generateStaticParams() {
  // Return at least one value to satisfy static export requirements
  // This route will not actually be used in static export (API routes require server)
  return [{ id: 'dummy' }]
}

/**
 * POST /api/assets/[id]/assign
 * Assign asset to staff member
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR can assign assets
      const normalizedRole = mapToMoFARole(user.role)
      if (!hasPermission(normalizedRole, 'employee:update') && 
          normalizedRole !== 'HR_OFFICER' && 
          user.role !== 'hr' && 
          user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - Only HR can assign assets' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const { staffId } = body

      if (!staffId) {
        return NextResponse.json(
          { error: 'Missing required field: staffId' },
          { status: 400 }
        )
      }

      // Get IP and user agent
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Check if asset exists and is available
      const asset = await prisma.asset.findUnique({ 
        where: { id },
        select: {
          id: true,
          assetNumber: true,
          assetName: true,
          status: true,
        }
      })

      if (!asset) {
        return NextResponse.json(
          { error: 'Asset not found' },
          { status: 404 }
        )
      }

      if (asset.status !== 'available') {
        return NextResponse.json(
          { error: `Asset is not available. Current status: ${asset.status}` },
          { status: 400 }
        )
      }

      // Update asset
      const updated = await prisma.$executeRaw`
        UPDATE "Asset"
        SET 
          "assignedTo" = ${staffId},
          "assignedDate" = NOW(),
          "status" = 'assigned',
          "updatedAt" = NOW()
        WHERE "id" = ${id}
        RETURNING *
      `.catch(async () => {
        return await prisma.asset.update({
          where: { id },
          data: {
            assignedTo: staffId,
            assignedDate: new Date(),
            status: 'assigned',
          },
        })
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
        metadata: { type: 'asset_assignment', assetId: id, assetNumber: asset.assetNumber },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'ASSET_ASSIGNED',
          user: user.email,
          staffId,
          details: `HR ${user.email} assigned asset ${asset.assetNumber} (${asset.assetName}) to staff ${staffId}`,
          ip,
        },
      })

      return NextResponse.json({
        success: true,
        asset: updated,
        message: 'Asset assigned successfully',
      })
    } catch (error: any) {
      console.error('Error assigning asset:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to assign asset' },
        { status: 500 }
      )
    }
  })(request)
}

