/**
 * GET /api/performance/promotions/[id]
 * PATCH /api/performance/promotions/[id]
 * DELETE /api/performance/promotions/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'

// Force static export configuration (required for static export mode)
// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const { id } = await params

      const promotion = await prisma.promotion.findUnique({
        where: { id },
        include: {
          staff: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              department: true,
              position: true,
              grade: true,
              level: true,
            },
          },
        },
      })

      if (!promotion) {
        return NextResponse.json(
          { error: 'Promotion not found' },
          { status: 404 }
        )
      }

      // Check permission
      if (promotion.staffId !== user.staffId && !['HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN', 'hr', 'hr_officer', 'hr_director', 'admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      return NextResponse.json(promotion)
    } catch (error: any) {
      console.error('Error fetching promotion:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch promotion' },
        { status: 500 }
      )
    }
  })(request)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      const { id } = await params
      const body = await req.json()

      const promotion = await prisma.promotion.findUnique({
        where: { id },
      })

      if (!promotion) {
        return NextResponse.json(
          { error: 'Promotion not found' },
          { status: 404 }
        )
      }

      // Only HR/Admin can update
      if (!['HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN', 'hr', 'hr_officer', 'hr_director', 'admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const updated = await prisma.promotion.update({
        where: { id },
        data: {
          ...(body.toPosition && { toPosition: body.toPosition }),
          ...(body.toGrade && { toGrade: body.toGrade }),
          ...(body.toLevel && { toLevel: body.toLevel }),
          ...(body.promotionDate && { promotionDate: new Date(body.promotionDate) }),
          ...(body.effectiveDate && { effectiveDate: new Date(body.effectiveDate) }),
          ...(body.salaryIncrease !== undefined && { salaryIncrease: body.salaryIncrease }),
          ...(body.reason && { reason: body.reason }),
          ...(body.status && { status: body.status }),
          ...(body.notes !== undefined && { notes: body.notes }),
        },
        include: {
          staff: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              department: true,
            },
          },
        },
      })

      // Update staff member if status changed to completed and effective date passed
      if (body.status === 'completed' && new Date(updated.effectiveDate) <= new Date()) {
        const updateData: any = {
          position: updated.toPosition,
        }
        if (updated.toGrade) {
          updateData.grade = updated.toGrade
        }
        if (updated.toLevel) {
          updateData.level = updated.toLevel
        }
        await prisma.staffMember.update({
          where: { staffId: promotion.staffId },
          data: updateData,
        })
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'PROMOTION_UPDATED',
          user: user.email,
          userRole: user.role,
          staffId: promotion.staffId,
          details: `Updated promotion for ${promotion.staffId}`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json(updated)
    } catch (error: any) {
      console.error('Error updating promotion:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update promotion' },
        { status: 500 }
      )
    }
  })(request)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      const { id } = await params

      const promotion = await prisma.promotion.findUnique({
        where: { id },
      })

      if (!promotion) {
        return NextResponse.json(
          { error: 'Promotion not found' },
          { status: 404 }
        )
      }

      // Only HR/Admin can delete
      if (!['HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN', 'hr', 'hr_officer', 'hr_director', 'admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      await prisma.promotion.delete({
        where: { id },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'PROMOTION_DELETED',
          user: user.email,
          userRole: user.role,
          staffId: promotion.staffId,
          details: `Deleted promotion for ${promotion.staffId}`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json({ success: true })
    } catch (error: any) {
      console.error('Error deleting promotion:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to delete promotion' },
        { status: 500 }
      )
    }
  })(request)
}

