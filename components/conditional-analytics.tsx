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
    // Check if we're in desktop (Tauri or Electron)
    const isDesktop = typeof window !== 'undefined' && 
      (('__TAURI__' in window) || 
       !!(window as any).electronAPI || 
       !!(window as any).__ELECTRON_API_URL__)
    
    // Only render Analytics if not in desktop
    setShouldRender(!isDesktop)
  }, [])

  if (!shouldRender) {
    return null
  }

  return <Analytics />
}

