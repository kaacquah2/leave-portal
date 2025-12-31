/**
 * Offline Detection Hook
 * 
 * Detects online/offline status and provides utilities for offline-first operations
 */

import { useState, useEffect, useCallback } from 'react'

export interface OfflineStatus {
  isOnline: boolean
  wasOffline: boolean
  lastOnlineTime: Date | null
  lastOfflineTime: Date | null
}

/**
 * Hook to detect and track online/offline status
 */
export function useOffline() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== 'undefined' ? navigator.onLine : true
  )
  const [wasOffline, setWasOffline] = useState(false)
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(
    typeof window !== 'undefined' ? new Date() : null
  )
  const [lastOfflineTime, setLastOfflineTime] = useState<Date | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setIsOnline(true)
      setLastOnlineTime(new Date())
      if (wasOffline) {
        // Trigger sync when coming back online
        window.dispatchEvent(new CustomEvent('online'))
        setWasOffline(false)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setLastOfflineTime(new Date())
      setWasOffline(true)
      window.dispatchEvent(new CustomEvent('offline'))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  return {
    isOnline,
    wasOffline,
    lastOnlineTime,
    lastOfflineTime,
  }
}

/**
 * Hook to queue actions when offline and sync when online
 */
export function useOfflineQueue() {
  const { isOnline } = useOffline()
  const [queue, setQueue] = useState<Array<{
    id: string
    action: string
    payload: any
    timestamp: number
  }>>([])

  // Load queue from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem('offline-queue')
      if (stored) {
        const parsed = JSON.parse(stored)
        setQueue(parsed)
      }
    } catch (error) {
      console.error('Error loading offline queue:', error)
    }
  }, [])

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem('offline-queue', JSON.stringify(queue))
    } catch (error) {
      console.error('Error saving offline queue:', error)
    }
  }, [queue])

  // Process queue when coming back online
  useEffect(() => {
    if (!isOnline || queue.length === 0) return

    const processQueue = async () => {
      const { apiRequest } = await import('@/lib/api-config')
      
      for (const item of queue) {
        try {
          // Attempt to process the queued action
          const response = await apiRequest(item.action, {
            method: 'POST',
            body: JSON.stringify(item.payload),
          })

          if (response.ok) {
            // Remove from queue on success
            setQueue((prev) => prev.filter((q) => q.id !== item.id))
          }
        } catch (error) {
          console.error(`Error processing queued action ${item.id}:`, error)
          // Keep in queue for retry
        }
      }
    }

    // Delay processing slightly to ensure connection is stable
    const timeout = setTimeout(processQueue, 2000)
    return () => clearTimeout(timeout)
  }, [isOnline, queue])

  const addToQueue = useCallback((action: string, payload: any) => {
    const id = `queue-${Date.now()}-${Math.random()}`
    setQueue((prev) => [
      ...prev,
      {
        id,
        action,
        payload,
        timestamp: Date.now(),
      },
    ])
    return id
  }, [])

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id))
  }, [])

  const clearQueue = useCallback(() => {
    setQueue([])
  }, [])

  return {
    queue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    queueLength: queue.length,
  }
}

