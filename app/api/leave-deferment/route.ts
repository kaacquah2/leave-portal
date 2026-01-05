/**
 * Leave Deferment Request API
 * Allows employees to request deferment of leave before year-end (exceptional cases)
 * Workflow: Employee → Supervisor → HR → Authorized Officer
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/roles'
import { sendNotification } from '@/lib/notification-service'
import { buildLeaveWhereClause } from '@/lib/data-scoping-utils'

// GET all deferment requests (filtered by role)

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const staffId = searchParams.get('staffId')

    // Build where clause based on user role with proper data scoping
    const { where: scopedWhere, hasAccess } = await buildLeaveWhereClause({
      id: user.id,
      role: user.role,
      staffId: user.staffId,
    })
    
    if (!hasAccess) {
      return NextResponse.json([]) // Return empty array if no access
    }

    // Build where clause for deferment requests
    // buildLeaveWhereClause returns staffId filter, so we use that for deferment requests
    let where: any = {}
    
    if (scopedWhere.staffId) {
      if (typeof scopedWhere.staffId === 'string') {
        where.staffId = scopedWhere.staffId
      } else if (scopedWhere.staffId.in) {
        where.staffId = { in: scopedWhere.staffId.in }
      } else {
        where.staffId = scopedWhere.staffId
      }
    } else {
      // No staffId filter means user can see all (HR roles)
      // No additional filter needed
    }

    if (status) {
      where.status = status
    }

    // If specific staffId is requested and user has permission to view it
    if (staffId) {
      // Verify the requested staffId is within the user's scope
      const requestedStaff = await prisma.staffMember.findUnique({
        where: { staffId },
        select: { staffId: true },
      })
      
      if (requestedStaff) {
        // Check if the requested staffId is in the scoped list
        if (scopedWhere.staffId) {
          if (typeof scopedWhere.staffId === 'string') {
            if (scopedWhere.staffId === staffId) {
              where.staffId = staffId
            } else {
              return NextResponse.json([]) // Requested staffId not in scope
            }
          } else if (scopedWhere.staffId.in) {
            if (scopedWhere.staffId.in.includes(staffId)) {
              where.staffId = staffId
            } else {
              return NextResponse.json([]) // Requested staffId not in scope
            }
          }
        } else {
          // No staffId filter means user can see all
          where.staffId = staffId
        }
      } else {
        return NextResponse.json([]) // Staff not found
      }
    }

    const deferments = await prisma.leaveDefermentRequest.findMany({
      where,
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(deferments)
  } catch (error: any) {
    console.error('Error fetching deferment requests:', error)
    return NextResponse.json({ error: 'Failed to fetch deferment requests' }, { status: 500 })
  }
}, { allowedRoles: ['EMPLOYEE', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER', 'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'employee', 'supervisor', 'manager', 'hr', 'hr_officer', 'hr_director'] })

// POST create deferment request
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const body = await request.json()
    const { leaveType, unusedDays, reason, reasonCode } = body

    if (!leaveType || !unusedDays || !reason) {
      return NextResponse.json(
        { error: 'leaveType, unusedDays, and reason are required' },
        { status: 400 }
      )
    }

    const currentUserStaff = await prisma.staffMember.findUnique({
      where: { staffId: user.staffId || undefined },
      include: { leaveBalance: true },
    })

    if (!currentUserStaff) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 })
    }

    // Check if employee has unused leave of this type
    const leaveBalance = currentUserStaff.leaveBalance
    if (!leaveBalance) {
      return NextResponse.json({ error: 'Leave balance not found' }, { status: 404 })
    }

    const balanceField = leaveType.toLowerCase() === 'annual' ? 'annual' :
                         leaveType.toLowerCase() === 'sick' ? 'sick' :
                         leaveType.toLowerCase() === 'special service' ? 'specialService' :
                         leaveType.toLowerCase() === 'training' ? 'training' :
                         leaveType.toLowerCase() === 'study' ? 'study' : null

    if (!balanceField) {
      return NextResponse.json({ error: 'Invalid leave type' }, { status: 400 })
    }

    const currentBalance = leaveBalance[balanceField as keyof typeof leaveBalance] as number
    if (currentBalance < unusedDays) {
      return NextResponse.json(
        { error: `You only have ${currentBalance} unused ${leaveType} days, cannot defer ${unusedDays} days` },
        { status: 400 }
      )
    }

    // Check if year-end has passed (deferment must be before year-end)
    const today = new Date()
    const currentYear = today.getFullYear()
    const yearEnd = new Date(currentYear, 11, 31) // December 31
    if (today >= yearEnd) {
      return NextResponse.json(
        { error: 'Deferment requests must be submitted before year-end' },
        { status: 400 }
      )
    }

    // Check for existing pending deferment for this leave type
    const existingDeferment = await prisma.leaveDefermentRequest.findFirst({
      where: {
        staffId: currentUserStaff.staffId,
        leaveType,
        status: { in: ['pending', 'supervisor_approved', 'hr_validated'] },
      },
    })

    if (existingDeferment) {
      return NextResponse.json(
        { error: 'You already have a pending deferment request for this leave type' },
        { status: 400 }
      )
    }

    // Create deferment request
    const deferment = await prisma.leaveDefermentRequest.create({
      data: {
        staffId: currentUserStaff.staffId,
        leaveType,
        unusedDays,
        reason,
        reasonCode: reasonCode || null,
        status: 'pending',
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

    // Notify supervisor
    if (currentUserStaff.immediateSupervisorId) {
      const supervisor = await prisma.user.findFirst({
        where: { staffId: currentUserStaff.immediateSupervisorId },
      })

      if (supervisor) {
        const portalUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        await sendNotification({
          userId: supervisor.id,
          type: 'leave_reminder',
          title: 'Leave Deferment Request - Action Required',
          message: `${currentUserStaff.firstName} ${currentUserStaff.lastName} has requested to defer ${unusedDays} ${leaveType} days. Reason: ${reason}`,
          link: portalUrl ? `${portalUrl}/deferments/${deferment.id}` : `/deferments/${deferment.id}`,
          priority: 'high',
        })
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'LEAVE_DEFERMENT_REQUEST_CREATED',
        user: user.email || 'unknown',
        userRole: user.role,
        details: JSON.stringify({
          defermentId: deferment.id,
          staffId: currentUserStaff.staffId,
          leaveType,
          unusedDays,
          reason,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      deferment,
      message: 'Deferment request submitted successfully. Awaiting supervisor approval.',
    })
  } catch (error: any) {
    console.error('Error creating deferment request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create deferment request' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['EMPLOYEE', 'employee'] })

