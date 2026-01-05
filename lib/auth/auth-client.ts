'use client'

// Client-side authentication utilities
// All authentication is handled via httpOnly cookies and database

import { apiRequest } from '../api-config'

export interface AuthUser {
  id: string
  email: string
  role: string
  staffId?: string | null
  staff?: {
    staffId: string
    firstName: string
    lastName: string
    department?: string
  } | null
}

// Removed: getStoredUser() - use getCurrentUser() instead
// Removed: getStoredToken() - tokens are in httpOnly cookies
// Removed: clearAuth() - not needed, cookies are cleared server-side

export async function logout(): Promise<void> {
  try {
    await apiRequest('/api/auth/logout', {
      method: 'POST',
    })
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    // Cookie is cleared server-side, just redirect
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await apiRequest('/api/auth/me', {
      method: 'GET',
    })

    if (!response.ok) {
      // Log detailed error information for debugging
      if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true') {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        console.warn('[Auth] getCurrentUser failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: response.url,
        })
      }
      
      // If 401, user needs to log in
      if (response.status === 401) {
        if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true') {
          console.warn('[Auth] User not authenticated - please log in')
        }
      }
      
      return null
    }

    const user = await response.json()
    
    // Log successful authentication in debug mode
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true') {
      console.log('[Auth] User authenticated:', { id: user.id, email: user.email, role: user.role })
    }
    
    return user
  } catch (error) {
    console.error('[Auth] Get user error:', error)
    return null
  }
}

/**
 * Check if authentication cookie exists (client-side check)
 * Note: This only checks if the cookie name exists, not if it's valid
 * For actual authentication, use getCurrentUser()
 */
export function checkCookieExists(): boolean {
  if (typeof document === 'undefined') return false
  
  // Check if token cookie exists
  // Note: httpOnly cookies cannot be read by JavaScript, so we can only check
  // if cookies are being sent by checking the cookie header
  // This is a limited check - the real verification happens server-side
  const cookies = document.cookie
  return cookies.includes('token=')
}

