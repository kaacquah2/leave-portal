/**
 * Compliance Dashboard API
 * 
 * Ghana Government Compliance: System-wide compliance status dashboard
 * Per requirement: Display "Compliance Status" dashboard for HR Directors
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isHRDirector, isChiefDirector, isAuditor, isHROfficer, isAdmin } from '@/lib/auth'
import { validateLeavePolicyAgainstStatutoryMinimums } from '@/lib/statutory-leave-validation'
import { COMPLIANCE_STATUS } from '@/lib/ghana-statutory-constants'
import { AUDIT_ROLES } from '@/lib/roles'

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
/**
 * GET /api/reports/compliance/dashboard
 * Get compliance dashboard data
 */
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // HR Officers, HR Directors, Chief Director, Auditors, and System Admins can view compliance dashboard
    if (!isHROfficer(user) && !isHRDirector(user) && !isChiefDirector(user) && !isAuditor(user) && !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions to view compliance dashboard' },
        { status: 403 }
      )
    }

    // Get all active policies
    const policies = await prisma.leavePolicy.findMany({
      where: { active: true },
    })

    // Check statutory compliance
    const policyCompliance = policies.map((policy) => {
      const validation = validateLeavePolicyAgainstStatutoryMinimums(
        policy.leaveType,
        policy.maxDays
      )
      return {
        leaveType: policy.leaveType,
        compliant: validation.valid,
        hasWarnings: validation.warnings.length > 0,
      }
    })

    const statutoryCompliant = policyCompliance.filter((p) => p.compliant).length
    const statutoryNonCompliant = policyCompliance.filter((p) => !p.compliant).length

    // Get pending balance overrides
    const pendingOverrides = await prisma.leaveBalanceOverride.count({
      where: { status: 'pending' },
    })

    // Get pending policy versions
    const pendingPolicyVersions = await prisma.leavePolicyVersion.count({
      where: { approvedBy: null },
    })

    // Get privacy acknowledgements (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentPrivacyAcknowledgements = await prisma.privacyAcknowledgement.count({
      where: {
        acknowledgedAt: {
          gte: thirtyDaysAgo,
        },
      },
    })

    // Get total users
    const totalUsers = await prisma.user.count({
      where: { active: true },
    })

    // Calculate privacy acknowledgement percentage
    const privacyAcknowledged = await prisma.privacyAcknowledgement.count()
    const privacyAcknowledgedPercentage = totalUsers > 0
      ? Math.round((privacyAcknowledged / totalUsers) * 100)
      : 0

    // Overall compliance status
    const overallStatus = 
      statutoryNonCompliant > 0
        ? COMPLIANCE_STATUS.NON_COMPLIANT
        : pendingOverrides > 0 || pendingPolicyVersions > 0
        ? COMPLIANCE_STATUS.REQUIRES_REVIEW
        : COMPLIANCE_STATUS.COMPLIANT

    return NextResponse.json({
      overallStatus,
      generatedAt: new Date().toISOString(),
      generatedBy: user.id,
      generatedByRole: user.role,
      
      statutoryCompliance: {
        status: statutoryNonCompliant > 0 
          ? COMPLIANCE_STATUS.NON_COMPLIANT 
          : COMPLIANCE_STATUS.COMPLIANT,
        totalPolicies: policies.length,
        compliant: statutoryCompliant,
        nonCompliant: statutoryNonCompliant,
        withWarnings: policyCompliance.filter((p) => p.hasWarnings).length,
      },
      
      dataProtection: {
        privacyAcknowledgements: {
          total: privacyAcknowledged,
          percentage: privacyAcknowledgedPercentage,
          recent30Days: recentPrivacyAcknowledgements,
          status: privacyAcknowledgedPercentage >= 90
            ? COMPLIANCE_STATUS.COMPLIANT
            : privacyAcknowledgedPercentage >= 70
            ? COMPLIANCE_STATUS.REQUIRES_REVIEW
            : COMPLIANCE_STATUS.NON_COMPLIANT,
        },
      },
      
      pendingActions: {
        balanceOverrides: pendingOverrides,
        policyVersions: pendingPolicyVersions,
        status: pendingOverrides > 0 || pendingPolicyVersions > 0
          ? COMPLIANCE_STATUS.REQUIRES_REVIEW
          : COMPLIANCE_STATUS.COMPLIANT,
      },
      
      legalReferences: {
        labourAct651: 'Labour Act, 2003 (Act 651)',
        dataProtectionAct843: 'Data Protection Act, 2012 (Act 843)',
        pscConditions: 'Public Services Commission (PSC) Conditions of Service',
        ohcsGuidelines: 'Office of the Head of Civil Service (OHCS) HR Guidelines',
      },
    })
  } catch (error) {
    console.error('Error generating compliance dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to generate compliance dashboard' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'AUDITOR', 'SYSTEM_ADMIN', 'hr_officer', 'hr_director', 'chief_director', 'auditor', 'hr', 'hr_assistant'] })

