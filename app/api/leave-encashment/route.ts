/**
 * Leave Encashment Request API
 * Very restricted - only for retirement, exit, or special authorization
 * Only HR Director or Chief Director can approve
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/roles'
import { sendNotification } from '@/lib/notification-service'

// GET all encashment requests (HR Director/Chief Director only)

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR Director or Chief Director can view encashment requests
    if (user.role !== 'HR_DIRECTOR' && user.role !== 'hr_director' &&
        user.role !== 'CHIEF_DIRECTOR' && user.role !== 'chief_director') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const staffId = searchParams.get('staffId')

    let where: any = {}

    if (status) {
      where.status = status
    }

    if (staffId) {
      where.staffId = staffId
    }

    const encashments = await prisma.leaveEncashmentRequest.findMany({
      where,
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
            employmentStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(encashments)
  } catch (error: any) {
    console.error('Error fetching encashment requests:', error)
    return NextResponse.json({ error: 'Failed to fetch encashment requests' }, { status: 500 })
  }
}, { allowedRoles: ['HR_DIRECTOR', 'CHIEF_DIRECTOR', 'hr_director', 'chief_director'] })

// POST create encashment request (HR Director/Chief Director can create on behalf of staff)
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const body = await request.json()
    const { staffId, leaveType, days, reason, reasonCode, reasonDetails } = body

    if (!staffId || !leaveType || !days || !reason) {
      return NextResponse.json(
        { error: 'staffId, leaveType, days, and reason are required' },
        { status: 400 }
      )
    }

    // Validate reason
    const validReasons = ['retirement', 'exit', 'special_authorization']
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: `reason must be one of: ${validReasons.join(', ')}` },
        { status: 400 }
      )
    }

    // Only HR Director or Chief Director can create encashment requests
    if (user.role !== 'HR_DIRECTOR' && user.role !== 'hr_director' &&
        user.role !== 'CHIEF_DIRECTOR' && user.role !== 'chief_director') {
      return NextResponse.json({ error: 'Permission denied - HR Director or Chief Director access required' }, { status: 403 })
    }

    const staff = await prisma.staffMember.findUnique({
      where: { staffId },
      include: { leaveBalance: true },
    })

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Check if staff has sufficient leave balance
    const leaveBalance = staff.leaveBalance
    if (!leaveBalance) {
      return NextResponse.json({ error: 'Leave balance not found' }, { status: 404 })
    }

    const balanceField = leaveType.toLowerCase() === 'annual' ? 'annual' :
                         leaveType.toLowerCase() === 'sick' ? 'sick' :
                         leaveType.toLowerCase() === 'special service' ? 'specialService' : null

    if (!balanceField) {
      return NextResponse.json({ error: 'Invalid leave type for encashment' }, { status: 400 })
    }

    const currentBalance = leaveBalance[balanceField as keyof typeof leaveBalance] as number
    if (currentBalance < days) {
      return NextResponse.json(
        { error: `Staff only has ${currentBalance} ${leaveType} days, cannot encash ${days} days` },
        { status: 400 }
      )
    }

    // Validate reason-specific requirements
    if (reason === 'retirement' && staff.employmentStatus !== 'retired') {
      return NextResponse.json(
        { error: 'Encashment reason is retirement but staff is not retired' },
        { status: 400 }
      )
    }

    if (reason === 'exit' && !['terminated', 'resigned'].includes(staff.employmentStatus)) {
      return NextResponse.json(
        { error: 'Encashment reason is exit but staff is not terminated or resigned' },
        { status: 400 }
      )
    }

    if (reason === 'special_authorization' && !reasonDetails) {
      return NextResponse.json(
        { error: 'reasonDetails is required for special_authorization' },
        { status: 400 }
      )
    }

    // Create encashment request
    const encashment = await prisma.leaveEncashmentRequest.create({
      data: {
        staffId,
        leaveType,
        days,
        reason,
        reasonCode: reasonCode || null,
        reasonDetails: reasonDetails || null,
        status: 'pending',
        authorizedBy: user.id, // Created by HR Director/Chief Director
      },
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    // Notify staff member
    const staffUser = await prisma.user.findFirst({
      where: { staffId },
    })

    if (staffUser) {
      const portalUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      await sendNotification({
        userId: staffUser.id,
        type: 'system',
        title: 'Leave Encashment Request Created',
        message: `A leave encashment request has been created for ${days} ${leaveType} days. Reason: ${reason}. Awaiting approval.`,
        link: portalUrl ? `${portalUrl}/encashments/${encashment.id}` : `/encashments/${encashment.id}`,
        priority: 'normal',
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'LEAVE_ENCASHMENT_REQUEST_CREATED',
        user: user.email || 'unknown',
        userRole: user.role,
        details: JSON.stringify({
          encashmentId: encashment.id,
          staffId,
          leaveType,
          days,
          reason,
          createdBy: user.id,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      encashment,
      message: 'Encashment request created successfully',
    })
  } catch (error: any) {
    console.error('Error creating encashment request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create encashment request' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['HR_DIRECTOR', 'CHIEF_DIRECTOR', 'hr_director', 'chief_director'] })

