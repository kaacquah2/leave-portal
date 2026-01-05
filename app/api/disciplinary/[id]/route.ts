/**
 * GET /api/disciplinary/[id]
 * PATCH /api/disciplinary/[id]
 * DELETE /api/disciplinary/[id]
 * 
 * Get, update, or delete a disciplinary action
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext, isHR, isAdmin } from '@/lib/auth'
import { HR_ROLES, ADMIN_ROLES } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

// Force static export configuration (required for static export mode)
// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

// GET - Get single disciplinary action
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const disciplinaryAction = await prisma.disciplinaryAction.findUnique({
        where: { id },
        include: {
          staff: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              email: true,
              department: true,
              position: true,
            },
          },
        },
      })

      if (!disciplinaryAction) {
        return NextResponse.json(
          { error: 'Disciplinary action not found' },
          { status: 404 }
        )
      }

      // Check permissions - employees can only see their own
      if (!isHR(user) && !isAdmin(user)) {
        if (disciplinaryAction.staffId !== user.staffId) {
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          )
        }
      }

      return NextResponse.json({
        success: true,
        data: disciplinaryAction,
      })
    } catch (error: any) {
      console.error('Error fetching disciplinary action:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch disciplinary action' },
        { status: 500 }
      )
    }
  })(request)
}

// PATCH - Update disciplinary action
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only HR and Admin can update
      if (!isHR(user) && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'Forbidden - HR or Admin access required' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const {
        status,
        resolvedDate,
        resolvedBy,
        documentUrl,
        description,
      } = body

      const updateData: any = {}

      if (status !== undefined) {
        updateData.status = status
      }

      if (resolvedDate !== undefined) {
        updateData.resolvedDate = resolvedDate ? new Date(resolvedDate) : null
      }

      if (resolvedBy !== undefined) {
        updateData.resolvedBy = resolvedBy
      }

      if (documentUrl !== undefined) {
        updateData.documentUrl = documentUrl
      }

      if (description !== undefined) {
        updateData.description = description
      }

      const disciplinaryAction = await prisma.disciplinaryAction.update({
        where: { id },
        data: updateData,
        include: {
          staff: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              email: true,
              department: true,
              position: true,
            },
          },
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'DISCIPLINARY_ACTION_UPDATED',
          user: user.email,
          userRole: user.role,
          staffId: disciplinaryAction.staffId,
          details: `Disciplinary action updated: ${id}`,
          metadata: {
            disciplinaryActionId: id,
            changes: body,
          },
        },
      })

      return NextResponse.json({
        success: true,
        data: disciplinaryAction,
      })
    } catch (error: any) {
      console.error('Error updating disciplinary action:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update disciplinary action' },
        { status: 500 }
      )
    }
  }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES] })(request)
}

// DELETE - Delete disciplinary action
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only HR and Admin can delete
      if (!isHR(user) && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'Forbidden - HR or Admin access required' },
          { status: 403 }
        )
      }

      const disciplinaryAction = await prisma.disciplinaryAction.findUnique({
        where: { id },
      })

      if (!disciplinaryAction) {
        return NextResponse.json(
          { error: 'Disciplinary action not found' },
          { status: 404 }
        )
      }

      await prisma.disciplinaryAction.delete({
        where: { id },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'DISCIPLINARY_ACTION_DELETED',
          user: user.email,
          userRole: user.role,
          staffId: disciplinaryAction.staffId,
          details: `Disciplinary action deleted: ${id}`,
          metadata: {
            disciplinaryActionId: id,
            actionType: disciplinaryAction.actionType,
          },
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Disciplinary action deleted successfully',
      })
    } catch (error: any) {
      console.error('Error deleting disciplinary action:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to delete disciplinary action' },
        { status: 500 }
      )
    }
  }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES] })(request)
}

