/**
 * Approve Policy Version API
 * 
 * Ghana Government Compliance: Only HR Director can approve policy versions
 * Per requirement: Require HR Director approval for policy changes
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isHRDirector } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit-logger'

// Force static export configuration (required for static export mode)
// For static export, API routes are not generated but need generateStaticParams
// Return a dummy value to satisfy Next.js static export requirements
export function generateStaticParams() {
  // Return at least one value to satisfy static export requirements
  // This route will not actually be used in static export (API routes require server)
  return [{ id: 'dummy' }]
}

/**
 * POST /api/leave-policies/version/[id]/approve
 * Approve a policy version (HR Director only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request }: AuthContext) => {
    try {
      // Only HR Director can approve policy versions
      if (!isHRDirector(user)) {
        return NextResponse.json(
          { error: 'Forbidden - HR Director access required to approve policy versions' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const { approved, rejectionReason } = body

      if (approved === undefined) {
        return NextResponse.json(
          { error: 'Missing required field: approved (boolean)' },
          { status: 400 }
        )
      }

      // Get policy version
      const version = await prisma.leavePolicyVersion.findUnique({
        where: { id },
      })

      if (!version) {
        return NextResponse.json(
          { error: 'Policy version not found' },
          { status: 404 }
        )
      }

      if (version.approvedBy) {
        return NextResponse.json(
          { error: 'Policy version has already been processed' },
          { status: 400 }
        )
      }

      if (approved) {
        // Approve: Supersede previous versions and activate this one
        await prisma.$transaction(async (tx) => {
          // Supersede all previous versions for this policy
          if (version.policyId) {
            await tx.leavePolicyVersion.updateMany({
              where: {
                policyId: version.policyId,
                effectiveTo: null, // Only active versions
              },
              data: {
                effectiveTo: new Date(),
                supersededBy: id,
              },
            })
          }

          // Activate this version
          await tx.leavePolicyVersion.update({
            where: { id },
            data: {
              active: true,
              effectiveFrom: new Date(),
              approvedBy: user.id,
              approvedAt: new Date(),
            },
          })

          // Update or create LeavePolicy record (for backward compatibility)
          if (version.policyId) {
            await tx.leavePolicy.update({
              where: { id: version.policyId },
              data: {
                maxDays: version.maxDays,
                accrualRate: version.accrualRate,
                accrualFrequency: version.accrualFrequency,
                carryoverAllowed: version.carryoverAllowed,
                maxCarryover: version.maxCarryover,
                expiresAfterMonths: version.expiresAfterMonths,
                requiresApproval: version.requiresApproval,
                approvalLevels: version.approvalLevels,
                active: true,
              },
            })
          } else {
            // Create new LeavePolicy record
            await tx.leavePolicy.create({
              data: {
                leaveType: version.leaveType,
                maxDays: version.maxDays,
                accrualRate: version.accrualRate,
                accrualFrequency: version.accrualFrequency,
                carryoverAllowed: version.carryoverAllowed,
                maxCarryover: version.maxCarryover,
                expiresAfterMonths: version.expiresAfterMonths,
                requiresApproval: version.requiresApproval,
                approvalLevels: version.approvalLevels,
                active: true,
              },
            })
          }
        })

        // Log approval for audit
        await createAuditLog({
          action: 'leave_policy_version_approved',
          user: user.id,
          userRole: user.role,
          details: `Policy version approved: ${version.leaveType} v${version.versionNumber}. Reason: ${version.changeReason}`,
          metadata: {
            versionId: id,
            policyId: version.policyId,
            leaveType: version.leaveType,
            versionNumber: version.versionNumber,
            changeReason: version.changeReason,
          },
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        })

        return NextResponse.json({
          message: 'Policy version approved and activated',
          version: {
            ...version,
            active: true,
            approvedBy: user.id,
            approvedAt: new Date(),
          },
        })
      } else {
        // Reject: Require rejection reason
        if (!rejectionReason || rejectionReason.trim().length < 20) {
          return NextResponse.json(
            { error: 'Rejection reason is required (minimum 20 characters)' },
            { status: 400 }
          )
        }

        // Update version status
        await prisma.leavePolicyVersion.update({
          where: { id },
          data: {
            active: false,
            approvedBy: user.id,
            approvedAt: new Date(),
            changeReason: `${version.changeReason} [REJECTED: ${rejectionReason}]`,
          },
        })

        // Log rejection for audit
        await createAuditLog({
          action: 'leave_policy_version_rejected',
          user: user.id,
          userRole: user.role,
          details: `Policy version rejected: ${version.leaveType} v${version.versionNumber}. Reason: ${rejectionReason}`,
          metadata: {
            versionId: id,
            policyId: version.policyId,
            leaveType: version.leaveType,
            versionNumber: version.versionNumber,
            rejectionReason,
          },
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        })

        return NextResponse.json({
          message: 'Policy version rejected',
          version: {
            ...version,
            active: false,
            approvedBy: user.id,
            approvedAt: new Date(),
          },
        })
      }
    } catch (error) {
      console.error('Error processing policy version approval:', error)
      return NextResponse.json(
        { error: 'Failed to process policy version approval' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['HR_DIRECTOR', 'hr_director'] })(request)
}

