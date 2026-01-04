/**
 * Sync Engine
 * 
 * Simple, linear sync engine that replays queued requests in order.
 * 
 * Rules:
 * - Replay queued requests in order (FIFO)
 * - Stop on first failure
 * - Remove successful items
 * - Report failures to UI
 * - No retries
 * - No merging
 * - No background jobs
 */

import { getQueuedRequests, dequeueRequest } from './offline-queue';
import { apiRequest } from './api-config';
import { QueuedRequest } from './offline-queue';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  error?: string;
}

/**
 * Sync queued requests
 * 
 * Replays all queued requests in order.
 * Stops on first failure.
 */
export async function syncQueuedRequests(): Promise<SyncResult> {
  const requests = await getQueuedRequests();
  
  if (requests.length === 0) {
    return {
      success: true,
      synced: 0,
      failed: 0,
    };
  }
  
  let synced = 0;
  let failed = 0;
  let error: string | undefined;
  
  // Process requests in order (FIFO)
  for (const request of requests) {
    try {
      // Build request options
      const options: RequestInit = {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          ...(request.headers || {}),
        },
        body: JSON.stringify(request.payload),
      };
      
      // Make the request
      const response = await apiRequest(request.path, options);
      
      if (!response.ok) {
        // Request failed - stop syncing
        const errorText = await response.text().catch(() => 'Unknown error');
        error = `Request failed: ${response.status} ${response.statusText} - ${errorText}`;
        failed = requests.length - synced;
        break;
      }
      
      // Success - remove from queue
      await dequeueRequest(request.id);
      synced++;
    } catch (err) {
      // Network error or other failure - stop syncing
      error = err instanceof Error ? err.message : 'Unknown error';
      failed = requests.length - synced;
      break;
    }
  }
  
  return {
    success: failed === 0,
    synced,
    failed,
    error,
  };
}

/**
 * Check if there are pending requests
 */
export async function hasPendingRequests(): Promise<boolean> {
  const requests = await getQueuedRequests();
  return requests.length > 0;
}

