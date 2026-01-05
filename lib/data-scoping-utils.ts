/**
 * Data Scoping Utilities
 * 
 * Centralized functions for enforcing data access boundaries based on:
 * - User role
 * - Organizational unit
 * - Directorate
 * - Team relationships
 * 
 * These utilities ensure consistent data scoping across all API routes.
 */

import { prisma } from './prisma'
import { mapToMoFARole } from './roles/role-mapping'
import { PermissionChecks, type UserRole } from './roles/permissions'
import type { UserContext, StaffContext } from './types/common'

// Re-export for backward compatibility
export type { UserContext, StaffContext }

/**
 * Build WHERE clause for staff queries based on user role and context
 * This ensures data scoping is consistent across all API routes
 */
export async function buildStaffWhereClause(
  user: UserContext,
  additionalFilters?: Record<string, any>
): Promise<{ where: any; hasAccess: boolean }> {
  const normalizedRole = mapToMoFARole(user.role) as UserRole
  
  // Get user's staff record if staffId exists
  let userStaff: StaffContext | null = null
  if (user.staffId) {
    const staff = await prisma.staffMember.findUnique({
      where: { staffId: user.staffId },
      select: {
        staffId: true,
        unit: true,
        directorate: true,
        managerId: true,
        immediateSupervisorId: true,
      },
    })
    if (staff) {
      userStaff = staff
    }
  }
  
  const where: any = {
    active: true,
    ...additionalFilters,
  }
  
  // HR roles can view all
  if (PermissionChecks.canViewAllEmployees(normalizedRole)) {
    return { where, hasAccess: true }
  }
  
  // Employees can only view their own record
  if (normalizedRole === 'EMPLOYEE' || normalizedRole === 'employee') {
    if (user.staffId) {
      where.staffId = user.staffId
      return { where, hasAccess: true }
    }
    return { where: { staffId: '__NO_ACCESS__' }, hasAccess: false }
  }
  
  // Directors: Filter by directorate
  if (
    normalizedRole === 'DIRECTOR' ||
    normalizedRole === 'directorate_head' ||
    normalizedRole === 'deputy_director' ||
    normalizedRole === 'HEAD_OF_DEPARTMENT' ||
    normalizedRole === 'head_of_department' ||
    normalizedRole === 'hod'
  ) {
    if (userStaff?.directorate) {
      where.directorate = userStaff.directorate
      return { where, hasAccess: true }
    }
    return { where: { staffId: '__NO_ACCESS__' }, hasAccess: false }
  }
  
  // Unit Heads: Filter by unit
  if (normalizedRole === 'UNIT_HEAD' || normalizedRole === 'unit_head') {
    if (userStaff?.unit) {
      where.unit = userStaff.unit
      return { where, hasAccess: true }
    }
    return { where: { staffId: '__NO_ACCESS__' }, hasAccess: false }
  }
  
  // Supervisors: Filter by direct reports
  if (
    normalizedRole === 'SUPERVISOR' ||
    normalizedRole === 'supervisor' ||
    normalizedRole === 'manager'
  ) {
    if (user.staffId) {
      where.OR = [
        { managerId: user.staffId },
        { immediateSupervisorId: user.staffId },
      ]
      return { where, hasAccess: true }
    }
    return { where: { staffId: '__NO_ACCESS__' }, hasAccess: false }
  }
  
  // Head of Independent Unit: Filter by unit (independent units report to Chief Director)
  if (
    normalizedRole === 'HEAD_OF_INDEPENDENT_UNIT' ||
    normalizedRole === 'head_of_independent_unit'
  ) {
    if (userStaff?.unit) {
      where.unit = userStaff.unit
      return { where, hasAccess: true }
    }
    return { where: { staffId: '__NO_ACCESS__' }, hasAccess: false }
  }
  
  // Default: No access
  return { where: { staffId: '__NO_ACCESS__' }, hasAccess: false }
}

/**
 * Build WHERE clause for leave request queries based on user role and context
 */
