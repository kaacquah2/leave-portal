import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, authOptions } from '@/lib/auth'
import { getStaffDataAtTime } from '@/lib/staff-versioning'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const atTime = searchParams.get('at')

    if (!atTime) {
      return NextResponse.json(
        { error: 'at parameter is required' },
        { status: 400 }
      )
    }

    const snapshot = await getStaffDataAtTime(params.id, new Date(atTime))

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(snapshot)
  } catch (error) {
    console.error('[StaffSnapshot] Error fetching:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

