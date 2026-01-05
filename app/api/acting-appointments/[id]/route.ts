import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession, authOptions } from '@/lib/auth'

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const role = user.role.toUpperCase()
    if (role !== 'HR_DIRECTOR' && role !== 'CHIEF_DIRECTOR') {
      return NextResponse.json(
        { error: 'Only HR Director or Chief Director can delete acting appointments' },
        { status: 403 }
      )
    }

    const appointment = await prisma.actingAppointment.findUnique({
      where: { id },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Acting appointment not found' },
        { status: 404 }
      )
    }

    await prisma.actingAppointment.delete({
      where: { id },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'acting_appointment_deleted',
        user: session.user.id,
        userRole: role,
        staffId: appointment.staffId,
        details: `Acting appointment deleted: ${appointment.role} for ${appointment.staffId}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ActingAppointments] Error deleting:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

