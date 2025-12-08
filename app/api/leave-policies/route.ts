import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all leave policies
export async function GET() {
  try {
    const policies = await prisma.leavePolicy.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(policies)
  } catch (error) {
    console.error('Error fetching leave policies:', error)
    return NextResponse.json({ error: 'Failed to fetch leave policies' }, { status: 500 })
  }
}

// POST create leave policy
export async function POST(request: NextRequest) {
  try {
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
}

