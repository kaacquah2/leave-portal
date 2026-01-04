import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, authOptions } from '@/lib/auth'
import { releaseLegalHold } from '@/lib/legal-hold'

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'

// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await releaseLegalHold(id, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[LegalHolds] Error releasing hold:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

