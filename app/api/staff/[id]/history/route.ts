import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession, authOptions } from '@/lib/auth'
import { getStaffHistory } from '@/lib/staff-versioning'

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const history = await getStaffHistory(id)

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

