/**
 * Conflict Detection Utilities
 * Detects leave conflicts based on thresholds
 */

export type ConflictLevel = 'low' | 'medium' | 'high' | 'critical'

export interface ConflictThreshold {
  low: number // Percentage threshold for low conflict
  medium: number // Percentage threshold for medium conflict
  high: number // Percentage threshold for high conflict
  critical: number // Percentage threshold for critical conflict
}

export interface Conflict {
  date: string
  department?: string
  unit?: string
  totalStaff: number
  staffOnLeave: number
  percentage: number
  level: ConflictLevel
  staffOnLeaveList: Array<{
    staffId: string
    staffName: string
    position: string
    leaveType: string
  }>
}

/**
 * Default conflict thresholds
 */
export const DEFAULT_THRESHOLDS: ConflictThreshold = {
  low: 20, // < 20% on leave = low
  medium: 30, // 20-30% on leave = medium
  high: 50, // 30-50% on leave = high
  critical: 50, // > 50% on leave = critical
}

/**
 * Determine conflict level based on percentage
 */
export function getConflictLevel(percentage: number, thresholds: ConflictThreshold = DEFAULT_THRESHOLDS): ConflictLevel {
  if (percentage >= thresholds.critical) {
    return 'critical'
  } else if (percentage >= thresholds.high) {
    return 'high'
  } else if (percentage >= thresholds.medium) {
    return 'medium'
  } else {
    return 'low'
  }
}

/**
 * Calculate conflicts for a date range
 */
export function calculateConflicts(
  dateRange: Array<string>,
  staffOnLeaveByDate: Map<string, Array<{
    staffId: string
    staffName: string
    position: string
    leaveType: string
    department?: string
    unit?: string
  }>>,
  totalStaffByScope: Map<string, number>, // Key: 'all' | 'department:name' | 'unit:name'
  scope?: { department?: string; unit?: string },
  thresholds: ConflictThreshold = DEFAULT_THRESHOLDS
): Conflict[] {
  const conflicts: Conflict[] = []
  
  // Determine scope key
  const scopeKey = scope?.unit ? `unit:${scope.unit}` : scope?.department ? `department:${scope.department}` : 'all'
  const totalStaff = totalStaffByScope.get(scopeKey) || 0
  
  if (totalStaff === 0) {
    return conflicts
  }
  
  for (const date of dateRange) {
    const staffOnLeave = staffOnLeaveByDate.get(date) || []
    
    // Filter by scope if specified
    let filteredStaff = staffOnLeave
    if (scope?.department) {
      filteredStaff = staffOnLeave.filter(s => s.department === scope.department)
    }
    if (scope?.unit) {
      filteredStaff = filteredStaff.filter(s => s.unit === scope.unit)
    }
    
    const staffOnLeaveCount = filteredStaff.length
    const percentage = totalStaff > 0 ? (staffOnLeaveCount / totalStaff) * 100 : 0
    const level = getConflictLevel(percentage, thresholds)
    
    // Only include conflicts that are medium or higher
    if (level !== 'low') {
      conflicts.push({
        date,
        department: scope?.department,
        unit: scope?.unit,
        totalStaff,
        staffOnLeave: staffOnLeaveCount,
        percentage: Math.round(percentage * 100) / 100,
        level,
        staffOnLeaveList: filteredStaff.map(s => ({
          staffId: s.staffId,
          staffName: s.staffName,
          position: s.position,
          leaveType: s.leaveType,
        })),
      })
    }
  }
  
  return conflicts
}

/**
 * Group conflicts by date
 */
export function groupConflictsByDate(conflicts: Conflict[]): Map<string, Conflict[]> {
  const grouped = new Map<string, Conflict[]>()
  
  for (const conflict of conflicts) {
    const existing = grouped.get(conflict.date) || []
    existing.push(conflict)
    grouped.set(conflict.date, existing)
  }
  
  return grouped
}

/**
 * Get most critical conflicts
 */
export function getMostCriticalConflicts(conflicts: Conflict[], limit: number = 10): Conflict[] {
  const sorted = [...conflicts].sort((a, b) => {
    const levelOrder: Record<ConflictLevel, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    }
    
    if (levelOrder[b.level] !== levelOrder[a.level]) {
      return levelOrder[b.level] - levelOrder[a.level]
    }
    
    return b.percentage - a.percentage
  })
  
  return sorted.slice(0, limit)
}

