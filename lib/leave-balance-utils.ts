/**
 * Leave Balance Utility Functions
 * Handles balance field mapping, deduction, restoration, and validation
 * Implements optimistic locking to prevent concurrent modification conflicts
 */

import { prisma } from './prisma'
import { updateLeaveBalanceWithLock } from './optimistic-locking'

import type { LeaveBalance } from '@prisma/client'

/**
 * Get the balance field name for a leave type
 */
export function getBalanceFieldName(leaveType: string): keyof LeaveBalance | null {
  const fieldMap: Record<string, keyof LeaveBalance> = {
    'Annual': 'annual',
    'Sick': 'sick',
    'Unpaid': 'unpaid',
    'Special Service': 'specialService',
    'Training': 'training',
    'Study': 'study',
    'Maternity': 'maternity',
    'Paternity': 'paternity',
    'Compassionate': 'compassionate',
  }
  
  return fieldMap[leaveType] || null
}

/**
 * Get current leave balance for a staff member and leave type
 */
export async function getLeaveBalance(
  staffId: string,
  leaveType: string
): Promise<number> {
  const balance = await prisma.leaveBalance.findUnique({
    where: { staffId },
  })
  
  if (!balance) return 0
  
  const fieldName = getBalanceFieldName(leaveType)
  if (!fieldName) return 0
  
  return (balance[fieldName as keyof LeaveBalance] as number) || 0
}

/**
 * Validate if staff has sufficient leave balance
 */
export async function validateLeaveBalance(
  staffId: string,
  leaveType: string,
  requestedDays: number
): Promise<{ valid: boolean; currentBalance: number; error?: string }> {
  // Unpaid leave doesn't require balance
  if (leaveType === 'Unpaid') {
    return { valid: true, currentBalance: 0 }
  }
  
  const currentBalance = await getLeaveBalance(staffId, leaveType)
  
  if (currentBalance < requestedDays) {
    return {
      valid: false,
      currentBalance,
      error: `Insufficient ${leaveType} leave balance. Available: ${currentBalance} days, Requested: ${requestedDays} days`,
    }
  }
  
  return { valid: true, currentBalance }
}

/**
 * Deduct leave balance when leave is approved
 */
export async function deductLeaveBalance(
  staffId: string,
  leaveType: string,
  days: number
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  // Unpaid leave doesn't deduct balance
  if (leaveType === 'Unpaid') {
    return { success: true, newBalance: 0 }
  }
  
  const fieldName = getBalanceFieldName(leaveType)
  if (!fieldName) {
    return { success: false, newBalance: 0, error: `Invalid leave type: ${leaveType}` }
  }
  
  try {
    // Use optimistic locking to prevent concurrent modification conflicts
    const result = await updateLeaveBalanceWithLock(
      staffId,
      async (version, balance) => {
        const currentBalance = (balance[fieldName as keyof LeaveBalance] as number) || 0
        
        if (currentBalance < days) {
          throw new Error(`Insufficient balance: ${currentBalance} < ${days}`)
        }
        
        const newBalance = currentBalance - days
        
        // Update balance (version will be incremented by updateLeaveBalanceWithLock)
        await prisma.leaveBalance.update({
          where: { staffId },
          data: {
            [fieldName]: newBalance,
          },
        })
        
        // Create accrual history record for deduction
        await prisma.leaveAccrualHistory.create({
          data: {
            staffId,
            leaveType,
            accrualDate: new Date(),
            accrualPeriod: 'deduction',
            daysAccrued: -days, // Negative for deduction
            daysBefore: currentBalance,
            daysAfter: newBalance,
            notes: `Balance deducted for approved leave request`,
            processedBy: 'system',
          },
        })
        
        return { newBalance, previousBalance: currentBalance }
      },
      { maxRetries: 3, retryDelay: 100, exponentialBackoff: true }
    )
    
    if (!result.success) {
      return {
        success: false,
        newBalance: 0,
        error: result.error || 'Failed to deduct balance',
      }
    }
    
    return { success: true, newBalance: result.data?.newBalance || 0 }
  } catch (error: any) {
    return { success: false, newBalance: 0, error: error.message }
  }
}

/**
 * Restore leave balance when leave is cancelled or rejected
 */
export async function restoreLeaveBalance(
  staffId: string,
  leaveType: string,
  days: number
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  // Unpaid leave doesn't restore balance
  if (leaveType === 'Unpaid') {
    return { success: true, newBalance: 0 }
  }
  
  const fieldName = getBalanceFieldName(leaveType)
  if (!fieldName) {
    return { success: false, newBalance: 0, error: `Invalid leave type: ${leaveType}` }
  }
  
  try {
    // Use optimistic locking to prevent concurrent modification conflicts
    const balance = await prisma.leaveBalance.findUnique({
      where: { staffId },
    })
    
    if (!balance) {
      // Create balance if it doesn't exist (no locking needed for new records)
      const newBalance = await prisma.leaveBalance.create({
        data: {
          staffId,
          [fieldName]: days,
          version: 0,
        },
      })
      
      // Create accrual history record
      await prisma.leaveAccrualHistory.create({
        data: {
          staffId,
          leaveType,
          accrualDate: new Date(),
          accrualPeriod: 'restoration',
          daysAccrued: days,
          daysBefore: 0,
          daysAfter: days,
          notes: `Balance restored for cancelled/rejected leave request`,
          processedBy: 'system',
        },
      })
      
      return { success: true, newBalance: days }
    }
    
    // Use optimistic locking for existing balance
    const result = await updateLeaveBalanceWithLock(
      staffId,
      async (version, currentBalance) => {
        const balanceValue = (currentBalance[fieldName as keyof LeaveBalance] as number) || 0
        const newBalance = balanceValue + days
        
        // Update balance (version will be incremented by updateLeaveBalanceWithLock)
        await prisma.leaveBalance.update({
          where: { staffId },
          data: {
            [fieldName]: newBalance,
          },
        })
        
        // Create accrual history record
        await prisma.leaveAccrualHistory.create({
          data: {
            staffId,
            leaveType,
            accrualDate: new Date(),
            accrualPeriod: 'restoration',
            daysAccrued: days,
            daysBefore: balanceValue,
            daysAfter: newBalance,
            notes: `Balance restored for cancelled/rejected leave request`,
            processedBy: 'system',
          },
        })
        
        return { newBalance, previousBalance: balanceValue }
      },
      { maxRetries: 3, retryDelay: 100, exponentialBackoff: true }
    )
    
    if (!result.success) {
      return {
        success: false,
        newBalance: 0,
        error: result.error || 'Failed to restore balance',
      }
    }
    
    return { success: true, newBalance: result.data?.newBalance || 0 }
  } catch (error: any) {
    return { success: false, newBalance: 0, error: error.message }
  }
}

/**
 * Check for overlapping leave requests
 */
export async function checkOverlappingLeaves(
  staffId: string,
  startDate: Date,
  endDate: Date,
  excludeLeaveId?: string
): Promise<{ hasOverlap: boolean; overlappingLeaves: any[] }> {
  const overlappingLeaves = await prisma.leaveRequest.findMany({
    where: {
      staffId,
      id: excludeLeaveId ? { not: excludeLeaveId } : undefined,
      status: {
        in: ['pending', 'approved'], // Only check pending and approved
      },
      OR: [
        // Leave starts during existing leave
        {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      ],
    },
  })
  
  return {
    hasOverlap: overlappingLeaves.length > 0,
    overlappingLeaves,
  }
}

