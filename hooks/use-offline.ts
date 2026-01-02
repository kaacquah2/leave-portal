'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseOfflineReturn {
  isOffline: boolean
  isOnline: boolean
  wasOffline: boolean // True if the app was offline and just came back online
}

/**
 * Custom hook for tracking online/offline status
 * Useful for PWA and web applications to show offline indicators
 * 
 * Note: Electron apps don't use this hook as they handle offline differently
 * through the offline-service module
 * 
 * @example
 * ```tsx
 * const { isOffline, isOnline } = useOffline()
 * 
 * if (isOffline) {
 *   return <OfflineBanner />
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
      if (isOffline) {
        setWasOffline(true)
        // Reset wasOffline after a short delay
        setTimeout(() => setWasOffline(false), 1000)
      }
      setIsOffline(false)
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

