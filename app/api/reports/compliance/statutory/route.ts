/**
 * Statutory Compliance Report API
 * 
 * Ghana Government Compliance: Report on all policies vs statutory minimums
 * Per requirement: Statutory Compliance Report
 * 
 * Legal Reference: Labour Act, 2003 (Act 651)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isHR, isHRDirector, isChiefDirector, isAuditor, isAdmin } from '@/lib/auth'
import { validateLeavePolicyAgainstStatutoryMinimums, getStatutoryMinimum } from '@/lib/statutory-leave-validation'
import { AUDIT_ROLES } from '@/lib/roles'

// Force dynamic - this route uses cookies via withAuth and cannot be statically pre-rendered

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
/**
 * GET /api/reports/compliance/statutory
 * Generate statutory compliance report
 * Note: Uses cookies via withAuth, will be skipped during static export (works at runtime)
 */
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only HR, Directors, and Auditors can view compliance reports
    if (!isHR(user) && !isHRDirector(user) && !isChiefDirector(user) && !isAuditor(user) && !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions to view compliance reports' },
        { status: 403 }
      )
    }

    // Get all active leave policies
    const policies = await prisma.leavePolicy.findMany({
      where: { active: true },
      orderBy: { leaveType: 'asc' },
    })

    // Check each policy against statutory minimums
    const complianceReport = policies.map((policy) => {
      const validation = validateLeavePolicyAgainstStatutoryMinimums(
        policy.leaveType,
        policy.maxDays
      )
      const statutoryMinimum = getStatutoryMinimum(policy.leaveType)

      return {
        policyId: policy.id,
        leaveType: policy.leaveType,
        currentMaxDays: policy.maxDays,
        statutoryMinimum: statutoryMinimum || null,
        compliant: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
        legalReference: validation.legalReference,
      }
    })

    // Summary statistics
    const summary = {
      totalPolicies: policies.length,
      compliantPolicies: complianceReport.filter((r) => r.compliant).length,
      nonCompliantPolicies: complianceReport.filter((r) => !r.compliant).length,
      policiesWithWarnings: complianceReport.filter((r) => r.warnings.length > 0).length,
      generatedAt: new Date().toISOString(),
      generatedBy: user.id,
      generatedByRole: user.role,
    }

    return NextResponse.json({
      summary,
      policies: complianceReport,
      legalReferences: {
        labourAct651: 'Labour Act, 2003 (Act 651), Section 57-60',
        pscConditions: 'Public Services Commission (PSC) Conditions of Service',
      },
    })
  } catch (error) {
    console.error('Error generating statutory compliance report:', error)
    return NextResponse.json(
      { error: 'Failed to generate compliance report' },
      { status: 500 }
    )
  }
}, { allowedRoles: AUDIT_ROLES })

