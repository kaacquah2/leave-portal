'use client'

import { useState, useCallback } from 'react'
import { apiRequest } from '@/lib/api-config'

interface UseApiOptions {
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
  immediate?: boolean // Whether to execute immediately
}

interface UseApiReturn<T = any> {
  data: T | null
  loading: boolean
  error: Error | null
  execute: (endpoint: string, options?: RequestInit) => Promise<T | null>
  reset: () => void
}

/**
 * Custom hook for making API requests with loading and error states
 * Handles both Electron and web environments automatically
 * 
 * @example
 * ```tsx
 * const { data, loading, error, execute } = useApi()
 * 
 * useEffect(() => {
 *   execute('/api/staff')
 * }, [])
 * 
 * if (loading) return <Loading />
 * if (error) return <Error message={error.message} />
 * ```
 */
export function useApi<T = any>(options: UseApiOptions = {}): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async (
    endpoint: string,
    requestOptions: RequestInit = {}
  ): Promise<T | null> => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiRequest(endpoint, {
        ...requestOptions,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...requestOptions.headers,
        },
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }

        const errorMessage = errorData.error || errorData.message || `Request failed with status ${response.status}`
        const apiError = new Error(errorMessage)
        setError(apiError)
        options.onError?.(apiError)
        return null
      }

      const responseData = await response.json()
      setData(responseData)
      options.onSuccess?.(responseData)
      return responseData
    } catch (err) {
      const apiError = err instanceof Error ? err : new Error('API request failed')
      setError(apiError)
      options.onError?.(apiError)
      return null
    } finally {
      setLoading(false)
    }
  }, [options])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return {
    data,
    loading,
    error,
    execute,
    reset,
  }
}

