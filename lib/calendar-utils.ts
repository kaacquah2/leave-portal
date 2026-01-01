/**
 * Calendar Utility Functions
 * Helper functions for calendar operations
 */

import { addDays, eachDayOfInterval, format, isWeekend, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'

export interface CalendarDate {
  date: string // ISO date string
  isWeekend: boolean
  isHoliday: boolean
  holidayName?: string
}

/**
 * Get all dates in a date range
 */
export function getDatesInRange(startDate: Date, endDate: Date): Date[] {
  return eachDayOfInterval({ start: startDate, end: endDate })
}

/**
 * Check if a date is a weekend
 */
export function isWeekendDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return isWeekend(dateObj)
}

/**
 * Get all weekend dates in a range
 */
export function getWeekendDates(startDate: Date, endDate: Date): string[] {
  const dates = getDatesInRange(startDate, endDate)
  return dates
    .filter(date => isWeekend(date))
    .map(date => format(date, 'yyyy-MM-dd'))
}

/**
 * Format date for calendar display
 */
export function formatCalendarDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'yyyy-MM-dd')
}

/**
 * Get month boundaries
 */
export function getMonthBoundaries(date: Date | string) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return {
    start: startOfMonth(dateObj),
    end: endOfMonth(dateObj),
  }
}

/**
 * Get week boundaries
 */
export function getWeekBoundaries(date: Date | string) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return {
    start: startOfWeek(dateObj, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(dateObj, { weekStartsOn: 1 }),
  }
}

/**
 * Check if a date falls within a leave period
 */
export function isDateInLeavePeriod(date: Date | string, startDate: Date | string, endDate: Date | string): boolean {
  const checkDate = typeof date === 'string' ? parseISO(date) : date
  const leaveStart = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const leaveEnd = typeof endDate === 'string' ? parseISO(endDate) : endDate
  
  return checkDate >= leaveStart && checkDate <= leaveEnd
}

/**
 * Get leave type color (for calendar display)
 */
export function getLeaveTypeColor(leaveType: string): string {
  const colors: Record<string, string> = {
    'Annual': '#3b82f6', // Blue
    'Sick': '#ef4444', // Red
    'Unpaid': '#6b7280', // Gray
    'Special Service': '#8b5cf6', // Purple
    'Training': '#10b981', // Green
    'Study': '#f59e0b', // Amber
    'Maternity': '#ec4899', // Pink
    'Paternity': '#06b6d4', // Cyan
    'Compassionate': '#dc2626', // Dark Red
  }
  
  return colors[leaveType] || '#6b7280' // Default gray
}

/**
 * Get conflict level color
 */
export function getConflictLevelColor(level: 'low' | 'medium' | 'high' | 'critical'): string {
  const colors = {
    'low': '#10b981', // Green
    'medium': '#f59e0b', // Amber
    'high': '#f97316', // Orange
    'critical': '#ef4444', // Red
  }
  
  return colors[level] || '#6b7280'
}

/**
 * Calculate number of working days (excluding weekends and holidays)
 */
export function calculateWorkingDays(
  startDate: Date | string,
  endDate: Date | string,
  holidays: Array<{ date: string }> = []
): number {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate
  const dates = getDatesInRange(start, end)
  
  const holidayDates = new Set(holidays.map(h => formatCalendarDate(h.date)))
  
  return dates.filter(date => {
    const dateStr = formatCalendarDate(date)
    return !isWeekend(date) && !holidayDates.has(dateStr)
  }).length
}

