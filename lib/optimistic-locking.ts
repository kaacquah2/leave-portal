/**
 * Optimistic Locking Utilities
 * Implements version-based optimistic locking to prevent concurrent modification conflicts
 * Used for LeaveRequest and LeaveBalance updates
 */

import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

export interface OptimisticLockResult<T> {
  success: boolean
  data?: T
  error?: string
  conflict?: boolean
  retryable?: boolean
}

export interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  exponentialBackoff?: boolean
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 100, // milliseconds
  exponentialBackoff: true,
}

/**
 * Execute a function with optimistic locking and automatic retry
 */
export async function withOptimisticLock<T>(
  operation: (version: number) => Promise<T>,
  getCurrentVersion: () => Promise<number | null>,
  options: RetryOptions = {}
): Promise<OptimisticLockResult<T>> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Get current version
      const currentVersion = await getCurrentVersion()
      if (currentVersion === null) {
        return {
          success: false,
          error: 'Record not found',
          retryable: false,
        }
      }

      // Execute operation with current version
      const result = await operation(currentVersion)

      return {
        success: true,
        data: result,
      }
    } catch (error: any) {
      lastError = error

      // Check if it's a version conflict
      const isConflict = error.code === 'P2025' || // Record not found
                        error.message?.includes('version') ||
                        error.message?.includes('conflict') ||
                        error.message?.includes('concurrent')

      if (!isConflict || attempt >= opts.maxRetries) {
        return {
          success: false,
          error: error.message || 'Operation failed',
          conflict: isConflict,
          retryable: isConflict && attempt < opts.maxRetries,
        }
      }

      // Wait before retry with exponential backoff
      if (opts.exponentialBackoff) {
        const delay = opts.retryDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        await new Promise(resolve => setTimeout(resolve, opts.retryDelay))
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Operation failed after retries',
    conflict: true,
    retryable: false,
  }
}

/**
 * Update LeaveRequest with optimistic locking
 */
export async function updateLeaveRequestWithLock(
  leaveRequestId: string,
  updateFn: (currentVersion: number) => Promise<any>,
  options: RetryOptions = {}
): Promise<OptimisticLockResult<any>> {
  return withOptimisticLock(
    async (version) => {
      return await prisma.$transaction(async (tx) => {
        // Verify version hasn't changed
        const current = await tx.leaveRequest.findUnique({
          where: { id: leaveRequestId },
          select: { version: true },
        })

        if (!current) {
          throw new Error('Leave request not found')
        }

        if (current.version !== version) {
          throw new Error(`Version conflict: expected ${version}, got ${current.version}`)
        }

        // Execute update function
        const result = await updateFn(version)

        // Increment version
        await tx.leaveRequest.update({
          where: { id: leaveRequestId },
          data: { version: { increment: 1 } },
        })

        return result
      })
    },
    async () => {
      const leave = await prisma.leaveRequest.findUnique({
        where: { id: leaveRequestId },
        select: { version: true },
      })
      return leave?.version ?? null
    },
    options
  )
}

/**
 * Update LeaveBalance with optimistic locking
 */
export async function updateLeaveBalanceWithLock(
  staffId: string,
  updateFn: (currentVersion: number, currentBalance: any) => Promise<any>,
  options: RetryOptions = {}
): Promise<OptimisticLockResult<any>> {
  return withOptimisticLock(
    async (version) => {
      return await prisma.$transaction(async (tx) => {
        // Get current balance with lock
        const balance = await tx.leaveBalance.findUnique({
          where: { staffId },
        })

        if (!balance) {
          throw new Error('Leave balance not found')
        }

        if (balance.version !== version) {
          throw new Error(`Version conflict: expected ${version}, got ${balance.version}`)
        }

        // Execute update function
        const result = await updateFn(version, balance)

        // Increment version
        await tx.leaveBalance.update({
          where: { staffId },
          data: { version: { increment: 1 } },
        })

        return result
      })
    },
    async () => {
      const balance = await prisma.leaveBalance.findUnique({
        where: { staffId },
        select: { version: true },
      })
      return balance?.version ?? null
    },
    options
  )
}

/**
 * Detect concurrent approval conflicts
 */
export async function detectConcurrentApproval(
  leaveRequestId: string
): Promise<{ hasConflict: boolean; conflictDetails?: string }> {
  try {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      select: {
        id: true,
        version: true,
        status: true,
        updatedAt: true,
      },
    })

    if (!leave) {
      return { hasConflict: false }
    }

    // Check if there are multiple pending approval steps that might conflict
    const approvalSteps = await prisma.approvalStep.findMany({
      where: {
        leaveRequestId,
        status: { in: ['pending', 'approved'] },
      },
      orderBy: { level: 'asc' },
    })

    // Detect if multiple steps are being processed simultaneously
    const pendingSteps = approvalSteps.filter(s => s.status === 'pending')
    const recentlyUpdated = approvalSteps.filter(
      s => s.updatedAt && new Date(s.updatedAt).getTime() > Date.now() - 5000 // Last 5 seconds
    )

    if (pendingSteps.length > 1 && recentlyUpdated.length > 1) {
      return {
        hasConflict: true,
        conflictDetails: 'Multiple approval steps being processed concurrently',
      }
    }

    return { hasConflict: false }
  } catch (error: any) {
    return {
      hasConflict: false,
      conflictDetails: error.message,
    }
  }
}

