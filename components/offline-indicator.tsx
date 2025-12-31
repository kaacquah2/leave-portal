'use client'

import { useOffline, useOfflineQueue } from '@/lib/use-offline'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { WifiOff, Wifi, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function OfflineIndicator() {
  const { isOnline, wasOffline } = useOffline()
  const { queueLength } = useOfflineQueue()

  if (isOnline && !wasOffline) {
    return null // Don't show anything when online and never was offline
  }

  if (!isOnline) {
    return (
      <Alert variant="destructive" className="mb-4">
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>You are currently offline. Some features may be limited.</span>
          {queueLength > 0 && (
            <Badge variant="secondary">
              {queueLength} action{queueLength !== 1 ? 's' : ''} queued
            </Badge>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (wasOffline && isOnline) {
    return (
      <Alert className="mb-4 border-green-500 bg-green-50">
        <Wifi className="h-4 w-4 text-green-600" />
        <AlertDescription className="flex items-center justify-between">
          <span>Connection restored. Syncing changes...</span>
          {queueLength > 0 && (
            <Badge variant="secondary">
              Syncing {queueLength} action{queueLength !== 1 ? 's' : ''}...
            </Badge>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

