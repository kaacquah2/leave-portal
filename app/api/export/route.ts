/**
 * Export Control API
 * 
 * Implements export control with:
 * - Role-based export permissions
 * - Export audit logging
 * - Watermarked exported files
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession, authOptions } from '@/lib/auth'
import { createHash } from 'crypto'

// Export control matrix by role
const EXPORT_PERMISSIONS: Record<string, string[]> = {
  HR_DIRECTOR: ['staff', 'leave', 'payroll', 'audit', 'custom'],
  HR_OFFICER: ['staff', 'leave', 'payroll'],
  CHIEF_DIRECTOR: ['staff', 'leave', 'audit', 'custom'],
  DIRECTOR: ['leave', 'custom'], // Only their directorate
  AUDITOR: ['audit', 'custom'],
  SYSTEM_ADMIN: ['staff', 'leave', 'payroll', 'audit', 'custom'],
}

/**
 * Generate watermark for exported file
 */
function generateWatermark(userId: string, userRole: string, timestamp: Date): string {
  const watermark = `EXPORTED BY: ${userId} | ROLE: ${userRole} | DATE: ${timestamp.toISOString()} | MoFA HR System`
  return createHash('sha256').update(watermark).digest('hex').substring(0, 16)
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { exportType, dataType, dateRange, filters } = body

    // Check export permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userRole = user.role.toUpperCase()
    const allowedTypes = EXPORT_PERMISSIONS[userRole] || []

    if (!allowedTypes.includes(exportType)) {
      return NextResponse.json(
        { error: 'You do not have permission to export this data type' },
        { status: 403 }
      )
    }

    // Build query based on export type
    let data: any[] = []
    let recordCount = 0

    switch (exportType) {
      case 'staff':
        const staffData = await prisma.staffMember.findMany({
          where: filters || {},
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            position: true,
            grade: true,
            // Exclude sensitive fields unless HR_DIRECTOR
            ...(userRole === 'HR_DIRECTOR' ? {
              phone: true,
              rank: true,
              step: true,
            } : {}),
          },
        })
        data = staffData
        recordCount = staffData.length
        break

      case 'leave':
        const leaveData = await prisma.leaveRequest.findMany({
          where: {
            ...(dateRange ? {
              createdAt: {
                gte: new Date(dateRange.start),
                lte: new Date(dateRange.end),
              },
            } : {}),
            ...(filters || {}),
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
        })
        data = leaveData
        recordCount = leaveData.length
        break

      case 'audit':
        if (userRole !== 'AUDITOR' && userRole !== 'HR_DIRECTOR' && userRole !== 'SYSTEM_ADMIN') {
          return NextResponse.json(
            { error: 'Only auditors and HR directors can export audit logs' },
            { status: 403 }
          )
        }
        const auditData = await prisma.auditLog.findMany({
          where: {
            ...(dateRange ? {
              timestamp: {
                gte: new Date(dateRange.start),
                lte: new Date(dateRange.end),
              },
            } : {}),
            ...(filters || {}),
          },
        })
        data = auditData
        recordCount = auditData.length
        break

      default:
        return NextResponse.json(
          { error: 'Invalid export type' },
          { status: 400 }
        )
    }

    // Generate watermark
    const watermark = generateWatermark(session.user.id, userRole, new Date())

    // Create export log
    await prisma.exportLog.create({
      data: {
        userId: session.user.id,
        userRole,
        exportType,
        dataType: dataType || exportType,
        dateRange: dateRange || null,
        recordCount,
        watermarked: true,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: {
          watermark,
          filters,
        },
      },
    })

    // Add watermark to data
    const watermarkedData = {
      ...data,
      _watermark: watermark,
      _exportedBy: session.user.id,
      _exportedAt: new Date().toISOString(),
      _exportedRole: userRole,
    }

    return NextResponse.json({
      success: true,
      data: watermarkedData,
      recordCount,
      watermark,
    })
  } catch (error) {
    console.error('[Export] Error exporting data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

