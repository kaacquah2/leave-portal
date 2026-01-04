/**
 * External Clearance (PSC/OHCS) API
 * Manages external clearance for special leave types
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { requiresExternalClearance } from '@/lib/ghana-civil-service-approval-workflow'

// Force static export configuration

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export function generateStaticParams() {
  return []
}

// GET all leave requests requiring external clearance
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only Chief Director and HR Director can view external clearance requests
    if (user.role !== 'CHIEF_DIRECTOR' && user.role !== 'chief_director' &&
        user.role !== 'HR_DIRECTOR' && user.role !== 'hr_director') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending, cleared, rejected

    const where: any = {
      requiresExternalClearance: true,
    }

    if (status) {
      where.externalClearanceStatus = status
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            email: true,
            unit: true,
            directorate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      leaves,
      count: leaves.length,
    })
  } catch (error) {
    console.error('Error fetching external clearance requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch external clearance requests' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['CHIEF_DIRECTOR', 'HR_DIRECTOR', 'chief_director', 'hr_director'] })

// POST update external clearance status
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only Chief Director can update external clearance
    if (user.role !== 'CHIEF_DIRECTOR' && user.role !== 'chief_director') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { leaveRequestId, status, pscReferenceNumber, ohcsReferenceNumber, comments } = body

    if (!leaveRequestId || !status) {
      return NextResponse.json(
        { error: 'leaveRequestId and status are required' },
        { status: 400 }
      )
    }

    const validStatuses = ['pending', 'cleared', 'rejected']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Update leave request
    await prisma.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        externalClearanceStatus: status,
        pscReferenceNumber: pscReferenceNumber || null,
        ohcsReferenceNumber: ohcsReferenceNumber || null,
      },
    })

    return NextResponse.json({
      success: true,
      message: `External clearance ${status}`,
    })
  } catch (error) {
    console.error('Error updating external clearance:', error)
    return NextResponse.json(
      { error: 'Failed to update external clearance' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['CHIEF_DIRECTOR', 'chief_director'] })

