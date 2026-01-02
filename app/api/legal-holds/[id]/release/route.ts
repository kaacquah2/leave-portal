import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, authOptions } from '@/lib/auth'
import { releaseLegalHold } from '@/lib/legal-hold'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await releaseLegalHold(params.id, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[LegalHolds] Error releasing hold:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

