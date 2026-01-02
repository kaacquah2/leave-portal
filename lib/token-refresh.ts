/**
 * Token Refresh Utility
 * Automatically refreshes tokens before expiration to maintain seamless authentication
 */

import { apiRequest } from './api-config'
import { isElectron } from './api-config'

// Token refresh configuration
const TOKEN_REFRESH_THRESHOLD = 60 * 60 * 1000 // Refresh 1 hour before expiration (7 days = 168 hours)
const REFRESH_CHECK_INTERVAL = 5 * 60 * 1000 // Check every 5 minutes
const MAX_REFRESH_RETRIES = 3

let refreshTimer: NodeJS.Timeout | null = null
let isRefreshing = false
let refreshRetries = 0

/**
 * Decode JWT token to get expiration time
 * Returns expiration timestamp in milliseconds, or null if invalid
 */
function getTokenExpiration(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = JSON.parse(atob(parts[1]))
    if (payload.exp) {
      return payload.exp * 1000 // Convert to milliseconds
    }
    return null
  } catch (error) {
    console.error('[Token Refresh] Error decoding token:', error)
    return null
  }
}

/**
 * Check if token needs refresh
 * Returns true if token expires within threshold
 */
function shouldRefreshToken(token: string | null): boolean {
  if (!token) return false

  const expiration = getTokenExpiration(token)
  if (!expiration) return false

  const now = Date.now()
  const timeUntilExpiration = expiration - now

  // Refresh if token expires within threshold
  return timeUntilExpiration > 0 && timeUntilExpiration < TOKEN_REFRESH_THRESHOLD
}

/**
 * Get current token (Electron or web)
 */
async function getCurrentToken(): Promise<string | null> {
  if (isElectron()) {
    try {
      const electronAPI = (window as any).electronAPI
      if (electronAPI?.api?.hasToken) {
        const result = await electronAPI.api.hasToken()
        if (result.hasToken) {
          // Token exists but we can't read it directly (secure storage)
          // We'll need to check via API call
          return 'exists' // Placeholder - actual token is in secure storage
        }
      }
    } catch (error) {
      console.error('[Token Refresh] Error checking token:', error)
    }
    return null
  }

  // For web, we can't read httpOnly cookies, so we check via API
  return 'exists' // Placeholder
}

/**
 * Refresh authentication token
 */
async function refreshToken(): Promise<boolean> {
  if (isRefreshing) {
    console.log('[Token Refresh] Refresh already in progress, skipping')
    return false
  }

  isRefreshing = true

  try {
    const response = await apiRequest('/api/auth/refresh', {
      method: 'POST',
    })

    if (response.ok) {
      const data = await response.json()

      // For Electron, token is automatically stored by IPC handler
      // For web, new cookie is automatically set by server
      
      refreshRetries = 0
      console.log('[Token Refresh] Token refreshed successfully')
      
      // Dispatch event for components to listen to
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('token-refreshed', { 
          detail: { timestamp: new Date() } 
        }))
      }

      isRefreshing = false
      return true
    } else {
      const errorData = await response.json().catch(() => ({}))
      console.warn('[Token Refresh] Refresh failed:', errorData.error || 'Unknown error')
      
      // If refresh fails, token might be expired - dispatch event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('token-refresh-failed', { 
          detail: { error: errorData.error || 'Token refresh failed' } 
        }))
      }

      refreshRetries++
      isRefreshing = false
      return false
    }
  } catch (error: any) {
    console.error('[Token Refresh] Error refreshing token:', error)
    refreshRetries++
    
    if (refreshRetries >= MAX_REFRESH_RETRIES) {
      console.error('[Token Refresh] Max retries reached, stopping refresh attempts')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('token-refresh-failed', { 
          detail: { error: 'Max retries reached' } 
        }))
      }
    }

    isRefreshing = false
    return false
  }
}

/**
 * Check token and refresh if needed
 */
async function checkAndRefreshToken(): Promise<void> {
  try {
    // For Electron, we check if token exists via IPC
    // For web, we check via API call
    const token = await getCurrentToken()
    
    if (!token) {
      // No token, nothing to refresh
      return
    }

    // For Electron, we need to make an API call to check token validity
    // We'll use a lightweight endpoint to check if token is valid
    // If it's close to expiration, we'll refresh it
    const response = await apiRequest('/api/auth/me', {
      method: 'GET',
    })

    if (!response.ok && response.status === 401) {
      // Token is invalid/expired, try to refresh
      console.log('[Token Refresh] Token appears invalid, attempting refresh')
      await refreshToken()
      return
    }

    // If we got here, token is valid
    // For a more precise check, we could decode the token from the response
    // But for now, we'll refresh proactively based on time
    
    // Check if we should refresh proactively
    // We'll do this by checking the last refresh time
    const lastRefresh = localStorage.getItem('token_last_refresh')
    if (lastRefresh) {
      const lastRefreshTime = parseInt(lastRefresh, 10)
      const timeSinceRefresh = Date.now() - lastRefreshTime
      
      // Refresh if it's been more than 6 days (close to 7 day expiration)
      if (timeSinceRefresh > 6 * 24 * 60 * 60 * 1000) {
        console.log('[Token Refresh] Token approaching expiration, refreshing proactively')
        const refreshed = await refreshToken()
        if (refreshed) {
          localStorage.setItem('token_last_refresh', Date.now().toString())
        }
      }
    } else {
      // First time, set initial refresh time
      localStorage.setItem('token_last_refresh', Date.now().toString())
    }
  } catch (error) {
    console.error('[Token Refresh] Error checking token:', error)
  }
}

/**
 * Start automatic token refresh monitoring
 */
export function startTokenRefresh(): void {
  if (refreshTimer) {
    console.log('[Token Refresh] Already started')
    return
  }

  console.log('[Token Refresh] Starting automatic token refresh monitoring')
  
  // Initial check
  checkAndRefreshToken()

  // Set up periodic checks
  refreshTimer = setInterval(() => {
    checkAndRefreshToken()
  }, REFRESH_CHECK_INTERVAL)
}

/**
 * Stop automatic token refresh monitoring
 */
export function stopTokenRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
    console.log('[Token Refresh] Stopped automatic token refresh monitoring')
  }
}

/**
 * Manually trigger token refresh
 */
export async function manualRefresh(): Promise<boolean> {
  return await refreshToken()
}

/**
 * Initialize token refresh on app load
 */
if (typeof window !== 'undefined') {
  // Start token refresh when app loads
  window.addEventListener('load', () => {
    // Small delay to ensure auth is initialized
    setTimeout(() => {
      startTokenRefresh()
    }, 2000)
  })

  // Stop on page unload
  window.addEventListener('beforeunload', () => {
    stopTokenRefresh()
  })
}

