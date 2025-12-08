import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH update holiday
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const holiday = await prisma.holiday.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.date && { date: new Date(body.date) }),
        ...(body.type && { type: body.type }),
        ...(body.recurring !== undefined && { recurring: body.recurring }),
        ...(body.year !== undefined && { year: body.year }),
      },
    })
    return NextResponse.json(holiday)
  } catch (error) {
    console.error('Error updating holiday:', error)
    return NextResponse.json({ error: 'Failed to update holiday' }, { status: 500 })
  }
}

// DELETE holiday
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.holiday.delete({
      where: { id: params.id },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting holiday:', error)
    return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 })
  }
}

