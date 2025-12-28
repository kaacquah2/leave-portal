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

  useEffect(() => {
    if (!enabled) return

    // Build real-time API URL with proper base URL for Electron
    const realtimeUrl = API_BASE_URL 
      ? `${API_BASE_URL}/api/realtime`
      : '/api/realtime'

    // EventSource automatically sends cookies for same-origin requests
    // No need to pass token - API reads from cookies
    const eventSource = new EventSource(realtimeUrl)

    eventSource.onopen = () => {
      setConnected(true)
      console.log('Real-time connection established')
    }

    eventSource.onmessage = (event) => {
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
        }
      } catch (error) {
        console.error('Error parsing real-time event:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('Real-time connection error:', error)
      setConnected(false)
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          eventSource.close()
          // Reconnection will happen automatically via useEffect
        }
      }, 5000)
    }

    eventSourceRef.current = eventSource

    return () => {
      eventSource.close()
      setConnected(false)
    }
  }, [enabled])

  return { events, connected }
}

