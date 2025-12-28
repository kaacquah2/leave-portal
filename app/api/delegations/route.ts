import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// POST create approval delegation
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const body = await request.json()
    const { delegateeId, startDate, endDate, leaveTypes, notes } = body

    // Only managers and HR can create delegations
    if (user.role !== 'manager' && user.role !== 'hr') {
      return NextResponse.json(
        { error: 'Only managers and HR can create delegations' },
        { status: 403 }
      )
    }

    if (!user.staffId) {
      return NextResponse.json(
        { error: 'User must have a staff ID to create delegations' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!delegateeId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: delegateeId, startDate, endDate' },
        { status: 400 }
      )
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    const now = new Date()

    if (start >= end) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    if (end < now) {
      return NextResponse.json(
        { error: 'End date cannot be in the past' },
        { status: 400 }
      )
    }

    // Verify delegatee exists and is active
    const delegatee = await prisma.staffMember.findUnique({
      where: { staffId: delegateeId },
      select: { id: true, active: true },
    })

    if (!delegatee) {
      return NextResponse.json(
        { error: 'Delegatee not found' },
        { status: 404 }
      )
    }

    if (!delegatee.active) {
      return NextResponse.json(
        { error: 'Cannot delegate to inactive staff member' },
        { status: 403 }
      )
    }

    // Check for overlapping delegations
    const overlapping = await prisma.approvalDelegation.findFirst({
      where: {
        delegatorId: user.staffId,
        delegateeId,
        status: 'active',
        OR: [
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: start } },
            ],
          },
        ],
      },
    })

    if (overlapping) {
      return NextResponse.json(
        { error: 'An active delegation already exists for this period' },
        { status: 400 }
      )
    }

    // Create delegation
    const delegation = await prisma.approvalDelegation.create({
      data: {
        delegatorId: user.staffId,
        delegateeId,
        startDate: start,
        endDate: end,
        leaveTypes: leaveTypes || [],
        notes: notes || null,
        status: 'active',
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'APPROVAL_DELEGATION_CREATED',
        user: user.email || 'system',
        staffId: user.staffId,
        details: `Delegated approval authority to ${delegateeId} from ${startDate} to ${endDate}`,
      },
    })

    return NextResponse.json(delegation, { status: 201 })
  } catch (error) {
    console.error('Error creating delegation:', error)
    return NextResponse.json(
      { error: 'Failed to create delegation' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['manager', 'hr', 'admin'] })

// GET list delegations
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url)
    const delegatorId = searchParams.get('delegatorId')
    const delegateeId = searchParams.get('delegateeId')
    const status = searchParams.get('status')

    // Managers can only see their own delegations
    if (user.role === 'manager' && user.staffId) {
      const delegations = await prisma.approvalDelegation.findMany({
        where: {
          delegatorId: user.staffId,
          ...(status && { status }),
        },
        include: {
          delegatee: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { startDate: 'desc' },
      })
      return NextResponse.json(delegations)
    }

    // HR/Admin can see all delegations
    const delegations = await prisma.approvalDelegation.findMany({
      where: {
        ...(delegatorId && { delegatorId }),
        ...(delegateeId && { delegateeId }),
        ...(status && { status }),
      },
      include: {
        delegator: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        delegatee: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    })

    return NextResponse.json(delegations)
  } catch (error) {
    console.error('Error fetching delegations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch delegations' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['manager', 'hr', 'admin'] })

