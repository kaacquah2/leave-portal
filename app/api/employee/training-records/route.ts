import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET training records for current user
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (!user.staffId) {
      return NextResponse.json({ error: 'Staff ID not found' }, { status: 400 })
    }

    // Get training attendance records
    const trainingRecords = await prisma.trainingAttendance.findMany({
      where: {
        staffId: user.staffId,
      },
      include: {
        trainingProgram: {
          select: {
            id: true,
            title: true,
            description: true,
            provider: true,
            type: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform to match component interface
    const records = trainingRecords.map((record) => ({
      id: record.id,
      trainingProgramId: record.trainingProgramId,
      trainingProgram: {
        title: record.trainingProgram.title,
        description: record.trainingProgram.description,
        provider: record.trainingProgram.provider,
        type: record.trainingProgram.type,
        startDate: record.trainingProgram.startDate.toISOString(),
        endDate: record.trainingProgram.endDate.toISOString(),
        status: record.trainingProgram.status,
      },
      status: record.status,
      certificateUrl: record.certificateUrl,
      rating: record.rating,
      feedback: record.feedback,
      createdAt: record.createdAt.toISOString(),
    }))

    return NextResponse.json(records)
  } catch (error) {
    console.error('Error fetching training records:', error)
    return NextResponse.json({ error: 'Failed to fetch training records' }, { status: 500 })
  }
}, { allowedRoles: ['employee'] })

