/**
 * Leave Balance Override API
 * 
 * Ghana Government Compliance: Manual balance adjustments require HR Director approval
 * Per requirement: Restrict manual leave balance edits, require reason and approval
 * 
 * Legal Reference: Internal Audit Agency requirements, segregation of duties
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isHROfficer, isHRDirector } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit-logger'
import { HR_ROLES } from '@/lib/roles'

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


/**
 * POST /api/balances/override
 * Request a leave balance override (requires HR Director approval)
 */
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR Officers can request overrides
    if (!isHROfficer(user)) {
      return NextResponse.json(
        { error: 'Forbidden - HR Officer access required to request balance overrides' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      staffId,
      leaveType,
      newBalance,
      reason,
      supportingDocumentUrl,
    } = body

    // Validate required fields
    if (!staffId || !leaveType || newBalance === undefined || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: staffId, leaveType, newBalance, reason' },
        { status: 400 }
      )
    }

    // Validate reason length (minimum 20 characters for audit)
    if (reason.trim().length < 20) {
      return NextResponse.json(
        { error: 'Reason must be at least 20 characters long for audit purposes' },
        { status: 400 }
      )
    }

    // Get current balance
    const balance = await prisma.leaveBalance.findUnique({
      where: { staffId },
    })

    if (!balance) {
      return NextResponse.json(
        { error: 'Leave balance not found for this staff member' },
        { status: 404 }
      )
    }

    // Get balance field name
    const balanceFieldMap: Record<string, keyof typeof balance> = {
      'Annual': 'annual',
      'Sick': 'sick',
      'Unpaid': 'unpaid',
      'Special Service': 'specialService',
      'Training': 'training',
      'Study': 'study',
      'Maternity': 'maternity',
      'Paternity': 'paternity',
      'Compassionate': 'compassionate',
    }

    const balanceField = balanceFieldMap[leaveType]
    if (!balanceField) {
      return NextResponse.json(
        { error: `Invalid leave type: ${leaveType}` },
        { status: 400 }
      )
    }

    const previousBalance = balance[balanceField] as number
    const adjustment = newBalance - previousBalance

    // Create override request
    const override = await prisma.leaveBalanceOverride.create({
      data: {
        staffId,
        leaveType,
        previousBalance,
        newBalance,
        adjustment,
        reason,
        supportingDocumentUrl: supportingDocumentUrl || null,
        requestedBy: user.id,
        status: 'pending',
      },
    })

    // Log override request for audit
    await createAuditLog({
      action: 'balance_override_requested',
      user: user.id,
      userRole: user.role,
      staffId,
      details: `Balance override requested: ${leaveType} from ${previousBalance} to ${newBalance} days. Reason: ${reason}`,
      metadata: {
        overrideId: override.id,
        leaveType,
        previousBalance,
        newBalance,
        adjustment,
        reason,
      },
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json(override, { status: 201 })
  } catch (error) {
    console.error('Error creating balance override request:', error)
    return NextResponse.json(
      { error: 'Failed to create balance override request' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['HR_OFFICER', 'hr', 'hr_officer'] })

/**
 * GET /api/balances/override
 * Get all balance override requests (for HR Director approval)
 */
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR Director and HR Officer can view override requests
    const userIsHRDirector = isHRDirector(user)
    const userIsHROfficer = isHROfficer(user)
    
    if (!userIsHRDirector && !userIsHROfficer) {
      return NextResponse.json(
        { error: 'Forbidden - HR access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined

    const where: any = {}
    if (status) {
      where.status = status
    }

    // HR Officers can only see their own requests
    if (userIsHROfficer && !userIsHRDirector) {
      where.requestedBy = user.id
    }

    const overrides = await prisma.leaveBalanceOverride.findMany({
      where,
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
      orderBy: { requestedAt: 'desc' },
    })

    return NextResponse.json(overrides)
  } catch (error) {
    console.error('Error fetching balance overrides:', error)
    return NextResponse.json(
      { error: 'Failed to fetch balance overrides' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['HR_OFFICER', 'HR_DIRECTOR', 'hr', 'hr_director', 'hr_officer'] })

