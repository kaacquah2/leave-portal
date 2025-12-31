/**
 * Offline Queue - Web-based implementation using IndexedDB
 * 
 * Queues actions when offline and syncs when online
 */

interface QueuedAction {
  id: string
  type: 'CREATE_LEAVE' | 'APPROVE_LEAVE' | 'UPDATE_LEAVE' | 'CREATE_STAFF' | 'UPDATE_STAFF' | 'CUSTOM'
  endpoint: string
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  payload: any
  timestamp: number
  retries: number
}

class OfflineQueue {
  private dbName = 'hr-leave-portal-queue'
  private storeName = 'actions'
  private db: IDBDatabase | null = null
  private maxRetries = 3

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (typeof window === 'undefined') return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' })
        }
      }
    })
  }

  /**
   * Add action to queue
   */
  async add(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>): Promise<string> {
    await this.ensureInit()

    const queuedAction: QueuedAction = {
      ...action,
      id: `queue-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      retries: 0,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.add(queuedAction)

      request.onsuccess = () => resolve(queuedAction.id)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all queued actions
   */
  async getAll(): Promise<QueuedAction[]> {
    await this.ensureInit()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Remove action from queue
   */
  async remove(id: string): Promise<void> {
    await this.ensureInit()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Increment retry count
   */
  async incrementRetry(id: string): Promise<void> {
    await this.ensureInit()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const action = getRequest.result
        if (action) {
          action.retries += 1
          const updateRequest = store.put(action)
          updateRequest.onsuccess = () => resolve()
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          resolve()
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Process queue when online
   */
  async process(): Promise<{ success: number; failed: number; errors: string[] }> {
    if (typeof window === 'undefined' || !navigator.onLine) {
      return { success: 0, failed: 0, errors: ['Not online'] }
    }

    await this.ensureInit()

    const actions = await this.getAll()
    const result = { success: 0, failed: 0, errors: [] as string[] }

    for (const action of actions) {
      // Skip if max retries reached
      if (action.retries >= this.maxRetries) {
        await this.remove(action.id)
        result.failed++
        result.errors.push(`${action.type}: Max retries reached`)
        continue
      }

      try {
        const { apiRequest } = await import('@/lib/api-config')
        const response = await apiRequest(action.endpoint, {
          method: action.method,
          body: JSON.stringify(action.payload),
        })

        if (response.ok) {
          await this.remove(action.id)
          result.success++
        } else {
          await this.incrementRetry(action.id)
          result.failed++
          const errorData = await response.json().catch(() => ({}))
          result.errors.push(`${action.type}: ${errorData.error || 'Failed'}`)
        }
      } catch (error: any) {
        await this.incrementRetry(action.id)
        result.failed++
        result.errors.push(`${action.type}: ${error.message || 'Unknown error'}`)
      }
    }

    return result
  }

  /**
   * Clear all queued actions
   */
  async clear(): Promise<void> {
    await this.ensureInit()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get queue length
   */
  async length(): Promise<number> {
    const actions = await this.getAll()
    return actions.length
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInit(): Promise<void> {
    if (!this.db) {
      await this.init()
    }
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue()

// Initialize on module load
if (typeof window !== 'undefined') {
  offlineQueue.init().catch((error) => {
    console.error('Failed to initialize offline queue:', error)
  })
}

