/**
 * GET /api/performance/promotions
 * POST /api/performance/promotions
 * 
 * Get and create promotions
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const staffId = searchParams.get('staffId')
      const status = searchParams.get('status')

      const where: any = {}

      if (staffId) {
        where.staffId = staffId
      } else if (!['HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN', 'hr', 'hr_officer', 'hr_director', 'admin'].includes(user.role)) {
        if (user.staffId) {
          where.staffId = user.staffId
        } else {
          return NextResponse.json([])
        }
      }

      if (status) {
        where.status = status
      }

      const promotions = await prisma.promotion.findMany({
        where,
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
        orderBy: { promotionDate: 'desc' },
      })

      return NextResponse.json(promotions)
    } catch (error: any) {
      console.error('Error fetching promotions:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch promotions' },
        { status: 500 }
      )
    }
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR/Admin can create promotions
      if (!['HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN', 'hr', 'hr_officer', 'hr_director', 'admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden - HR/Admin access required' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const {
        staffId,
        fromPosition,
        fromGrade,
        fromLevel,
        toPosition,
        toGrade,
        toLevel,
        promotionDate,
        effectiveDate,
        salaryIncrease,
        reason,
        notes,
      } = body

      if (!staffId || !fromPosition || !toPosition || !promotionDate || !effectiveDate || !reason) {
        return NextResponse.json(
          { error: 'All required fields must be provided' },
          { status: 400 }
        )
      }

      // Get staff member to verify
      const staff = await prisma.staffMember.findUnique({
        where: { staffId },
      })

      if (!staff) {
        return NextResponse.json(
          { error: 'Staff member not found' },
          { status: 404 }
        )
      }

      const promotion = await prisma.promotion.create({
        data: {
          staffId,
          fromPosition,
          fromGrade: fromGrade || staff.grade,
          fromLevel: fromLevel || staff.level,
          toPosition,
          toGrade: toGrade || staff.grade,
          toLevel: toLevel || staff.level,
          promotionDate: new Date(promotionDate),
          effectiveDate: new Date(effectiveDate),
          salaryIncrease,
          reason,
          approvedBy: user.email,
          approvedAt: new Date(),
          status: 'approved',
          notes,
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

      // Update staff member position if effective date is today or past
      if (new Date(effectiveDate) <= new Date()) {
        await prisma.staffMember.update({
          where: { staffId },
          data: {
            position: toPosition,
            grade: toGrade || staff.grade,
            level: toLevel || staff.level,
          },
        })
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'PROMOTION_CREATED',
          user: user.email,
          userRole: user.role,
          staffId,
          details: `Created promotion for ${staffId}: ${fromPosition} → ${toPosition}`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json(promotion, { status: 201 })
    } catch (error: any) {
      console.error('Error creating promotion:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create promotion' },
        { status: 500 }
      )
    }
  })(request)
}

