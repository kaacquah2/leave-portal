'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, logout as logoutClient, type AuthUser } from '@/lib/auth'
import { type UserRole } from '@/lib/roles'

interface UseAuthReturn {
  user: AuthUser | null
  loading: boolean
  error: Error | null
  isAuthenticated: boolean
  logout: () => Promise<void>
  refresh: () => Promise<void>
  hasRole: (role: UserRole | UserRole[]) => boolean
}

/**
 * Custom hook for managing authentication state
 * Provides user data, loading state, and authentication utilities
 * 
 * @example
 * ```tsx
 * const { user, loading, isAuthenticated, logout } = useAuth()
 * 
 * if (loading) return <Loading />
 * if (!isAuthenticated) return <Login />
 * ```
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Authentication check failed')
      setError(error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const logout = useCallback(async () => {
    try {
      await logoutClient()
      setUser(null)
      router.push('/')
    } catch (err) {
      console.error('Logout error:', err)
      // Still clear user state even if logout fails
      setUser(null)
      router.push('/')
    }
  }, [router])

  const refresh = useCallback(async () => {
    await checkAuth()
  }, [checkAuth])

  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!user) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(user.role as UserRole)
  }, [user])

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    logout,
    refresh,
    hasRole,
  }
}

