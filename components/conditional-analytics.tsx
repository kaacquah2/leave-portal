'use client'

import { Analytics } from '@vercel/analytics/next'
import { useEffect, useState } from 'react'

/**
 * Conditionally renders Vercel Analytics only when not running in Electron
 * This prevents errors when the app tries to load analytics scripts in Electron
 */
export function ConditionalAnalytics() {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    // Check if we're in Electron
    const isElectron = typeof window !== 'undefined' && 
      (!!(window as any).electronAPI || !!(window as any).__ELECTRON_API_URL__)
    
    // Only render Analytics if not in Electron
    setShouldRender(!isElectron)
  }, [])

  if (!shouldRender) {
    return null
  }

  return <Analytics />
}

