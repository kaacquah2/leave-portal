'use client'

import { useState, useEffect, useCallback } from 'react'
import { syncQueuedRequests, hasPendingRequests, SyncResult } from '@/lib/sync-engine'
import { useOffline } from './use-offline'

export interface UseSyncReturn {
  isSyncing: boolean
  pendingCount: number
  lastSyncResult: SyncResult | null
  sync: () => Promise<SyncResult>
  error: string | null
}

/**
 * Hook for managing offline sync
 * 
 * Automatically syncs when connection is restored.
 * Provides manual sync trigger and status.
 */
export function useSync(): UseSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { isOnline, wasOffline } = useOffline()

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    const hasPending = await hasPendingRequests()
    if (hasPending) {
      const { getQueueCount } = await import('@/lib/offline-queue')
      const count = await getQueueCount()
      setPendingCount(count)
    } else {
      setPendingCount(0)
    }
  }, [])

  // Initial pending count
  useEffect(() => {
    updatePendingCount()
  }, [updatePendingCount])

  // Auto-sync when connection is restored
  useEffect(() => {
    if (isOnline && wasOffline && pendingCount > 0 && !isSyncing) {
      // Connection restored - trigger sync
      sync()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, wasOffline, pendingCount])

  // Manual sync function
  const sync = useCallback(async (): Promise<SyncResult> => {
    if (isSyncing) {
      return lastSyncResult || { success: false, synced: 0, failed: 0, error: 'Sync already in progress' }
    }

    setIsSyncing(true)
    setError(null)

    try {
      const result = await syncQueuedRequests()
      setLastSyncResult(result)
      
      if (!result.success && result.error) {
        setError(result.error)
      }
      
      // Update pending count
      await updatePendingCount()
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed'
      setError(errorMessage)
      const errorResult: SyncResult = {
        success: false,
        synced: 0,
        failed: 0,
        error: errorMessage,
      }
      setLastSyncResult(errorResult)
      return errorResult
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, lastSyncResult, updatePendingCount])

  // Poll pending count periodically
  useEffect(() => {
    const interval = setInterval(() => {
      updatePendingCount()
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [updatePendingCount])

  return {
    isSyncing,
    pendingCount,
    lastSyncResult,
    sync,
    error,
  }
}

