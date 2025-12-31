/**
 * Offline Service - Client-side wrapper for offline-first operations
 * 
 * This service provides a unified interface for:
 * - Writing to local SQLite (via Electron IPC)
 * - Queueing changes for sync
 * - Detecting online/offline status
 * - Triggering automatic sync
 */

import { apiRequest } from './api-config';

export interface SyncQueueItem {
  id: number;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  payload: string;
  created_at: string;
}

export class OfflineService {
  private isElectron: boolean;
  private syncInProgress: boolean = false;
  private syncListeners: Set<() => void> = new Set();

  constructor() {
    this.isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
  }

  /**
   * Check if running in Electron (offline mode available)
   * For web, we use IndexedDB/localStorage for offline queue
   */
  isOfflineModeAvailable(): boolean {
    // Enable offline mode for both Electron and web
    // Web uses localStorage/IndexedDB for queue
    return true
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(
    tableName: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    recordId: string,
    payload: any
  ): Promise<void> {
    if (this.isElectron) {
      // Use Electron's sync queue
      try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.db?.addToSyncQueue) {
          await electronAPI.db.addToSyncQueue(tableName, operation, recordId, payload);
          console.log('[OfflineService] Added to sync queue:', tableName, operation, recordId);
          return;
        }
      } catch (error) {
        console.error('[OfflineService] Error adding to sync queue:', error);
        throw error;
      }
    }

