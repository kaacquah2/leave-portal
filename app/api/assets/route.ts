/**
 * Asset Management API
 * 
 * Ghana Government Compliance:
 * - Internal Audit Agency (IAA) asset management requirements
 * - Asset tracking and accountability
 * - Audit trail for all asset transactions
 * 
 * Legal References:
 * - Internal Audit Agency (IAA) Asset Management Requirements
 * - Government Asset Management Standards
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { logDataAccess } from '@/lib/data-access-logger'
import { hasPermission } from '@/lib/roles'
import { mapToMoFARole } from '@/lib/roles'

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'

/**
 * GET /api/assets
 * Get assets (with optional filters)
 */
export async function GET(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Check permissions
      const normalizedRole = mapToMoFARole(user.role)
      if (!hasPermission(normalizedRole, 'employee:view:all') && 
          normalizedRole !== 'HR_OFFICER' && 
          user.role !== 'hr' && 
          user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient permissions to view assets' },
          { status: 403 }
        )
      }

      const { searchParams } = new URL(req.url)
      const assignedTo = searchParams.get('assignedTo')
      const status = searchParams.get('status')
      const assetType = searchParams.get('assetType')

      // Build where clause
      const where: any = {}
      if (assignedTo) where.assignedTo = assignedTo
      if (status) where.status = status
      if (assetType) where.assetType = assetType

      // Get assets
      const assets = await prisma.$queryRaw`
        SELECT * FROM "Asset"
        WHERE ${Object.keys(where).length > 0 
          ? Object.entries(where).map(([k, v]) => `${k} = ${v}`).join(' AND ')
          : '1=1'}
        ORDER BY "assetNumber"
      `.catch(async () => {
        return await prisma.asset.findMany({
          where,
          orderBy: { assetNumber: 'asc' },
        }).catch(() => [])
      })

      return NextResponse.json({ assets })
    } catch (error) {
      console.error('Error fetching assets:', error)
      return NextResponse.json(
        { error: 'Failed to fetch assets' },
        { status: 500 }
      )
    }
  })(request)
}

/**
 * POST /api/assets
 * Create new asset
 */
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR can create assets
      const normalizedRole = mapToMoFARole(user.role)
      if (!hasPermission(normalizedRole, 'employee:update') && 
          normalizedRole !== 'HR_OFFICER' && 
          user.role !== 'hr' && 
          user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - Only HR can create assets' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const {
        assetNumber,
        assetName,
        assetType,
        serialNumber,
        condition = 'new',
        notes,
      } = body

      if (!assetNumber || !assetName || !assetType) {
        return NextResponse.json(
          { error: 'Missing required fields: assetNumber, assetName, assetType' },
          { status: 400 }
        )
      }

      // Get IP and user agent
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Create asset
      const asset = await prisma.$executeRaw`
        INSERT INTO "Asset" (
          "id", "assetNumber", "assetName", "assetType", "serialNumber",
          "condition", "status", "notes", "createdBy", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid()::text, ${assetNumber}, ${assetName}, ${assetType},
          ${serialNumber || null}, ${condition}, 'available', ${notes || null},
          ${user.email}, NOW(), NOW()
        ) RETURNING *
      `.catch(async () => {
        return await prisma.asset.create({
          data: {
            assetNumber,
            assetName,
            assetType,
            serialNumber: serialNumber || null,
            condition,
            status: 'available',
            notes: notes || null,
            createdBy: user.email,
          },
        })
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'ASSET_CREATED',
          user: user.email,
          details: `HR ${user.email} created asset ${assetNumber} (${assetName})`,
          ip,
        },
      })

      return NextResponse.json({
        success: true,
        asset,
        message: 'Asset created successfully',
      })
    } catch (error: any) {
      console.error('Error creating asset:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create asset' },
        { status: 500 }
      )
    }
  })(request)
}

