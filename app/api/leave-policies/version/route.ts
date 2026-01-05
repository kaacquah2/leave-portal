/**
 * Leave Policy Versioning API
 * 
 * Ghana Government Compliance: Leave policies are immutable once applied
 * Changes create new versions with mandatory justification and HR Director approval
 * 
 * Legal Reference: Internal Audit Agency requirements, policy governance
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isHROfficer, isHRDirector, isChiefDirector, isAuditor, isAdmin } from '@/lib/auth'
import { validateLeavePolicyAgainstStatutoryMinimums } from '@/lib/statutory-leave-validation'
import { createAuditLog } from '@/lib/audit-logger'
import { HR_ROLES, AUDIT_ROLES } from '@/lib/roles'

// Force static export configuration (required for static export mode)

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
/**
 * POST /api/leave-policies/version
 * Create a new version of a leave policy (requires HR Director approval)
 */
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR Officers can request policy changes
    if (!isHROfficer(user)) {
      return NextResponse.json(
        { error: 'Forbidden - HR Officer access required to create policy versions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      policyId, // Reference to current policy (if updating existing)
      leaveType,
      maxDays,
      accrualRate,
      accrualFrequency,
      carryoverAllowed,
      maxCarryover,
      expiresAfterMonths,
      requiresApproval,
      approvalLevels,
      active,
      changeReason, // Mandatory justification
    } = body

    // Validate required fields
    if (!leaveType || maxDays === undefined || !changeReason) {
      return NextResponse.json(
        { error: 'Missing required fields: leaveType, maxDays, changeReason' },
        { status: 400 }
      )
    }

    // Validate change reason length (minimum 30 characters for audit)
    if (changeReason.trim().length < 30) {
      return NextResponse.json(
        { error: 'Change reason must be at least 30 characters long for audit purposes' },
        { status: 400 }
      )
    }

    // CRITICAL: Validate against statutory minimums
    const validation = validateLeavePolicyAgainstStatutoryMinimums(leaveType, maxDays)
    
    if (!validation.valid) {
      await createAuditLog({
        action: 'leave_policy_version_creation_blocked',
        user: user.id,
        userRole: user.role,
        details: `Attempted to create policy version below statutory minimum: ${leaveType} with ${maxDays} days`,
        metadata: {
          leaveType,
          attemptedDays: maxDays,
          statutoryMinimum: validation.statutoryMinimum,
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      })
      
      return NextResponse.json(
        { 
          error: 'This configuration violates Labour Act 651',
          errorCode: 'STATUTORY_MINIMUM_VIOLATION',
          details: validation.errors,
          statutoryMinimum: validation.statutoryMinimum,
        },
        { status: 400 }
      )
    }

    // Get current version number
    let versionNumber = 1
    if (policyId) {
      const existingVersions = await prisma.leavePolicyVersion.findMany({
        where: { policyId },
        orderBy: { versionNumber: 'desc' },
        take: 1,
      })
      
      if (existingVersions.length > 0) {
        versionNumber = existingVersions[0].versionNumber + 1
      }
    }

    // Create new policy version (pending HR Director approval)
    const policyVersion = await prisma.leavePolicyVersion.create({
      data: {
        policyId: policyId || null,
        leaveType,
        maxDays,
        accrualRate: accrualRate ?? 0,
        accrualFrequency: accrualFrequency ?? 'monthly',
        carryoverAllowed: carryoverAllowed ?? false,
        maxCarryover: maxCarryover ?? 0,
        expiresAfterMonths: expiresAfterMonths ?? null,
        requiresApproval: requiresApproval ?? true,
        approvalLevels: approvalLevels ?? 1,
        active: false, // Inactive until approved
        versionNumber,
        effectiveFrom: new Date(), // Will be set when approved
        changedBy: user.id,
        changeReason,
        // Not approved yet - requires HR Director approval
      },
    })

    // Log version creation for audit
    await createAuditLog({
      action: 'leave_policy_version_created',
      user: user.id,
      userRole: user.role,
      details: `Created new policy version: ${leaveType} v${versionNumber}. Reason: ${changeReason}`,
      metadata: {
        versionId: policyVersion.id,
        policyId,
        leaveType,
        versionNumber,
        changeReason,
      },
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json({
      message: 'Policy version created. Pending HR Director approval.',
      version: policyVersion,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating policy version:', error)
    return NextResponse.json(
      { error: 'Failed to create policy version' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['HR_OFFICER', 'hr', 'hr_assistant', 'hr_officer'] })

/**
 * GET /api/leave-policies/version
 * Get all policy versions (for audit and history)
 */
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url)
    const policyId = searchParams.get('policyId') || undefined
    const leaveType = searchParams.get('leaveType') || undefined

    const where: any = {}
    if (policyId) {
      where.policyId = policyId
    }
    if (leaveType) {
      where.leaveType = leaveType
    }

    const versions = await prisma.leavePolicyVersion.findMany({
      where,
      orderBy: [
        { leaveType: 'asc' },
        { versionNumber: 'desc' },
      ],
    })

    return NextResponse.json(versions)
  } catch (error) {
    console.error('Error fetching policy versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch policy versions' },
      { status: 500 }
    )
  }
}, { allowedRoles: AUDIT_ROLES })

