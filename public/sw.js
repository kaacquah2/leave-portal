/**
 * Service Worker for Push Notifications
 * Handles push events and notification clicks
 */

const CACHE_NAME = 'hr-leave-portal-v1'
const urlsToCache = [
  '/',
  '/offline',
]

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  )
})

// Activate service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    })
    .then(() => self.clients.claim())
  )
})

// Handle push notifications
self.addEventListener('push', (event) => {
  let data = {}
  
  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data = {
        title: 'HR Leave Portal',
        message: event.data.text() || 'You have a new notification',
      }
    }
  }

  const options = {
    body: data.message || data.body || 'You have a new notification',
    icon: data.icon || '/mofa-logo.png',
    badge: data.badge || '/badge.png',
    tag: data.id || data.tag || 'notification',
    data: {
      url: data.link || data.url || '/',
      id: data.id,
      type: data.type,
    },
    requireInteraction: data.important || false,
    vibrate: data.important ? [200, 100, 200] : [100],
    timestamp: Date.now(),
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'HR Leave Portal', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    })
    .then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Handle background sync (for offline support)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(
      // This will be handled by the offline service
      fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .catch((error) => {
        console.error('Background sync failed:', error)
      })
    )
  }
})

// Fetch event (for offline support)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
      })
      .catch(() => {
        // If both fail, return offline page
        if (event.request.destination === 'document') {
          return caches.match('/offline')
        }
      })
  )
})

