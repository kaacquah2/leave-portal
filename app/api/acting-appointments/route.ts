import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession, authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const appointments = await prisma.actingAppointment.findMany({
      where: {
        endDate: { gte: new Date() }, // Only active appointments
      },
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { effectiveDate: 'desc' },
    })

    const formatted = appointments.map(apt => ({
      id: apt.id,
      role: apt.role,
      staffId: apt.staffId,
      staffName: `${apt.staff.firstName} ${apt.staff.lastName}`,
      effectiveDate: apt.effectiveDate.toISOString(),
      endDate: apt.endDate.toISOString(),
      authoritySource: apt.authoritySource,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('[ActingAppointments] Error fetching:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions (HR_DIRECTOR or CHIEF_DIRECTOR)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const role = user.role.toUpperCase()
    if (role !== 'HR_DIRECTOR' && role !== 'CHIEF_DIRECTOR') {
      return NextResponse.json(
        { error: 'Only HR Director or Chief Director can create acting appointments' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { role: appointmentRole, staffId, effectiveDate, endDate, authoritySource } = body

    // Validate dates
    if (new Date(effectiveDate) >= new Date(endDate)) {
      return NextResponse.json(
        { error: 'End date must be after effective date' },
        { status: 400 }
      )
    }

    // Verify staff exists
    const staff = await prisma.staffMember.findUnique({
      where: { staffId },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    const appointment = await prisma.actingAppointment.create({
      data: {
        role: appointmentRole.toUpperCase(),
        staffId,
        effectiveDate: new Date(effectiveDate),
        endDate: new Date(endDate),
        authoritySource,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'acting_appointment_created',
        user: session.user.id,
        userRole: role,
        staffId,
        details: `Acting appointment created: ${appointmentRole} for ${staffId}`,
        metadata: {
          appointmentId: appointment.id,
          authoritySource,
        },
      },
    })

    return NextResponse.json({ success: true, appointment })
  } catch (error) {
    console.error('[ActingAppointments] Error creating:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

