/**
 * Acting Appointment Resolver
 * 
 * Resolves approvers considering acting appointments, delegations, and fallbacks
 * Implements PSC requirement for formal acting appointment support
 */

import { prisma } from '@/lib/prisma'

export interface ResolvedApprover {
  userId: string
  staffId: string
  name: string
  role: string
  source: 'assigned' | 'acting' | 'delegation' | 'role-based'
}

/**
 * Resolve approver with fallback logic:
 * 1. Check assigned approver
 * 2. Check acting appointment
 * 3. Check delegation
 * 4. Check role-based approver
 * 5. Return null if no approver found (triggers escalation)
 */
export async function resolveApprover(
  role: string,
  staffId: string,
  unit?: string
): Promise<ResolvedApprover | null> {
  try {
    // 1. Check assigned approver (from approval step)
    // This is handled at the workflow level

    // 2. Check acting appointment
    const actingAppointment = await prisma.actingAppointment.findFirst({
      where: {
        role: role.toUpperCase(),
        effectiveDate: { lte: new Date() },
        endDate: { gte: new Date() },
        staff: {
          active: true,
          employmentStatus: 'active',
        },
      },
      include: {
        staff: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { effectiveDate: 'desc' },
    })

    if (actingAppointment?.staff?.user) {
      return {
        userId: actingAppointment.staff.user.id,
        staffId: actingAppointment.staff.staffId,
        name: `${actingAppointment.staff.firstName} ${actingAppointment.staff.lastName}`,
        role: actingAppointment.role,
        source: 'acting',
      }
    }

    // 3. Check delegation
    // Note: We need to find delegations where the delegator has the required role
    // This requires checking the delegator's user record
    const delegations = await prisma.approvalDelegation.findMany({
      where: {
        status: 'active',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: {
        delegator: {
          include: {
            user: true,
          },
        },
        delegatee: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    })

    // Find delegation where delegator has the required role
    const delegation = delegations.find(d => 
      d.delegator.user?.role.toUpperCase() === role.toUpperCase()
    )

    if (delegation?.delegatee?.user) {
      return {
        userId: delegation.delegatee.user.id,
        staffId: delegation.delegatee.staffId,
        name: `${delegation.delegatee.firstName} ${delegation.delegatee.lastName}`,
        role: role,
        source: 'delegation',
      }
    }

    // 4. Check role-based approver (find user with matching role in same unit/directorate)
    const roleBasedApprover = await prisma.user.findFirst({
      where: {
        role: role.toUpperCase(),
        active: true,
        staff: {
          active: true,
          employmentStatus: 'active',
          ...(unit ? { unit } : {}),
        },
      },
      include: {
        staff: true,
      },
    })

    if (roleBasedApprover?.staff) {
      return {
        userId: roleBasedApprover.id,
        staffId: roleBasedApprover.staff.staffId,
        name: `${roleBasedApprover.staff.firstName} ${roleBasedApprover.staff.lastName}`,
        role: role,
        source: 'role-based',
      }
    }

    // 5. No approver found - return null (triggers escalation)
    return null
  } catch (error) {
    console.error('[ActingAppointment] Error resolving approver:', error)
    return null
  }
}

/**
 * Get active acting appointment for a role
 */
export async function getActiveActingAppointment(
  role: string,
  unit?: string
): Promise<any | null> {
  return await prisma.actingAppointment.findFirst({
    where: {
      role: role.toUpperCase(),
      effectiveDate: { lte: new Date() },
      endDate: { gte: new Date() },
      staff: {
        active: true,
        employmentStatus: 'active',
        ...(unit ? { unit } : {}),
      },
    },
    include: {
      staff: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { effectiveDate: 'desc' },
  })
}

