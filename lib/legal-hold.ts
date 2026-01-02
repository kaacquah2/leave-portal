/**
 * Legal Hold Enforcement
 * 
 * Prevents deletion/modification of records during investigations
 * Extends retention period automatically
 */

import { prisma } from '@/lib/prisma'

/**
 * Check if a staff member has an active legal hold
 */
export async function hasLegalHold(staffId: string): Promise<boolean> {
  const legalHold = await prisma.legalHold.findFirst({
    where: {
      AND: [
        {
          OR: [
            { staffId },
            { staffId: null }, // Applies to all staff
          ],
        },
        {
          status: 'active',
        },
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } },
          ],
        },
      ],
    },
  })

  return !!legalHold
}

/**
 * Check if a leave request has an active legal hold
 */
export async function hasLeaveRequestLegalHold(leaveRequestId: string): Promise<boolean> {
  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    select: { staffId: true },
  })

  if (!leaveRequest) return false

  // Check staff-level hold
  if (await hasLegalHold(leaveRequest.staffId)) {
    return true
  }

  // Check leave request-specific hold
  const legalHold = await prisma.legalHold.findFirst({
    where: {
      AND: [
        {
          OR: [
            { leaveRequestId },
            { leaveRequestId: null }, // Applies to all leave requests
          ],
        },
        {
          status: 'active',
        },
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } },
          ],
        },
      ],
    },
  })

  return !!legalHold
}

/**
 * Place legal hold
 */
export async function placeLegalHold(data: {
  staffId?: string
  leaveRequestId?: string
  reason: string
  placedBy: string
  expiresAt?: Date
}): Promise<void> {
  // Verify user has permission (HR_DIRECTOR or CHIEF_DIRECTOR)
  const user = await prisma.user.findUnique({
    where: { id: data.placedBy },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const role = user.role.toUpperCase()
  if (role !== 'HR_DIRECTOR' && role !== 'CHIEF_DIRECTOR') {
    throw new Error('Only HR Director or Chief Director can place legal holds')
  }

  await prisma.legalHold.create({
    data: {
      staffId: data.staffId || null,
      leaveRequestId: data.leaveRequestId || null,
      reason: data.reason,
      placedBy: data.placedBy,
      expiresAt: data.expiresAt,
      status: 'active',
    },
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: 'legal_hold_placed',
      user: data.placedBy,
      userRole: role,
      staffId: data.staffId || undefined,
      leaveRequestId: data.leaveRequestId || undefined,
      details: `Legal hold placed: ${data.reason}`,
      metadata: {
        expiresAt: data.expiresAt,
      },
    },
  })
}

/**
 * Release legal hold
 */
export async function releaseLegalHold(
  legalHoldId: string,
  releasedBy: string
): Promise<void> {
  const legalHold = await prisma.legalHold.findUnique({
    where: { id: legalHoldId },
  })

  if (!legalHold) {
    throw new Error('Legal hold not found')
  }

  // Verify user has permission
  const user = await prisma.user.findUnique({
    where: { id: releasedBy },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const role = user.role.toUpperCase()
  if (role !== 'HR_DIRECTOR' && role !== 'CHIEF_DIRECTOR') {
    throw new Error('Only HR Director or Chief Director can release legal holds')
  }

  await prisma.legalHold.update({
    where: { id: legalHoldId },
    data: {
      status: 'released',
      releasedBy,
      releasedAt: new Date(),
    },
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: 'legal_hold_released',
      user: releasedBy,
      userRole: role,
      staffId: legalHold.staffId || undefined,
      leaveRequestId: legalHold.leaveRequestId || undefined,
      details: 'Legal hold released',
    },
  })
}

