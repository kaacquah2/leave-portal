/**
 * Compliance Report API
 * 
 * Ghana Government Compliance: Comprehensive compliance reporting for state institution
 * Provides compliance metrics and audit-ready reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { AUDIT_ROLES } from '@/lib/role-utils'
import { mapToMoFARole } from '@/lib/role-mapping'
import { getRoleComplianceRestrictions, validateCompliance } from '@/lib/compliance-utils'

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
/**
 * GET - Get comprehensive compliance report
 * 
 * Returns:
 * - Role-based access compliance
 * - Separation of duties compliance
 * - Audit trail completeness
 * - Data protection compliance
 */
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const normalizedRole = mapToMoFARole(user.role)
    
    // Only auditors and system admins can access compliance reports
    if (!AUDIT_ROLES.includes(normalizedRole)) {
      return NextResponse.json(
        { error: 'Forbidden - Only auditors and system administrators can access compliance reports' },
        { status: 403 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'full'
    
    // Get all users for role compliance check
    const users = await prisma.user.findMany({
      where: { active: true },
      select: {
        id: true,
        email: true,
        role: true,
        staffId: true,
      },
    })
    
    // Check role compliance
    const roleCompliance = users.map((u) => {
      const role = mapToMoFARole(u.role)
      const restrictions = getRoleComplianceRestrictions(role)
      
      return {
        userId: u.id,
        email: u.email,
        role: u.role,
        normalizedRole: role,
        complianceStatus: {
          canApproveLeave: restrictions.canApproveLeave,
          canEditStaff: restrictions.canEditStaff,
          canDeleteStaff: restrictions.canDeleteStaff,
          canCreateStaff: restrictions.canCreateStaff,
          canManagePolicies: restrictions.canManagePolicies,
          canProcessPayroll: restrictions.canProcessPayroll,
          canApprovePayroll: restrictions.canApprovePayroll,
          isReadOnly: restrictions.isReadOnly,
        },
        violations: [
          ...(role === 'SYSTEM_ADMIN' && restrictions.canApproveLeave ? ['SYSTEM_ADMIN_CAN_APPROVE_LEAVE'] : []),
          ...(role === 'SYSTEM_ADMIN' && restrictions.canEditStaff ? ['SYSTEM_ADMIN_CAN_EDIT_STAFF'] : []),
        ],
      }
    })
    
    // Get audit log statistics
    const auditLogStats = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: {
        action: true,
      },
      where: {
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    })
    
    // Get data access log statistics
    const dataAccessStats = await prisma.dataAccessLog.groupBy({
      by: ['action'],
      _count: {
        action: true,
      },
      where: {
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    })
    
    // Calculate compliance metrics
    const complianceMetrics = {
      totalUsers: users.length,
      roleCompliance: {
        compliant: roleCompliance.filter((r) => r.violations.length === 0).length,
        violations: roleCompliance.filter((r) => r.violations.length > 0).length,
        violationsByType: roleCompliance.reduce((acc, r) => {
          r.violations.forEach((v) => {
            acc[v] = (acc[v] || 0) + 1
          })
          return acc
        }, {} as Record<string, number>),
      },
      auditTrail: {
        totalLogs: auditLogStats.reduce((sum, stat) => sum + stat._count.action, 0),
        actionsTracked: auditLogStats.length,
        recentActivity: auditLogStats,
      },
      dataProtection: {
        totalAccessLogs: dataAccessStats.reduce((sum, stat) => sum + stat._count.action, 0),
        accessTypesTracked: dataAccessStats.length,
        recentAccess: dataAccessStats,
      },
      separationOfDuties: {
        systemAdminsWithApprovalAccess: roleCompliance.filter(
          (r) => r.normalizedRole === 'SYSTEM_ADMIN' && r.complianceStatus.canApproveLeave
        ).length,
        systemAdminsWithEditAccess: roleCompliance.filter(
          (r) => r.normalizedRole === 'SYSTEM_ADMIN' && r.complianceStatus.canEditStaff
        ).length,
      },
    }
    
    // Generate compliance report
    const report = {
      reportType,
      generatedAt: new Date().toISOString(),
      generatedBy: user.email,
      generatedByRole: user.role,
      complianceMetrics,
      roleCompliance: reportType === 'full' ? roleCompliance : undefined,
      recommendations: [
        ...(complianceMetrics.separationOfDuties.systemAdminsWithApprovalAccess > 0
          ? ['Review SYSTEM_ADMIN roles - they should not have leave approval access']
          : []),
        ...(complianceMetrics.separationOfDuties.systemAdminsWithEditAccess > 0
          ? ['Review SYSTEM_ADMIN roles - they should not have staff edit access']
          : []),
      ],
    }
    
    return NextResponse.json(report)
  } catch (error) {
    console.error('Error generating compliance report:', error)
    return NextResponse.json(
      { error: 'Failed to generate compliance report' },
      { status: 500 }
    )
  }
}, {
  allowedRoles: AUDIT_ROLES,
})

