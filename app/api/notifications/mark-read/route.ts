import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth'


// POST mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await prisma.notification.updateMany({
      where: {
        OR: [
          { userId: user.id },
          { staffId: user.staffId || undefined },
        ],
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json({ 
      success: true, 
      count: result.count 
    })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}

