/**
 * Sync service for offline/online data synchronization
 */

import { desktopCache } from './desktop-cache'

export interface SyncResult {
  success: boolean
  synced: number
  failed: number
  errors: string[]
}

export class SyncService {
  private isSyncing = false

  /**
   * Sync offline queue when coming back online
   */
  async syncQueue(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] }
    }

    if (!desktopCache.isOnline()) {
      return { success: false, synced: 0, failed: 0, errors: ['Device is offline'] }
    }

    this.isSyncing = true
    const queue = desktopCache.getSyncQueue()
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    }

    for (const item of queue) {
      try {
        await this.processSyncItem(item)
        result.synced++
      } catch (error: any) {
        result.failed++
        result.errors.push(`Failed to sync ${item.action}: ${error.message}`)
      }
    }

    // Clear queue if all items synced
    if (result.failed === 0) {
      desktopCache.clearSyncQueue()
    }

    this.isSyncing = false
    return result
  }

  /**
   * Process a single sync item
   */
  private async processSyncItem(item: { action: string; data: any }): Promise<void> {
    switch (item.action) {
      case 'create-leave':
        await fetch('/api/leaves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(item.data),
        })
        break

      case 'upload-attachment':
        const formData = new FormData()
        // Note: File objects can't be serialized, so this would need special handling
        // For now, we'll skip file attachments in offline mode
        break

      default:
        throw new Error(`Unknown sync action: ${item.action}`)
    }
  }

  /**
   * Setup online/offline event listeners
   */
  setupListeners(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('online', () => {
      console.log('Device came online, syncing queue...')
      this.syncQueue().then(result => {
        if (result.synced > 0) {
          console.log(`Synced ${result.synced} items`)
        }
        if (result.failed > 0) {
          console.error(`Failed to sync ${result.failed} items:`, result.errors)
        }
      })
    })

    window.addEventListener('offline', () => {
      console.log('Device went offline')
    })
  }
}

export const syncService = new SyncService()

// Setup listeners on module load
if (typeof window !== 'undefined') {
  syncService.setupListeners()
}

