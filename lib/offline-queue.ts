/**
 * Offline Request Queue
 * 
 * Queues write requests (POST, PUT, PATCH, DELETE) when offline.
 * Automatically syncs when connection is restored.
 * 
 * Rules:
 * - Queue is FIFO (first in, first out)
 * - No retries (stop on first failure)
 * - No merging
 * - No conflict resolution
 */

import { isDesktop } from './api-config';

export interface QueuedRequest {
  id: string;
  method: string;
  path: string;
  payload: any;
  headers?: Record<string, string>;
  createdAt: string;
}

/**
 * Generate unique ID for queued request
 */
function generateQueueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add request to queue (Tauri)
 */
async function enqueueRequestTauri(request: QueuedRequest): Promise<void> {
  if (!isDesktop()) return;
  
  try {
    const { tauriAPI } = await import('./tauri-api');
    if (tauriAPI && typeof window !== 'undefined' && '__TAURI__' in window) {
      await tauriAPI.offline?.enqueueRequest(request);
    }
  } catch (error) {
    console.warn('[Offline Queue] Tauri enqueue failed:', error);
  }
}

/**
 * Get all queued requests (Tauri)
 */
async function getQueuedRequestsTauri(): Promise<QueuedRequest[]> {
  if (!isDesktop()) return [];
  
  try {
    const { tauriAPI } = await import('./tauri-api');
    if (tauriAPI && typeof window !== 'undefined' && '__TAURI__' in window) {
      const result = await tauriAPI.offline?.getQueuedRequests();
      return result?.data || [];
    }
  } catch (error) {
    console.warn('[Offline Queue] Tauri get queue failed:', error);
  }
  
  return [];
}

/**
 * Remove request from queue (Tauri)
 */
async function dequeueRequestTauri(id: string): Promise<void> {
  if (!isDesktop()) return;
  
  try {
    const { tauriAPI } = await import('./tauri-api');
    if (tauriAPI && typeof window !== 'undefined' && '__TAURI__' in window) {
      await tauriAPI.offline?.dequeueRequest(id);
    }
  } catch (error) {
    console.warn('[Offline Queue] Tauri dequeue failed:', error);
  }
}

/**
 * Clear all queued requests (Tauri)
 */
async function clearQueueTauri(): Promise<void> {
  if (!isDesktop()) return;
  
  try {
    const { tauriAPI } = await import('./tauri-api');
    if (tauriAPI && typeof window !== 'undefined' && '__TAURI__' in window) {
      await tauriAPI.offline?.clearQueue();
    }
  } catch (error) {
    console.warn('[Offline Queue] Tauri clear queue failed:', error);
  }
}

/**
 * Fallback: Use localStorage for web
 */
function enqueueRequestWeb(request: QueuedRequest): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem('offline:queue');
    const queue: QueuedRequest[] = stored ? JSON.parse(stored) : [];
    queue.push(request);
    localStorage.setItem('offline:queue', JSON.stringify(queue));
  } catch (error) {
    console.warn('[Offline Queue] Web enqueue failed:', error);
  }
}

/**
 * Fallback: Get queued requests from localStorage
 */
function getQueuedRequestsWeb(): QueuedRequest[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('offline:queue');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('[Offline Queue] Web get queue failed:', error);
    return [];
  }
}

/**
 * Fallback: Remove request from localStorage queue
 */
function dequeueRequestWeb(id: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem('offline:queue');
    const queue: QueuedRequest[] = stored ? JSON.parse(stored) : [];
    const filtered = queue.filter(req => req.id !== id);
    localStorage.setItem('offline:queue', JSON.stringify(filtered));
  } catch (error) {
    console.warn('[Offline Queue] Web dequeue failed:', error);
  }
}

/**
 * Fallback: Clear queue from localStorage
 */
function clearQueueWeb(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('offline:queue');
  } catch (error) {
    console.warn('[Offline Queue] Web clear queue failed:', error);
  }
}

/**
 * Enqueue a write request
 */
export async function enqueueRequest(
  method: string,
  path: string,
  payload: any,
  headers?: Record<string, string>
): Promise<string> {
  const request: QueuedRequest = {
    id: generateQueueId(),
    method: method.toUpperCase(),
    path,
    payload,
    headers,
    createdAt: new Date().toISOString(),
  };
  
  // Only queue write requests
  const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!writeMethods.includes(request.method)) {
    throw new Error(`Cannot queue ${request.method} request`);
  }
  
  // Try Tauri first
  if (isDesktop()) {
    await enqueueRequestTauri(request);
  }
  
  // Also store in web storage (for fallback)
  enqueueRequestWeb(request);
  
  return request.id;
}

/**
 * Get all queued requests
 */
export async function getQueuedRequests(): Promise<QueuedRequest[]> {
  if (isDesktop()) {
    return await getQueuedRequestsTauri();
  }
  
  return getQueuedRequestsWeb();
}

/**
 * Remove request from queue
 */
export async function dequeueRequest(id: string): Promise<void> {
  if (isDesktop()) {
    await dequeueRequestTauri(id);
  }
  
  dequeueRequestWeb(id);
}

/**
 * Clear all queued requests
 */
export async function clearQueue(): Promise<void> {
  if (isDesktop()) {
    await clearQueueTauri();
  }
  
  clearQueueWeb();
}

/**
 * Get queue count
 */
export async function getQueueCount(): Promise<number> {
  const requests = await getQueuedRequests();
  return requests.length;
}

