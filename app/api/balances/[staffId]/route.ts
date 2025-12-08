import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET leave balance for specific staff
export async function GET(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    const balance = await prisma.leaveBalance.findUnique({
      where: { staffId: params.staffId },
      include: {
        staff: true,
      },
    })
    if (!balance) {
      return NextResponse.json({ error: 'Balance not found' }, { status: 404 })
    }
    return NextResponse.json(balance)
  } catch (error) {
    console.error('Error fetching balance:', error)
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 })
  }
}

