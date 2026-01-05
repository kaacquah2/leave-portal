/**
 * Asset Return API
 * 
 * Ghana Government Compliance:
 * - Internal Audit Agency (IAA) asset management requirements
 * - Asset return tracking
 * - Audit trail for all returns
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { logDataAccess } from '@/lib/data-access-logger'
import { hasPermission } from '@/lib/roles'
import { mapToMoFARole } from '@/lib/roles'

// Force static export configuration (required for static export mode)
// For static export, API routes are not generated but need generateStaticParams
// Return a dummy value to satisfy Next.js static export requirements
export function generateStaticParams() {
  // Return at least one value to satisfy static export requirements
  // This route will not actually be used in static export (API routes require server)
  return [{ id: 'dummy' }]
}

/**
 * POST /api/assets/[id]/return
 * Return asset from staff member
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR can return assets
      const normalizedRole = mapToMoFARole(user.role)
      if (!hasPermission(normalizedRole, 'employee:update') && 
          normalizedRole !== 'HR_OFFICER' && 
          user.role !== 'hr' && 
          user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - Only HR can return assets' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const { condition, notes } = body

      // Get IP and user agent
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Check if asset exists and is assigned
      const asset = await prisma.asset.findUnique({ 
        where: { id },
        select: {
          id: true,
          assetNumber: true,
          assetName: true,
          status: true,
          assignedTo: true,
          condition: true,
          notes: true,
        }
      })

      if (!asset) {
        return NextResponse.json(
          { error: 'Asset not found' },
          { status: 404 }
        )
      }

      if (asset.status !== 'assigned') {
        return NextResponse.json(
          { error: `Asset is not assigned. Current status: ${asset.status}` },
          { status: 400 }
        )
      }

      // Update asset
      const updated = await prisma.asset.update({
        where: { id },
        data: {
          returnedDate: new Date(),
          status: condition === 'damaged' || condition === 'lost' ? condition : 'returned',
          condition: condition || asset.condition || null,
          notes: notes || asset.notes || null,
          assignedTo: null, // Clear assignment
        },
      })

      // Log data access
      await logDataAccess({
        userId: user.id,
        userRole: user.role,
        staffId: asset.assignedTo ?? undefined,
        dataType: 'staff_profile',
        action: 'edit',
        ip,
        userAgent,
        metadata: { type: 'asset_return', assetId: id, assetNumber: asset.assetNumber },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'ASSET_RETURNED',
          user: user.email,
          staffId: asset.assignedTo ?? undefined,
          details: `HR ${user.email} returned asset ${asset.assetNumber} (${asset.assetName}) from staff ${asset.assignedTo || 'unknown'}. Condition: ${condition || asset.condition || 'unknown'}`,
          ip,
        },
      })

      return NextResponse.json({
        success: true,
        asset: updated,
        message: 'Asset returned successfully',
      })
    } catch (error: any) {
      console.error('Error returning asset:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to return asset' },
        { status: 500 }
      )
    }
  })(request)
}

