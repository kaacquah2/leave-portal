/**
 * Desktop-specific local caching and offline support
 */

const CACHE_PREFIX = 'hr-portal-'
const CACHE_VERSION = '1.0.0'

export interface CacheItem<T> {
  data: T
  timestamp: number
  expiresAt?: number
}

export class DesktopCache {
  private isElectron: boolean

  constructor() {
    this.isElectron = typeof window !== 'undefined' && (window as any).electron !== undefined
  }

  /**
   * Check if running in Electron
   */
  isElectronApp(): boolean {
    return this.isElectron
  }

  /**
   * Store data in local storage with expiration
   */
  set<T>(key: string, data: T, ttl?: number): void {
    if (typeof window === 'undefined') return

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: ttl ? Date.now() + ttl * 1000 : undefined,
    }

    try {
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(item))
    } catch (error) {
      console.error('Error storing cache:', error)
    }
  }

  /**
   * Get data from local storage
   */
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null

    try {
      const itemStr = localStorage.getItem(`${CACHE_PREFIX}${key}`)
      if (!itemStr) return null

      const item: CacheItem<T> = JSON.parse(itemStr)

      // Check expiration
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.remove(key)
        return null
      }

      return item.data
    } catch (error) {
      console.error('Error reading cache:', error)
      return null
    }
  }

  /**
   * Remove item from cache
   */
  remove(key: string): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(`${CACHE_PREFIX}${key}`)
  }

  /**
   * Clear all cache
   */
  clear(): void {
    if (typeof window === 'undefined') return

    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  }

  /**
   * Store offline leave draft
   */
  saveLeaveDraft(draft: {
    leaveType: string
    startDate: string
    endDate: string
    days: number
    reason: string
    attachments?: Array<{ name: string; type: string; description: string }>
  }): void {
    this.set('leave-draft', draft, 7 * 24 * 60 * 60) // 7 days
  }

  /**
   * Get offline leave draft
   */
  getLeaveDraft(): {
    leaveType: string
    startDate: string
    endDate: string
    days: number
    reason: string
    attachments?: Array<{ name: string; type: string; description: string }>
  } | null {
    return this.get('leave-draft')
  }

  /**
   * Clear leave draft
   */
  clearLeaveDraft(): void {
    this.remove('leave-draft')
  }

  /**
   * Store offline queue for syncing
   */
  addToSyncQueue(action: string, data: any): void {
    const queue = this.get<Array<{ action: string; data: any; timestamp: number }>>('sync-queue') || []
    queue.push({
      action,
      data,
      timestamp: Date.now(),
    })
    this.set('sync-queue', queue)
  }

  /**
   * Get sync queue
   */
  getSyncQueue(): Array<{ action: string; data: any; timestamp: number }> {
    return this.get('sync-queue') || []
  }

  /**
   * Clear sync queue
   */
  clearSyncQueue(): void {
    this.remove('sync-queue')
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    if (typeof window === 'undefined') return true
    return navigator.onLine
  }

  /**
   * Cache staff data
   */
  cacheStaffData(staff: any[]): void {
    this.set('staff-data', staff, 5 * 60) // 5 minutes
  }

  /**
   * Get cached staff data
   */
  getCachedStaffData(): any[] | null {
    return this.get('staff-data')
  }

  /**
   * Cache leave balances
   */
  cacheLeaveBalances(balances: any[]): void {
    this.set('leave-balances', balances, 5 * 60) // 5 minutes
  }

  /**
   * Get cached leave balances
   */
  getCachedLeaveBalances(): any[] | null {
    return this.get('leave-balances')
  }
}

export const desktopCache = new DesktopCache()

