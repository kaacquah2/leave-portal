'use client'

import { useOffline } from '@/hooks/use-offline'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface OfflineIndicatorProps {
  showLabel?: boolean
  className?: string
}

/**
 * Offline Status Indicator Component
 * 
 * Displays visual status indicators (green/red/yellow dots) with tooltips
 * showing last sync time and queued items
 */
export function OfflineIndicator({ showLabel = true, className = '' }: OfflineIndicatorProps) {
  const { isOffline, isOnline, wasOffline } = useOffline()

  // In a real implementation, you'd get these from a sync service
  // For now, we'll use placeholder values
  const isSyncing = false // TODO: Get from sync service
  const lastSyncTime = null // TODO: Get from sync service
  const queuedItems = 0 // TODO: Get from sync service

  const getStatusColor = () => {
    if (isOnline && !isSyncing) return 'bg-green-500'
    if (isSyncing) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusIcon = () => {
    if (isOnline && !isSyncing) return <CheckCircle2 className="w-4 h-4 text-green-500" />
    if (isSyncing) return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
    return <AlertCircle className="w-4 h-4 text-red-500" />
  }

  const getStatusText = () => {
    if (isOnline && !isSyncing) return 'Online'
    if (isSyncing) return 'Syncing...'
    return 'Offline'
  }

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never'
    const date = new Date(lastSyncTime)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 ${className}`}>
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            {showLabel && (
              <span className="text-sm text-muted-foreground">
                {getStatusText()}
              </span>
            )}
            {wasOffline && (
              <span className="text-xs text-green-600 animate-pulse">
                Back online
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="font-semibold">Connection Status</div>
            <div>Status: {getStatusText()}</div>
            {!isOnline && (
              <>
                <div>Last sync: {formatLastSync()}</div>
                {queuedItems > 0 && (
                  <div>Queued: {queuedItems} item{queuedItems > 1 ? 's' : ''}</div>
                )}
              </>
            )}
            {isSyncing && (
              <div className="text-xs text-muted-foreground">
                Syncing data...
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Permission Tooltip Component
 * 
 * Shows tooltip explaining why an action is disabled
 */
interface PermissionTooltipProps {
  children: React.ReactNode
  reason: string
  hasPermission: boolean
}

export function PermissionTooltip({ children, reason, hasPermission }: PermissionTooltipProps) {
  if (hasPermission) {
    return <>{children}</>
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-block">
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Offline Status Banner
 * 
 * Displays a banner at the top of the page when offline
 */
export function OfflineStatusBanner() {
  const { isOffline } = useOffline()

  if (!isOffline) return null

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
      <div className="flex items-center gap-2 text-sm text-yellow-800">
        <AlertCircle className="w-4 h-4" />
        <span>
          You are currently offline. Some features may be unavailable. 
          Approvals require an online connection.
        </span>
      </div>
    </div>
  )
}

