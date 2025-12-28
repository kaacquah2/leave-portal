/**
 * Leave Calculation Utilities
 * Handles day calculation with holiday exclusion
 */

import { prisma } from './prisma'

/**
 * Calculate leave days excluding holidays
 */
export async function calculateLeaveDays(
  startDate: Date,
  endDate: Date,
  excludeHolidays: boolean = true
): Promise<{ totalDays: number; workingDays: number; holidays: number }> {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // Set to start of day
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  
  let totalDays = 0
  let holidays = 0
  const currentDate = new Date(start)
  
  // Get holidays for the date range
  let holidayDates: Date[] = []
  if (excludeHolidays) {
    const year = start.getFullYear()
    const holidaysData = await prisma.holiday.findMany({
      where: {
        OR: [
          { recurring: true },
          { year: year },
        ],
      },
    })
    
    holidayDates = holidaysData.map(h => {
      const holidayDate = new Date(h.date)
      // If recurring, use the date from the holiday record but set to current year
      if (h.recurring) {
        holidayDate.setFullYear(year)
      }
      holidayDate.setHours(0, 0, 0, 0)
      return holidayDate
    })
  }
  
  // Count days including start and end
  while (currentDate <= end) {
    totalDays++
    
    // Check if current date is a holiday
    const isHoliday = holidayDates.some(h => {
      return h.getTime() === currentDate.getTime()
    })
    
    if (isHoliday) {
      holidays++
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  const workingDays = excludeHolidays ? totalDays - holidays : totalDays
  
  return {
    totalDays,
    workingDays,
    holidays,
  }
}

/**
 * Check if a date range includes holidays
 */
export async function getHolidaysInRange(
  startDate: Date,
  endDate: Date
): Promise<Array<{ name: string; date: Date; type: string }>> {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  
  const year = start.getFullYear()
  const holidaysData = await prisma.holiday.findMany({
    where: {
      OR: [
        { recurring: true },
        { year: year },
      ],
      date: {
        gte: start,
        lte: end,
      },
    },
  })
  
  return holidaysData.map(h => ({
    name: h.name,
    date: h.date,
    type: h.type,
  }))
}

