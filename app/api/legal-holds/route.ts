import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession, authOptions } from '@/lib/auth'
import { placeLegalHold } from '@/lib/legal-hold'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const holds = await prisma.legalHold.findMany({
      where: {
        status: 'active',
      },
      orderBy: { placedAt: 'desc' },
    })

    // Format response
    const formatted = await Promise.all(
      holds.map(async (hold) => {
        let staffName = null
        if (hold.staffId) {
          const staff = await prisma.staffMember.findUnique({
            where: { staffId: hold.staffId },
            select: {
              firstName: true,
              lastName: true,
            },
          })
          if (staff) {
            staffName = `${staff.firstName} ${staff.lastName}`
          }
        }

        return {
          id: hold.id,
          staffId: hold.staffId,
          staffName,
          leaveRequestId: hold.leaveRequestId,
          reason: hold.reason,
          placedBy: hold.placedBy,
          placedAt: hold.placedAt.toISOString(),
          expiresAt: hold.expiresAt?.toISOString() || null,
          status: hold.status,
        }
      })
    )

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('[LegalHolds] Error fetching:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { staffId, leaveRequestId, reason, expiresAt } = body

    await placeLegalHold({
      staffId: staffId || undefined,
      leaveRequestId: leaveRequestId || undefined,
      reason,
      placedBy: session.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[LegalHolds] Error placing hold:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

