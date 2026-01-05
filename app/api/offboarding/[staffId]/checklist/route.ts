/**
 * Offboarding Checklist API
 * 
 * Ghana Government Compliance:
 * - Office of the Head of Civil Service (OHCS) offboarding procedures
 * - Internal Audit Agency (IAA) asset management requirements
 * - Audit trail for all offboarding activities
 * 
 * Legal References:
 * - Office of the Head of Civil Service (OHCS) Offboarding Procedures
 * - Internal Audit Agency (IAA) Asset Management Requirements
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { logDataAccess } from '@/lib/data-access-logger'
import { hasPermission } from '@/lib/roles'
import { mapToMoFARole } from '@/lib/roles'

// Force static export configuration (required for static export mode)
// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ staffId: 'dummy' }]
}

/**
 * GET /api/offboarding/[staffId]/checklist
 * Get offboarding checklist for staff member
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

      // Get checklist items
      const checklist = await prisma.$queryRaw`
        SELECT * FROM "OffboardingChecklist" 
        WHERE "staffId" = ${staffId}
        ORDER BY "category", "createdAt"
      `.catch(async () => {
        return await prisma.offboardingChecklist.findMany({
          where: { staffId },
          orderBy: { createdAt: 'asc' },
        }).catch(() => [])
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
        metadata: { type: 'offboarding_checklist' },
      })

      return NextResponse.json({ checklist })
    } catch (error) {
      console.error('Error fetching offboarding checklist:', error)
      return NextResponse.json(
        { error: 'Failed to fetch offboarding checklist' },
        { status: 500 }
      )
    }
  })(request)
}

/**
 * POST /api/offboarding/[staffId]/checklist
 * Create offboarding checklist items
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  const { staffId } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR can manage offboarding checklists
      const normalizedRole = mapToMoFARole(user.role)
      if (!hasPermission(normalizedRole, 'employee:update') && 
          normalizedRole !== 'HR_OFFICER' && 
          user.role !== 'hr') {
        return NextResponse.json(
          { error: 'Forbidden - Only HR can manage offboarding checklists' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const { items } = body

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { error: 'Items array is required' },
          { status: 400 }
        )
      }

      // Get IP and user agent
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Create checklist items
      const createdItems = await Promise.all(
        items.map(async (item: any) => {
          return await prisma.$executeRaw`
            INSERT INTO "OffboardingChecklist" (
              "id", "staffId", "item", "category", "status", "notes",
              "completedBy", "completedAt", "createdAt", "updatedAt"
            ) VALUES (
              gen_random_uuid()::text, ${staffId}, ${item.item}, ${item.category},
              ${item.status || 'pending'}, ${item.notes || null},
              ${item.status === 'completed' ? user.email : null},
              ${item.status === 'completed' ? new Date() : null}::timestamp,
              NOW(), NOW()
            ) RETURNING *
          `.catch(async () => {
            return await prisma.offboardingChecklist.create({
              data: {
                staffId,
                assignedTo: user.email,
                items: [{
                  task: item.item || item.task,
                  category: item.category,
                  completed: item.status === 'completed',
                  completedBy: item.status === 'completed' ? user.email : null,
                  completedAt: item.status === 'completed' ? new Date() : null,
                }],
              },
            })
          })
        })
      )

      // Log data access
      await logDataAccess({
        userId: user.id,
        userRole: user.role,
        staffId,
        dataType: 'staff_profile',
        action: 'edit',
        ip,
        userAgent,
        metadata: { type: 'offboarding_checklist', itemsCount: items.length },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'OFFBOARDING_CHECKLIST_CREATED',
          user: user.email,
          staffId,
          details: `HR ${user.email} created ${items.length} offboarding checklist items for staff ${staffId}`,
          ip,
        },
      })

      return NextResponse.json({
        success: true,
        items: createdItems,
        message: 'Offboarding checklist items created successfully',
      })
    } catch (error) {
      console.error('Error creating offboarding checklist:', error)
      return NextResponse.json(
        { error: 'Failed to create offboarding checklist' },
        { status: 500 }
      )
    }
  })(request)
}

