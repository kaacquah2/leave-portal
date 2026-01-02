'use client'

import { useEffect, useState, useRef } from 'react'
import { API_BASE_URL } from './api-config'

interface RealtimeEvent {
  type: string
  message?: string
  count?: number
  timestamp?: string
}

export function useRealtime(enabled: boolean = true) {
  const [events, setEvents] = useState<RealtimeEvent[]>([])
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    
    if (!enabled) {
      // Clean up existing connection if disabled
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setConnected(false)
      return
    }

    const connect = () => {
      // Clean up any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      // Clear any pending reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      // Build real-time API URL with proper base URL for Electron
      const realtimeUrl = API_BASE_URL 
        ? `${API_BASE_URL}/api/realtime`
        : '/api/realtime'

      // EventSource automatically sends cookies for same-origin requests
      // No need to pass token - API reads from cookies
      const eventSource = new EventSource(realtimeUrl)

      eventSource.onopen = () => {
        if (isMountedRef.current) {
          setConnected(true)
          console.log('Real-time connection established')
        }
      }

      eventSource.onmessage = (event) => {
        if (!isMountedRef.current) return
        
        try {
          const data: RealtimeEvent = JSON.parse(event.data)
          setEvents((prev) => [...prev.slice(-9), data]) // Keep last 10 events

          // Handle different event types
          if (data.type === 'connected') {
            console.log('Real-time updates connected')
          } else if (data.type === 'leaves_updated') {
            // Trigger a refresh in components that use this
            window.dispatchEvent(new CustomEvent('realtime:leaves-updated'))
          } else if (data.type === 'balance_updated') {
            window.dispatchEvent(new CustomEvent('realtime:balance-updated'))
          } else if (data.type === 'notification') {
            window.dispatchEvent(new CustomEvent('realtime:notification', { detail: data }))
          } else if (data.type === 'heartbeat') {
            // Heartbeat received - connection is alive
            // No action needed, just confirms connection is working
          }
        } catch (error) {
          console.error('Error parsing real-time event:', error)
        }
      }

      eventSource.onerror = (error) => {
        if (!isMountedRef.current) return

        const readyState = eventSource.readyState
        
        // EventSource.CONNECTING = 0, EventSource.OPEN = 1, EventSource.CLOSED = 2
        if (readyState === EventSource.CLOSED) {
          console.warn('Real-time connection closed')
          setConnected(false)
          
          // Only attempt to reconnect if component is still mounted and enabled
          if (isMountedRef.current && enabled && !reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current && enabled) {
                console.log('Attempting to reconnect real-time...')
                connect()
              }
            }, 5000) // Reconnect after 5 seconds
          }
        } else if (readyState === EventSource.CONNECTING) {
          // Connection is attempting to reconnect - this is normal
          console.log('Real-time connection reconnecting...')
          setConnected(false)
        } else {
          // Other errors - log but don't close connection
          console.warn('Real-time connection error (non-fatal):', error)
        }
      }

      eventSourceRef.current = eventSource
    }

    // Initial connection
    connect()

    return () => {
      isMountedRef.current = false
      
      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      // Close EventSource connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      
      setConnected(false)
    }
  }, [enabled])

  return { events, connected }
}

