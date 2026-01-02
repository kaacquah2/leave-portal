/**
 * Access Review API
 * 
 * Ghana Government Compliance: Regular access reviews for state institution requirements
 * Allows auditors and security admins to review user access and permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { AUDIT_ROLES } from '@/lib/role-utils'
import { mapToMoFARole } from '@/lib/role-mapping'
import { getRoleComplianceRestrictions } from '@/lib/compliance-utils'

/**
 * GET - Get access review report
 * 
 * Returns:
 * - All users with their roles and permissions
 * - Compliance restrictions for each role
 * - Access patterns and anomalies
 */
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const normalizedRole = mapToMoFARole(user.role)
    
    // Only auditors and security admins can access review reports
    if (!AUDIT_ROLES.includes(normalizedRole)) {
      return NextResponse.json(
        { error: 'Forbidden - Only auditors and security administrators can access review reports' },
        { status: 403 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const roleFilter = searchParams.get('role')
    const includeInactive = searchParams.get('includeInactive') === 'true'
    
    // Get all users with their roles
    const users = await prisma.user.findMany({
      where: {
        ...(roleFilter && { role: roleFilter }),
        ...(includeInactive ? {} : { active: true }),
      },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        staffId: true,
        createdAt: true,
        lastLogin: true,
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            unit: true,
            directorate: true,
            dutyStation: true,
            employmentStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    
    // Get access review data
    const accessReview = users.map((u) => {
      const role = mapToMoFARole(u.role)
      const restrictions = getRoleComplianceRestrictions(role)
      
      return {
        userId: u.id,
        email: u.email,
        role: u.role,
        normalizedRole: role,
        active: u.active,
        staffId: u.staffId,
        staffName: u.staff ? `${u.staff.firstName} ${u.staff.lastName}` : null,
        unit: u.staff?.unit || null,
        directorate: u.staff?.directorate || null,
        dutyStation: u.staff?.dutyStation || null,
        employmentStatus: u.staff?.employmentStatus || null,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        complianceRestrictions: restrictions,
        // Flag potential compliance issues
        complianceFlags: {
          canApproveLeaveButShouldNot: !restrictions.canApproveLeave && (role === 'SYSTEM_ADMIN' || role === 'SECURITY_ADMIN'),
          canEditStaffButShouldNot: !restrictions.canEditStaff && (role === 'SYSTEM_ADMIN' || role === 'SECURITY_ADMIN'),
          inactiveUserWithActiveRole: !u.active && u.role,
          staffTerminatedButUserActive: u.staff?.employmentStatus !== 'active' && u.active,
        },
      }
    })
    
    // Calculate summary statistics
    const summary = {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.active).length,
      inactiveUsers: users.filter((u) => !u.active).length,
      byRole: users.reduce((acc, u) => {
        const role = mapToMoFARole(u.role)
        acc[role] = (acc[role] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      complianceIssues: {
        systemAdminsWithApprovalAccess: accessReview.filter(
          (a) => a.complianceFlags.canApproveLeaveButShouldNot
        ).length,
        systemAdminsWithEditAccess: accessReview.filter(
          (a) => a.complianceFlags.canEditStaffButShouldNot
        ).length,
        inactiveUsersWithRoles: accessReview.filter(
          (a) => a.complianceFlags.inactiveUserWithActiveRole
        ).length,
        terminatedStaffWithActiveUsers: accessReview.filter(
          (a) => a.complianceFlags.staffTerminatedButUserActive
        ).length,
      },
    }
    
    return NextResponse.json({
      summary,
      accessReview,
      generatedAt: new Date().toISOString(),
      generatedBy: user.email,
      generatedByRole: user.role,
    })
  } catch (error) {
    console.error('Error generating access review:', error)
    return NextResponse.json(
      { error: 'Failed to generate access review' },
      { status: 500 }
    )
  }
}, {
  allowedRoles: AUDIT_ROLES,
})