export async function buildLeaveWhereClause(
  user: UserContext,
  additionalFilters?: Record<string, any>
): Promise<{ where: any; hasAccess: boolean }> {
  const normalizedRole = mapToMoFARole(user.role) as UserRole
  
  // Get user's staff record if staffId exists
  let userStaff: StaffContext | null = null
  if (user.staffId) {
    const staff = await prisma.staffMember.findUnique({
      where: { staffId: user.staffId },
      select: {
        staffId: true,
        unit: true,
        directorate: true,
        managerId: true,
        immediateSupervisorId: true,
      },
    })
    if (staff) {
      userStaff = staff
    }
  }
  
  const where: any = {
    ...additionalFilters,
  }
  
  // HR roles can view all
  if (PermissionChecks.canViewAllLeaves(normalizedRole)) {
    return { where, hasAccess: true }
  }
  
  // Employees can only view their own leave requests
  if (normalizedRole === 'EMPLOYEE' || normalizedRole === 'employee') {
    if (user.staffId) {
      where.staffId = user.staffId
      return { where, hasAccess: true }
    }
    return { where: { staffId: '__NO_ACCESS__' }, hasAccess: false }
  }
  
  // Directors: Filter by directorate
  if (
    normalizedRole === 'DIRECTOR' ||
    normalizedRole === 'directorate_head' ||
    normalizedRole === 'deputy_director' ||
    normalizedRole === 'HEAD_OF_DEPARTMENT' ||
    normalizedRole === 'head_of_department' ||
    normalizedRole === 'hod'
  ) {
    if (userStaff?.directorate) {
      // Get all staff in directorate
      const directorateStaff = await prisma.staffMember.findMany({
        where: { directorate: userStaff.directorate, active: true },
        select: { staffId: true },
      })
      const staffIds = directorateStaff.map(s => s.staffId)
      if (staffIds.length > 0) {
        where.staffId = { in: staffIds }
        return { where, hasAccess: true }
      }
    }
    return { where: { staffId: '__NO_ACCESS__' }, hasAccess: false }
  }
  
  // Unit Heads: Filter by unit
  if (normalizedRole === 'UNIT_HEAD' || normalizedRole === 'unit_head') {
    if (userStaff?.unit) {
      // Get all staff in unit
      const unitStaff = await prisma.staffMember.findMany({
        where: { unit: userStaff.unit, active: true },
        select: { staffId: true },
      })
      const staffIds = unitStaff.map(s => s.staffId)
      if (staffIds.length > 0) {
        where.staffId = { in: staffIds }
        return { where, hasAccess: true }
      }
    }
    return { where: { staffId: '__NO_ACCESS__' }, hasAccess: false }
  }
  
  // Supervisors: Filter by direct reports
  if (
    normalizedRole === 'SUPERVISOR' ||
    normalizedRole === 'supervisor' ||
    normalizedRole === 'manager'
  ) {
    if (user.staffId) {
      // Get direct reports
      const directReports = await prisma.staffMember.findMany({
        where: {
          OR: [
            { managerId: user.staffId },
            { immediateSupervisorId: user.staffId },
          ],
          active: true,
        },
        select: { staffId: true },
      })
      const staffIds = directReports.map(s => s.staffId)
      if (staffIds.length > 0) {
        where.staffId = { in: staffIds }
        return { where, hasAccess: true }
      }
      // No direct reports - return empty
      return { where: { staffId: '__NO_ACCESS__' }, hasAccess: false }
    }
    return { where: { staffId: '__NO_ACCESS__' }, hasAccess: false }
  }
  
  // Head of Independent Unit: Filter by unit
  if (
    normalizedRole === 'HEAD_OF_INDEPENDENT_UNIT' ||
    normalizedRole === 'head_of_independent_unit'
  ) {
    if (userStaff?.unit) {
      // Get all staff in independent unit
      const unitStaff = await prisma.staffMember.findMany({
        where: { unit: userStaff.unit, active: true },
        select: { staffId: true },
      })
      const staffIds = unitStaff.map(s => s.staffId)
      if (staffIds.length > 0) {
        where.staffId = { in: staffIds }
        return { where, hasAccess: true }
      }
    }
    return { where: { staffId: '__NO_ACCESS__' }, hasAccess: false }
  }
  
  // Default: No access
  return { where: { staffId: '__NO_ACCESS__' }, hasAccess: false }
}

/**
 * Verify that a user can access a specific staff member's data
 */
export async function canAccessStaffMember(
  user: UserContext,
  targetStaffId: string
): Promise<boolean> {
  const { where, hasAccess } = await buildStaffWhereClause(user)
  
  if (!hasAccess) {
    return false
  }
  
  // Check if target staff is in the allowed set
  const targetStaff = await prisma.staffMember.findUnique({
    where: { staffId: targetStaffId },
    select: { staffId: true, unit: true, directorate: true, managerId: true, immediateSupervisorId: true },
  })
  
  if (!targetStaff) {
    return false
  }
  
  // If where clause has staffId filter, check if it matches
  if (where.staffId) {
    return where.staffId === targetStaffId
  }
  
  // If where clause has unit filter, check if target is in same unit
  if (where.unit) {
    return targetStaff.unit === where.unit
  }
  
  // If where clause has directorate filter, check if target is in same directorate
  if (where.directorate) {
    return targetStaff.directorate === where.directorate
  }
  
  // If where clause has OR (for supervisors), check if target is a direct report
  if (where.OR) {
    return (
      targetStaff.managerId === user.staffId ||
      targetStaff.immediateSupervisorId === user.staffId
    )
  }
  
  // If no specific filter (HR roles), allow access
  return true
}

/**
 * Verify that a user can access a specific leave request
 */
export async function canAccessLeaveRequest(
  user: UserContext,
  leaveRequestId: string
): Promise<boolean> {
  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    select: { staffId: true },
  })
  
  if (!leaveRequest) {
    return false
  }
  
  return canAccessStaffMember(user, leaveRequest.staffId)
}

