import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession, authOptions } from '@/lib/auth'
import { getStaffHistory } from '@/lib/staff-versioning'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const history = await getStaffHistory(params.id)

    const formatted = history.map(entry => ({
      id: entry.id,
      fieldName: entry.fieldName,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      effectiveFrom: entry.effectiveFrom.toISOString(),
      effectiveTo: entry.effectiveTo?.toISOString() || null,
      changedBy: entry.changedBy,
      changeReason: entry.changeReason,
      snapshotAt: entry.snapshotAt?.toISOString() || null,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('[StaffHistory] Error fetching:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