    // For web, use IndexedDB-based queue
    try {
      const { offlineQueue } = await import('./offline-queue');
      const endpoint = `/api/${tableName.toLowerCase()}${recordId ? `/${recordId}` : ''}`;
      const method = operation === 'INSERT' ? 'POST' : operation === 'UPDATE' ? 'PATCH' : 'DELETE';
      
      await offlineQueue.add({
        type: 'CUSTOM',
        endpoint,
        method,
        payload: operation === 'DELETE' ? undefined : payload,
      });
      console.log('[OfflineService] Added to web sync queue:', tableName, operation, recordId);
    } catch (error) {
      console.error('[OfflineService] Error adding to web sync queue:', error);
      // Don't throw - allow action to continue
    }
  }

  /**
   * Get sync queue items
   */
  async getSyncQueue(limit: number = 50): Promise<SyncQueueItem[]> {
    if (!this.isElectron) {
      return [];
    }

    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.db?.getSyncQueue) {
        return await electronAPI.db.getSyncQueue(limit);
      }
    } catch (error) {
      console.error('[OfflineService] Error getting sync queue:', error);
    }
    return [];
  }

  /**
   * Remove item from sync queue
   */
  async removeFromSyncQueue(id: number): Promise<void> {
    if (!this.isElectron) return;

    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.db?.removeFromSyncQueue) {
        await electronAPI.db.removeFromSyncQueue(id);
      }
    } catch (error) {
      console.error('[OfflineService] Error removing from sync queue:', error);
    }
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<string | null> {
    if (!this.isElectron) return null;

    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.db?.getLastSyncTime) {
        return await electronAPI.db.getLastSyncTime();
      }
    } catch (error) {
      console.error('[OfflineService] Error getting last sync time:', error);
    }
    return null;
  }

  /**
   * Set last sync time
   */
  async setLastSyncTime(timestamp: string): Promise<void> {
    if (!this.isElectron) return;

    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.db?.setLastSyncTime) {
        await electronAPI.db.setLastSyncTime(timestamp);
      }
    } catch (error) {
      console.error('[OfflineService] Error setting last sync time:', error);
    }
  }

  /**
   * Mark record as synced
   */
  async markSynced(tableName: string, recordId: string): Promise<void> {
    if (!this.isElectron) return;

    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.db?.markSynced) {
        await electronAPI.db.markSynced(tableName, recordId);
      }
    } catch (error) {
      console.error('[OfflineService] Error marking as synced:', error);
    }
  }

  /**
   * Sync queue to server
   */
  async syncQueue(): Promise<{ success: boolean; synced: number; failed: number; errors: string[] }> {
    if (!this.isOnline()) {
      return { success: false, synced: 0, failed: 0, errors: ['Not online'] };
    }

    // Use web-based queue if not in Electron
    if (!this.isElectron) {
      try {
        const { offlineQueue } = await import('./offline-queue');
        const result = await offlineQueue.process();
        return {
          success: result.success > 0,
          synced: result.success,
          failed: result.failed,
          errors: result.errors,
        };
      } catch (error: any) {
        return { success: false, synced: 0, failed: 0, errors: [error.message || 'Sync failed'] };
      }
    }

    if (this.syncInProgress) {
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] };
    }

    this.syncInProgress = true;
    const result = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      // Get pending items from queue
      const queueItems = await this.getSyncQueue(100); // Batch of 100

      if (queueItems.length === 0) {
        this.syncInProgress = false;
        return result;
      }

      // Group by table for batch processing
      const batches: Record<string, SyncQueueItem[]> = {};
      for (const item of queueItems) {
        if (!batches[item.table_name]) {
          batches[item.table_name] = [];
        }
        batches[item.table_name].push(item);
      }

      // Process each batch
      for (const [tableName, items] of Object.entries(batches)) {
        try {
          const batchPayload = items.map(item => ({
            operation: item.operation,
            recordId: item.record_id,
            payload: JSON.parse(item.payload),
          }));

          // Send batch to server
          const response = await apiRequest('/api/sync', {
            method: 'POST',
            body: JSON.stringify({
              table: tableName,
              changes: batchPayload,
            }),
          });

          if (response.ok) {
            // Remove successfully synced items
            for (const item of items) {
              await this.removeFromSyncQueue(item.id);
              await this.markSynced(tableName, item.record_id);
              result.synced++;
            }
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || 'Sync failed');
          }
        } catch (error: any) {
          result.failed += items.length;
          result.errors.push(`${tableName}: ${error.message}`);
          console.error(`[OfflineService] Error syncing batch for ${tableName}:`, error);
          // Don't remove failed items - they'll be retried later
        }
      }

      result.success = result.failed === 0;
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
      console.error('[OfflineService] Error during sync:', error);
    } finally {
      this.syncInProgress = false;
      // Notify listeners
      this.syncListeners.forEach(listener => listener());
    }

    return result;
  }

  /**
   * Pull changes from server
   */
  async pullChanges(): Promise<{ success: boolean; changes: any[] }> {
    if (!this.isElectron || !this.isOnline()) {
      return { success: false, changes: [] };
    }

    try {
      const lastSyncTime = await this.getLastSyncTime();
      const response = await apiRequest(
        `/api/pull?since=${lastSyncTime || ''}`,
        { method: 'GET' }
      );

      if (response.ok) {
        const data = await response.json();
        await this.setLastSyncTime(new Date().toISOString());
        return { success: true, changes: data.changes || [] };
      }

      return { success: false, changes: [] };
    } catch (error) {
      console.error('[OfflineService] Error pulling changes:', error);
      return { success: false, changes: [] };
    }
  }

  /**
   * Setup online/offline listeners
   */
  setupListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[OfflineService] Device came online, triggering sync...');
      // Trigger sync after a short delay to ensure connection is stable
      setTimeout(() => {
        this.syncQueue().then(result => {
          if (result.synced > 0) {
            console.log(`[OfflineService] Synced ${result.synced} items`);
          }
          if (result.failed > 0) {
            console.warn(`[OfflineService] Failed to sync ${result.failed} items:`, result.errors);
          }
        });
      }, 2000);
    });

    window.addEventListener('offline', () => {
      console.log('[OfflineService] Device went offline');
    });

    // Periodic sync check (every 5 minutes when online)
    setInterval(() => {
      if (this.isOnline() && !this.syncInProgress) {
        this.syncQueue().then(result => {
          if (result.synced > 0) {
            console.log(`[OfflineService] Periodic sync: ${result.synced} items synced`);
          }
        }).catch(error => {
          console.error('[OfflineService] Periodic sync error:', error);
        });
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Also sync immediately when coming back online
    window.addEventListener('online', () => {
      setTimeout(() => {
        this.syncQueue().then(result => {
          if (result.synced > 0) {
            console.log(`[OfflineService] Online sync: ${result.synced} items synced`);
          }
        }).catch(error => {
          console.error('[OfflineService] Online sync error:', error);
        });
      }, 2000); // Wait 2 seconds for connection to stabilize
    });
  }

  /**
   * Add sync listener
   */
  onSync(listener: () => void): () => void {
    this.syncListeners.add(listener);
    return () => {
      this.syncListeners.delete(listener);
    };
  }
}

// Singleton instance
export const offlineService = new OfflineService();

// Setup listeners on module load
if (typeof window !== 'undefined') {
  offlineService.setupListeners();
}

