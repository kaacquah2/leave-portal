'use client'

import { useState, useEffect } from 'react'

interface UseOfflineReturn {
  isOffline: boolean
  isOnline: boolean
  wasOffline: boolean // True if the app was offline and just came back online
}

/**
 * Custom hook for tracking online/offline status
 * 
 * Detects network status via navigator.onLine and window events.
 * Provides wasOffline flag to detect when connection is restored.
 * 
 * @example
 * ```tsx
 * const { isOffline, isOnline, wasOffline } = useOffline()
 * 
 * if (isOffline) {
 *   return <OfflineBanner />
 * }
 * 
 * if (wasOffline) {
 *   // Connection just restored - trigger sync
 *   sync()
 * }
 * ```
 */
export function useOffline(): UseOfflineReturn {
  const [isOffline, setIsOffline] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // Check initial state
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine)
    }

    const handleOnline = () => {
      const wasOfflineBefore = isOffline
      setIsOffline(false)
      
      if (wasOfflineBefore) {
        setWasOffline(true)
        // Reset wasOffline after a short delay
        setTimeout(() => setWasOffline(false), 2000)
      }
    }

    const handleOffline = () => {
      setIsOffline(true)
      setWasOffline(false)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [isOffline])

  return {
    isOffline,
    isOnline: !isOffline,
    wasOffline,
  }
}

