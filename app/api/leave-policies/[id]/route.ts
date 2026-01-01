import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isHR, isAdmin } from '@/lib/auth-proxy'
import { validateLeavePolicyAgainstStatutoryMinimums } from '@/lib/statutory-leave-validation'
import { createAuditLog } from '@/lib/audit-logger'
import { HR_ROLES, ADMIN_ROLES } from '@/lib/role-utils'

/**
 * PATCH update leave policy
 * 
 * Ghana Government Compliance: Enforces Labour Act 651 statutory minimums
 * Prevents updates that would reduce policy below statutory minimums
 * 
 * Legal Reference: Labour Act, 2003 (Act 651), Section 57-60
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request }: AuthContext) => {
    try {
      // Only HR and admin can update leave policies
      if (!isHR(user) && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'Forbidden - HR access required' },
          { status: 403 }
        )
      }

      // Get existing policy to check leave type
      const existingPolicy = await prisma.leavePolicy.findUnique({
        where: { id },
      })

      if (!existingPolicy) {
        return NextResponse.json(
          { error: 'Leave policy not found' },
          { status: 404 }
        )
      }

      const body = await request.json()
      
      // CRITICAL: Validate maxDays if being updated
      if (body.maxDays !== undefined) {
        const newMaxDays = body.maxDays
        const validation = validateLeavePolicyAgainstStatutoryMinimums(
          existingPolicy.leaveType,
          newMaxDays
        )
        
        if (!validation.valid) {
          // Log attempted violation for audit
          await createAuditLog({
            action: 'leave_policy_update_blocked',
            user: user.id,
            userRole: user.role,
            details: `Attempted to update leave policy below statutory minimum: ${existingPolicy.leaveType} from ${existingPolicy.maxDays} to ${newMaxDays} days (minimum: ${validation.statutoryMinimum})`,
            metadata: {
              policyId: id,
              leaveType: existingPolicy.leaveType,
              currentDays: existingPolicy.maxDays,
              attemptedDays: newMaxDays,
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
              currentValue: existingPolicy.maxDays,
              attemptedValue: newMaxDays,
            },
            { status: 400 }
          )
        }
      }

      // Update policy
      const policy = await prisma.leavePolicy.update({
        where: { id },
        data: {
          ...(body.maxDays !== undefined && { maxDays: body.maxDays }),
          ...(body.accrualRate !== undefined && { accrualRate: body.accrualRate }),
          ...(body.accrualFrequency !== undefined && { accrualFrequency: body.accrualFrequency }),
          ...(body.carryoverAllowed !== undefined && { carryoverAllowed: body.carryoverAllowed }),
          ...(body.maxCarryover !== undefined && { maxCarryover: body.maxCarryover }),
          ...(body.expiresAfterMonths !== undefined && { expiresAfterMonths: body.expiresAfterMonths }),
          ...(body.requiresApproval !== undefined && { requiresApproval: body.requiresApproval }),
          ...(body.approvalLevels !== undefined && { approvalLevels: body.approvalLevels }),
          ...(body.active !== undefined && { active: body.active }),
        },
      })
      
      // Log policy update for audit
      await createAuditLog({
        action: 'leave_policy_updated',
        user: user.id,
        userRole: user.role,
        details: `Updated leave policy: ${existingPolicy.leaveType}`,
        metadata: {
          policyId: id,
          leaveType: existingPolicy.leaveType,
          changes: body,
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      })
      
      return NextResponse.json(policy)
    } catch (error) {
      console.error('Error updating leave policy:', error)
      return NextResponse.json({ error: 'Failed to update leave policy' }, { status: 500 })
    }
  }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES] })(request)
}

