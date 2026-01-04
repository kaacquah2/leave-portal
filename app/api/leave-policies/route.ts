import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isHR, isAdmin } from '@/lib/auth-proxy'
import { validateLeavePolicyAgainstStatutoryMinimums } from '@/lib/statutory-leave-validation'
import { createAuditLog } from '@/lib/audit-logger'
import { READ_ONLY_ROLES, HR_ROLES, ADMIN_ROLES } from '@/lib/role-utils'

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
/**
 * GET all leave policies - All authenticated users can view policies
 * 
 * Ghana Government Compliance: Policies include statutory minimum indicators
 */
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
}, { allowedRoles: READ_ONLY_ROLES })

/**
 * POST create leave policy
 * 
 * Ghana Government Compliance: Enforces Labour Act 651 statutory minimums
 * Prevents creation of policies below statutory minimums
 * 
 * Legal Reference: Labour Act, 2003 (Act 651), Section 57-60
 */
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR and admin can create leave policies
    if (!isHR(user) && !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - HR access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // CRITICAL: Validate against statutory minimums (Labour Act 651)
    const validation = validateLeavePolicyAgainstStatutoryMinimums(
      body.leaveType,
      body.maxDays
    )
    
    if (!validation.valid) {
      // Log attempted violation for audit
      await createAuditLog({
        action: 'leave_policy_creation_blocked',
        user: user.id,
        userRole: user.role,
        details: `Attempted to create leave policy below statutory minimum: ${body.leaveType} with ${body.maxDays} days (minimum: ${validation.statutoryMinimum})`,
        metadata: {
          leaveType: body.leaveType,
          attemptedDays: body.maxDays,
          statutoryMinimum: validation.statutoryMinimum,
          legalReference: validation.legalReference,
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      })
      
      return NextResponse.json(
        { 
          error: 'This configuration violates Labour Act 651',
          errorCode: 'STATUTORY_MINIMUM_VIOLATION',
          details: validation.errors,
          warnings: validation.warnings,
          statutoryMinimum: validation.statutoryMinimum,
          legalReference: validation.legalReference,
        },
        { status: 400 }
      )
    }

    // Create policy
    const policy = await prisma.leavePolicy.create({
      data: {
        leaveType: body.leaveType,
        maxDays: body.maxDays,
        accrualRate: body.accrualRate,
        accrualFrequency: body.accrualFrequency ?? 'monthly',
        carryoverAllowed: body.carryoverAllowed ?? false,
        maxCarryover: body.maxCarryover ?? 0,
        expiresAfterMonths: body.expiresAfterMonths ?? null,
        requiresApproval: body.requiresApproval ?? true,
        approvalLevels: body.approvalLevels ?? 1,
        active: body.active ?? true,
      },
    })
    
    // Log policy creation for audit
    await createAuditLog({
      action: 'leave_policy_created',
      user: user.id,
      userRole: user.role,
      details: `Created leave policy: ${body.leaveType} with ${body.maxDays} days`,
      metadata: {
        policyId: policy.id,
        leaveType: body.leaveType,
        maxDays: body.maxDays,
        statutoryMinimum: validation.statutoryMinimum,
      },
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    })
    
    return NextResponse.json(policy, { status: 201 })
  } catch (error) {
    console.error('Error creating leave policy:', error)
    return NextResponse.json({ error: 'Failed to create leave policy' }, { status: 500 })
  }
}, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES] })

