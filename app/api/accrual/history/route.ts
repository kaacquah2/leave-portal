import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'

// GET accrual history
export async function GET(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      const searchParams = req.nextUrl.searchParams
      const staffId = searchParams.get('staffId')
      const leaveType = searchParams.get('leaveType')
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')
      const limit = parseInt(searchParams.get('limit') || '100')
      const offset = parseInt(searchParams.get('offset') || '0')

      // Role-based filtering
      const where: any = {}
      
      if (user.role === 'employee' && user.staffId) {
        where.staffId = user.staffId
      } else if (staffId) {
        where.staffId = staffId
      }

      if (leaveType) {
        where.leaveType = leaveType
      }

      if (startDate || endDate) {
        where.accrualDate = {}
        if (startDate) {
          where.accrualDate.gte = new Date(startDate)
        }
        if (endDate) {
          where.accrualDate.lte = new Date(endDate)
        }
      }

      const [history, total] = await Promise.all([
        (prisma as any).leaveAccrualHistory.findMany({
          where,
          include: {
            balance: {
              include: {
                staff: {
                  select: {
                    firstName: true,
                    lastName: true,
                    staffId: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            accrualDate: 'desc',
          },
          take: limit,
          skip: offset,
        }),
        (prisma as any).leaveAccrualHistory.count({ where }),
      ])

      return NextResponse.json({
        history: history.map((h: any) => ({
          id: h.id,
          staffId: h.staffId,
          staffName: h.balance?.staff
            ? `${h.balance.staff.firstName} ${h.balance.staff.lastName}`
            : h.staffId,
          leaveType: h.leaveType,
          accrualDate: h.accrualDate.toISOString(),
          accrualPeriod: h.accrualPeriod,
          daysAccrued: h.daysAccrued,
          daysBefore: h.daysBefore,
          daysAfter: h.daysAfter,
          proRataFactor: h.proRataFactor,
          carryForwardDays: h.carryForwardDays,
          expiredDays: h.expiredDays,
          notes: h.notes,
          processedBy: h.processedBy,
          createdAt: h.createdAt.toISOString(),
        })),
        total,
        limit,
        offset,
      })
    } catch (error: any) {
      console.error('Error fetching accrual history:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch accrual history' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })(request)
}

