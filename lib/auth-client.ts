'use client'

// Client-side authentication utilities
// All authentication is handled via httpOnly cookies and database

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
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
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
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    })

    if (!response.ok) {
      return null
    }

    const user = await response.json()
    return user
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}

