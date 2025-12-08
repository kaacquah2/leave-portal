import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all holidays
export async function GET() {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: 'asc' },
    })
    return NextResponse.json(holidays)
  } catch (error) {
    console.error('Error fetching holidays:', error)
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 })
  }
}

// POST create holiday
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const holiday = await prisma.holiday.create({
      data: {
        name: body.name,
        date: new Date(body.date),
        type: body.type,
        recurring: body.recurring ?? false,
        year: body.year || null,
      },
    })
    return NextResponse.json(holiday, { status: 201 })
  } catch (error) {
    console.error('Error creating holiday:', error)
    return NextResponse.json({ error: 'Failed to create holiday' }, { status: 500 })
  }
}

