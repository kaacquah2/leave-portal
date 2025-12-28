import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { processLeaveAccrual, processLeaveExpiration } from '@/lib/leave-accrual'
import { prisma } from '@/lib/prisma'


// POST trigger manual accrual processing
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR and admin can trigger accrual
      if (user.role !== 'hr' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const {
        accrualDate,
        staffIds,
        leaveTypes,
        processExpiration = false,
        processCarryForward = false,
      } = body

      // Process accrual
      const accrualResult = await processLeaveAccrual({
        accrualDate: accrualDate ? new Date(accrualDate) : undefined,
        staffIds,
        leaveTypes,
        processExpiration,
        processCarryForward,
        processedBy: user.email,
      })

      // Process expiration if requested
      let expirationResult = null
      if (processExpiration) {
        expirationResult = await processLeaveExpiration(
          accrualDate ? new Date(accrualDate) : undefined
        )
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'LEAVE_ACCRUAL_PROCESSED',
          user: user.email,
          details: `Accrual processed: ${accrualResult.processed} records, ${accrualResult.errors.length} errors`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json({
        success: accrualResult.success && (!expirationResult || expirationResult.success),
        accrual: accrualResult,
        expiration: expirationResult,
        timestamp: new Date().toISOString(),
      })
    } catch (error: any) {
      console.error('Error processing accrual:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to process accrual' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

// GET accrual status and last run info
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only HR and admin can view accrual status
      if (user.role !== 'hr' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      // Get last accrual date from balances
      const lastAccrual = await prisma.leaveBalance.findFirst({
        where: {
          lastAccrualDate: { not: null } as any,
        },
        orderBy: {
          lastAccrualDate: 'desc' as any,
        },
        select: {
          lastAccrualDate: true as any,
        },
      })

      // Get recent accrual history
      const recentHistory = await (prisma as any).leaveAccrualHistory.findMany({
        take: 10,
        orderBy: {
          accrualDate: 'desc',
        },
        include: {
          balance: {
            include: {
              staff: {
                select: {
                  firstName: true,
                  lastName: true,
                  staffId: true,
                },
              },
            },
          },
        },
      })

      // Get statistics
      const totalStaff = await prisma.staffMember.count({
        where: {
          active: true,
          employmentStatus: 'active' as any,
        },
      })

      const staffWithBalances = await prisma.leaveBalance.count({
        where: {
          staff: {
            active: true,
            employmentStatus: 'active' as any,
          },
        },
      })

      return NextResponse.json({
        lastAccrualDate: (lastAccrual as any)?.lastAccrualDate?.toISOString() || null,
        recentHistory: recentHistory.map((h: any) => ({
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
        })),
        statistics: {
          totalStaff,
          staffWithBalances,
        },
      })
    } catch (error: any) {
      console.error('Error fetching accrual status:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch accrual status' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

