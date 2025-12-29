/**
 * Authentication Debug Utilities
 * 
 * These utilities help debug authentication issues in development and production.
 * Enable debug mode by setting DEBUG_AUTH=true in Vercel environment variables
 * or NEXT_PUBLIC_DEBUG_AUTH=true for client-side debugging.
 */

/**
 * Check if debug mode is enabled
 */
export function isDebugMode(): boolean {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true' || 
           process.env.NODE_ENV === 'development' ||
           (window as any).__DEBUG_AUTH__ === true
  }
  return process.env.DEBUG_AUTH === 'true' || process.env.NODE_ENV === 'development'
}

/**
 * Log authentication debug information
 */
export function logAuthDebug(message: string, data?: any): void {
  if (isDebugMode()) {
    console.log(`[Auth Debug] ${message}`, data || '')
  }
}

/**
 * Check cookie status (client-side)
 * Note: httpOnly cookies cannot be read by JavaScript, but we can check
 * if cookies are being sent by examining the document.cookie string
 */
export function checkCookieStatus(): {
  cookiesEnabled: boolean
  cookieString: string
  hasTokenCookie: boolean
} {
  if (typeof document === 'undefined') {
    return {
      cookiesEnabled: false,
      cookieString: '',
      hasTokenCookie: false,
    }
  }

  const cookieString = document.cookie
  const hasTokenCookie = cookieString.includes('token=')
  
  return {
    cookiesEnabled: cookieString.length > 0,
    cookieString,
    hasTokenCookie,
  }
}

/**
 * Verify authentication by making a test request to /api/auth/me
 */
export async function verifyAuthentication(): Promise<{
  authenticated: boolean
  user?: any
  error?: string
  status?: number
}> {
  try {
    const { apiRequest } = await import('./api-config')
    const response = await apiRequest('/api/auth/me', {
      method: 'GET',
    })

    if (response.ok) {
      const user = await response.json()
      logAuthDebug('Authentication verified', { userId: user.id, email: user.email, role: user.role })
      return {
        authenticated: true,
        user,
      }
    } else {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }
      
      logAuthDebug('Authentication failed', {
        status: response.status,
        error: errorData,
      })
      
      return {
        authenticated: false,
        error: errorData.error || 'Authentication failed',
        status: response.status,
      }
    }
  } catch (error: any) {
    logAuthDebug('Authentication verification error', error)
    return {
      authenticated: false,
      error: error.message || 'Network error',
    }
  }
}

/**
 * Print comprehensive authentication debug information
 */
export async function printAuthDebugInfo(): Promise<void> {
  if (!isDebugMode()) {
    console.log('[Auth Debug] Debug mode is not enabled. Set DEBUG_AUTH=true or NEXT_PUBLIC_DEBUG_AUTH=true')
    return
  }

  console.group('[Auth Debug] Authentication Status')
  
  // Check cookie status
  const cookieStatus = checkCookieStatus()
  console.log('Cookie Status:', cookieStatus)
  
  // Verify authentication
  const authStatus = await verifyAuthentication()
  console.log('Authentication Status:', authStatus)
  
  // Check environment
  console.log('Environment:', {
    nodeEnv: process.env.NODE_ENV,
    isProduction: process.env.NODE_ENV === 'production',
    isVercel: process.env.VERCEL === '1',
    debugAuth: process.env.DEBUG_AUTH,
    publicDebugAuth: process.env.NEXT_PUBLIC_DEBUG_AUTH,
  })
  
  console.groupEnd()
}

// Make it available globally in development
if (typeof window !== 'undefined' && isDebugMode()) {
  (window as any).checkAuth = printAuthDebugInfo
  console.log('[Auth Debug] Debug utilities available. Call window.checkAuth() to see authentication status.')
}

