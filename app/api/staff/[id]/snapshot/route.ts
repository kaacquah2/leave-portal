import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, authOptions } from '@/lib/auth'
import { getStaffDataAtTime } from '@/lib/staff-versioning'

// Force dynamic execution (required for Prisma database access)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // Explicitly set to nodejs runtime

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

    const searchParams = request.nextUrl.searchParams
    const atTime = searchParams.get('at')

    if (!atTime) {
      return NextResponse.json(
        { error: 'at parameter is required' },
        { status: 400 }
      )
    }

    const snapshot = await getStaffDataAtTime(id, new Date(atTime))

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

