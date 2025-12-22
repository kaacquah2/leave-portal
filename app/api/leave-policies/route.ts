import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET all leave policies
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const policies = await prisma.leavePolicy.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(policies)
  } catch (error) {
    console.error('Error fetching leave policies:', error)
    return NextResponse.json({ error: 'Failed to fetch leave policies' }, { status: 500 })
  }
})

// POST create leave policy
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR and admin can create leave policies
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const policy = await prisma.leavePolicy.create({
      data: {
        leaveType: body.leaveType,
        maxDays: body.maxDays,
        accrualRate: body.accrualRate,
        carryoverAllowed: body.carryoverAllowed ?? false,
        maxCarryover: body.maxCarryover ?? 0,
        requiresApproval: body.requiresApproval ?? true,
        approvalLevels: body.approvalLevels ?? 1,
        active: body.active ?? true,
      },
    })
    return NextResponse.json(policy, { status: 201 })
  } catch (error) {
    console.error('Error creating leave policy:', error)
    return NextResponse.json({ error: 'Failed to create leave policy' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin'] })

