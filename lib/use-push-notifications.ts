'use client'

import { useState, useEffect, useCallback } from 'react'

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface PushNotificationPermission {
  permission: NotificationPermission
  supported: boolean
  subscribed: boolean
}

/**
 * Hook for managing browser push notifications
 * Handles permission requests, subscription, and notification display
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [supported, setSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if push notifications are supported
  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkSupport = async () => {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        setSupported(false)
        return
      }

      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        setSupported(false)
        return
      }

      // Check if PushManager is supported
      if (!('PushManager' in window)) {
        setSupported(false)
        return
      }

      setSupported(true)
      setPermission(Notification.permission)

      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.ready
        const existingSubscription = await registration.pushManager.getSubscription()
        setSubscription(existingSubscription)
        setIsSubscribed(!!existingSubscription)
      } catch (err) {
        console.error('Error checking subscription:', err)
      }
    }

    checkSupport()
  }, [])

  // Register service worker
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration> => {
    if (!supported) {
      throw new Error('Push notifications are not supported in this browser')
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })
      console.log('Service Worker registered:', registration)
      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      throw new Error('Failed to register service worker')
    }
  }, [supported])

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!supported) {
      throw new Error('Push notifications are not supported')
    }

    if (permission === 'granted') {
      return permission
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result
    } catch (error) {
      console.error('Error requesting permission:', error)
      throw new Error('Failed to request notification permission')
    }
  }, [supported, permission])

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<PushSubscription> => {
    if (!supported) {
      throw new Error('Push notifications are not supported')
    }

    if (permission !== 'granted') {
      const perm = await requestPermission()
      if (perm !== 'granted') {
        throw new Error('Notification permission denied')
      }
    }

    setLoading(true)
    setError(null)

    try {
      // Register service worker if not already registered
      const registration = await registerServiceWorker()
      await registration.update() // Update if needed

      // Check for existing subscription
      let pushSubscription = await registration.pushManager.getSubscription()

      if (!pushSubscription) {
        // Create new subscription
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidPublicKey) {
          throw new Error('VAPID public key not configured')
        }

        pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        })
      }

      setSubscription(pushSubscription)
      setIsSubscribed(true)

      // Send subscription to server
      await sendSubscriptionToServer(pushSubscription)

      return pushSubscription
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to subscribe to push notifications'
      setError(errorMessage)
      console.error('Subscription error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [supported, permission, requestPermission, registerServiceWorker])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!subscription) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      await subscription.unsubscribe()
      setSubscription(null)
      setIsSubscribed(false)

      // Notify server
      await removeSubscriptionFromServer(subscription)

      console.log('Unsubscribed from push notifications')
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to unsubscribe'
      setError(errorMessage)
      console.error('Unsubscribe error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [subscription])

  // Send subscription to server
  const sendSubscriptionToServer = async (pushSubscription: PushSubscription) => {

    const subscriptionData: PushSubscriptionData = {
      endpoint: pushSubscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(pushSubscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(pushSubscription.getKey('auth')!),
      },
    }

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(subscriptionData),
    })

    if (!response.ok) {
      throw new Error('Failed to save subscription to server')
    }
  }

  // Remove subscription from server
  const removeSubscriptionFromServer = async (pushSubscription: PushSubscription) => {
    try {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ endpoint: pushSubscription.endpoint }),
      })
    } catch (error) {
      console.error('Error removing subscription from server:', error)
      // Don't throw - subscription is already removed locally
    }
  }

  return {
    permission,
    subscription,
    supported,
    isSubscribed,
    loading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

