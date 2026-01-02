/**
 * Staff Record Versioning
 * 
 * Creates immutable snapshots of staff data at audit-critical events
 * Supports historical queries for compliance and audit purposes
 */

import { prisma } from '@/lib/prisma'

export interface StaffSnapshot {
  staffId: string
  grade: string
  rank: string | null
  position: string
  step: string | null
  department: string
  directorate: string | null
  unit: string | null
  salaryStep?: string | null
}

/**
 * Create history entry for a field change
 */
export async function createStaffHistoryEntry(
  staffId: string,
  fieldName: string,
  oldValue: string | null,
  newValue: string,
  changedBy: string,
  changeReason?: string
): Promise<void> {
  try {
    const staff = await prisma.staffMember.findUnique({
      where: { staffId },
    })

    if (!staff) {
      throw new Error(`Staff member ${staffId} not found`)
    }

    // Get current effective date
    const effectiveFrom = new Date()

    // End previous history entry for this field if exists
    const previousHistory = await prisma.staffHistory.findFirst({
      where: {
        staffId,
        fieldName,
        effectiveTo: null,
      },
      orderBy: { effectiveFrom: 'desc' },
    })

    if (previousHistory) {
      await prisma.staffHistory.update({
        where: { id: previousHistory.id },
        data: { effectiveTo: effectiveFrom },
      })
    }

    // Create new history entry
    await prisma.staffHistory.create({
      data: {
        staffId,
        fieldName,
        oldValue,
        newValue,
        effectiveFrom,
        changedBy,
        changeReason,
      },
    })
  } catch (error) {
    console.error('[StaffVersioning] Error creating history entry:', error)
    throw error
  }
}

/**
 * Create snapshot at audit-critical event (e.g., leave approval)
 */
export async function createStaffSnapshot(
  staffId: string,
  snapshotAt: Date,
  eventType: 'leave_approval' | 'performance_review' | 'promotion' | 'other',
  eventId: string
): Promise<void> {
  try {
    const staff = await prisma.staffMember.findUnique({
      where: { staffId },
    })

    if (!staff) {
      throw new Error(`Staff member ${staffId} not found`)
    }

    // Fields to snapshot
    const fieldsToSnapshot = [
      'grade',
      'rank',
      'position',
      'step',
      'department',
      'directorate',
      'unit',
    ]

    for (const fieldName of fieldsToSnapshot) {
      const value = (staff as any)[fieldName] || null

      await prisma.staffHistory.create({
        data: {
          staffId,
          fieldName,
          oldValue: null, // Snapshot, not a change
          newValue: value || '',
          effectiveFrom: snapshotAt,
          snapshotAt,
          changedBy: 'system',
          changeReason: `Snapshot at ${eventType} (${eventId})`,
        },
      })
    }
  } catch (error) {
    console.error('[StaffVersioning] Error creating snapshot:', error)
    throw error
  }
}

/**
 * Get staff data at a specific point in time
 */
export async function getStaffDataAtTime(
  staffId: string,
  atTime: Date
): Promise<StaffSnapshot | null> {
  try {
    const staff = await prisma.staffMember.findUnique({
      where: { staffId },
    })

    if (!staff) return null

    // Get history entries that were effective at the specified time
    const historyEntries = await prisma.staffHistory.findMany({
      where: {
        staffId,
        effectiveFrom: { lte: atTime },
        OR: [
          { effectiveTo: { gte: atTime } },
          { effectiveTo: null },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    })

    // Build snapshot from history
    const snapshot: Partial<StaffSnapshot> = {
      staffId,
      grade: staff.grade,
      rank: staff.rank,
      position: staff.position,
      step: staff.step,
      department: staff.department,
      directorate: staff.directorate,
      unit: staff.unit,
    }

    // Override with historical values if available
    for (const entry of historyEntries) {
      if (entry.snapshotAt && entry.snapshotAt <= atTime) {
        // Use snapshot value
        ;(snapshot as any)[entry.fieldName] = entry.newValue
      } else if (entry.effectiveFrom <= atTime && (!entry.effectiveTo || entry.effectiveTo >= atTime)) {
        // Use historical value
        ;(snapshot as any)[entry.fieldName] = entry.newValue
      }
    }

    return snapshot as StaffSnapshot
  } catch (error) {
    console.error('[StaffVersioning] Error getting staff data at time:', error)
    return null
  }
}

/**
 * Get all history entries for a staff member
 */
export async function getStaffHistory(staffId: string) {
  return await prisma.staffHistory.findMany({
    where: { staffId },
    orderBy: { effectiveFrom: 'desc' },
  })
}

