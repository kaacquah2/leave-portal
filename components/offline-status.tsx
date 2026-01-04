'use client'

import { useOffline } from '@/hooks/use-offline'
import { useSync } from '@/hooks/use-sync'
import { AlertCircle, Wifi, WifiOff, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Offline Status Indicator Component
 * 
 * Shows current network status and sync state:
 * - 🔴 Offline mode
 * - 🟡 Pending actions count
 * - 🔄 Syncing
 * - ⚠️ Sync error
 */
export function OfflineStatus() {
  const { isOffline, isOnline } = useOffline()
  const { isSyncing, pendingCount, lastSyncResult, error } = useSync()

  // Don't show anything if online and no pending requests
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-2 shadow-lg',
        isOffline
          ? 'border-red-500 bg-red-50 dark:bg-red-950'
          : isSyncing
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
          : pendingCount > 0
          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
          : error
          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
          : 'border-green-500 bg-green-50 dark:bg-green-950'
      )}
    >
      {/* Offline State */}
      {isOffline && (
        <>
          <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-sm font-medium text-red-900 dark:text-red-100">
            Offline Mode
          </span>
        </>
      )}

      {/* Syncing State */}
      {isOnline && isSyncing && (
        <>
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Syncing...
          </span>
        </>
      )}

      {/* Pending Requests */}
      {isOnline && !isSyncing && pendingCount > 0 && (
        <>
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
            {pendingCount} pending {pendingCount === 1 ? 'action' : 'actions'}
          </span>
        </>
      )}

      {/* Sync Error */}
      {isOnline && !isSyncing && error && (
        <>
          <XCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
            Sync failed
          </span>
        </>
      )}

      {/* Success (just synced) */}
      {isOnline && !isSyncing && pendingCount === 0 && lastSyncResult?.success && (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-900 dark:text-green-100">
            Synced
          </span>
        </>
      )}

      {/* Online indicator (when no pending) */}
      {isOnline && !isSyncing && pendingCount === 0 && !error && !lastSyncResult && (
        <>
          <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-900 dark:text-green-100">
            Online
          </span>
        </>
      )}
    </div>
  )
}

/**
 * Compact offline status badge (for header/navbar)
 */
export function OfflineStatusBadge() {
  const { isOffline } = useOffline()
  const { pendingCount, isSyncing } = useSync()

  if (isOffline) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-200">
        <WifiOff className="h-3 w-3" />
        <span>Offline</span>
      </div>
    )
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-200">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Syncing</span>
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200">
        <AlertCircle className="h-3 w-3" />
        <span>{pendingCount}</span>
      </div>
    )
  }

  return null
}

