/**
 * Unified API Fetch Wrapper
 * 
 * MANDATORY: All frontend API calls MUST go through this function.
 * 
 * Behavior:
 * - Online: Perform fetch, cache GET responses
 * - Offline: GET → return cached data, POST/PUT/PATCH/DELETE → enqueue request
 * 
 * This is the single entry point for all API calls.
 */

import { isDesktop, getApiBaseUrl } from './api-config';
import { getCachedResponse, cacheResponse, clearCachedResponse } from './offline-cache';
import { enqueueRequest, getQueuedRequests } from './offline-queue';

/**
 * Handle desktop API request (Tauri/Electron)
 */
async function handleDesktopRequest(
  endpoint: string,
  options: RequestInit
): Promise<Response> {
  try {
    const { desktopAPI } = await import('./desktop-api');
    if (desktopAPI.isDesktop) {
      const result = await desktopAPI.api.request(endpoint, {
        method: options.method || 'GET',
        body: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined,
        headers: (options.headers as Record<string, string>) || {},
      });
      
      return new Response(JSON.stringify(result.data || {}), {
        status: result.status || (result.ok ? 200 : 500),
        statusText: result.statusText || (result.ok ? 'OK' : 'Error'),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error) {
    console.warn('[API Fetch] Desktop API failed, falling back to fetch:', error);
  }
  
  throw new Error('Desktop API not available');
}

export interface ApiFetchOptions extends RequestInit {
  /**
   * Cache max age in seconds (only for GET requests)
   * Default: 300 (5 minutes)
   */
  cacheMaxAge?: number;
  
  /**
   * Skip cache (force fresh request)
   */
  skipCache?: boolean;
  
  /**
   * Skip queue (fail immediately when offline)
   */
  skipQueue?: boolean;
}

/**
 * Check if we're online
 */
function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Extract query string from URL
 */
function extractQueryString(path: string): string | undefined {
  const url = new URL(path, 'http://dummy');
  return url.search ? url.search.substring(1) : undefined;
}

/**
 * Extract path without query string
 */
function extractPath(path: string): string {
  const url = new URL(path, 'http://dummy');
  return url.pathname;
}

/**
 * Unified API fetch function
 * 
 * This is the ONLY function that should be used for API calls.
 * All other fetch() calls should be replaced with this.
 */
export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const isWriteRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const online = isOnline();
  
  // Handle offline write requests: enqueue
  if (!online && isWriteRequest && !options.skipQueue) {
    const queueId = await enqueueRequest(
      method,
      path,
      options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : null,
      options.headers as Record<string, string> | undefined
    );
    
    // Return a response indicating the request was queued
    return new Response(
      JSON.stringify({
        queued: true,
        queueId,
        message: 'Request queued for sync when online',
      }),
      {
        status: 202, // Accepted
        statusText: 'Queued',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
  
  // Handle offline read requests: return cached data
  if (!online && !isWriteRequest && !options.skipCache) {
    const query = extractQueryString(path);
    const cleanPath = extractPath(path);
    const cached = await getCachedResponse(method, cleanPath, query);
    
    if (cached !== null) {
      // Return cached response
      return new Response(JSON.stringify(cached), {
        status: 200,
        statusText: 'OK (Cached)',
        headers: {
          'Content-Type': 'application/json',
          'X-Cached': 'true',
        },
      });
    }
    
    // No cache available, return error
    return new Response(
      JSON.stringify({
        error: 'No cached data available',
        message: 'This request requires an internet connection',
      }),
      {
        status: 503, // Service Unavailable
        statusText: 'Offline',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
  
  // Online: perform actual request
  try {
    let response: Response;
    
    // Route through desktop API if in desktop environment
    if (isDesktop()) {
      try {
        response = await handleDesktopRequest(path, options);
      } catch (error) {
        // Fall through to regular fetch
        console.warn('[API Fetch] Desktop API failed, falling back to fetch:', error);
        response = await performFetch(path, options);
      }
    } else {
      // Web: use direct fetch
      response = await performFetch(path, options);
    }
    
    // Cache successful GET responses
    if (method === 'GET' && response.ok && !options.skipCache) {
      try {
        const data = await response.clone().json();
        const query = extractQueryString(path);
        const cleanPath = extractPath(path);
        const maxAge = options.cacheMaxAge || 300; // Default 5 minutes
        
        await cacheResponse(method, cleanPath, data, query, maxAge);
      } catch (error) {
        // Failed to parse JSON or cache, but that's okay
        console.warn('[API Fetch] Failed to cache response:', error);
      }
    }
    
    // Invalidate cache for write requests
    if (isWriteRequest && response.ok) {
      const cleanPath = extractPath(path);
      // Clear cache for the affected resource
      await clearCachedResponse('GET', cleanPath);
      // Also clear related caches (e.g., list endpoints)
      // This is a simple implementation - could be more sophisticated
    }
    
    return response;
  } catch (error) {
    // Network error - if offline and write request, queue it
    if (!online && isWriteRequest && !options.skipQueue) {
      const queueId = await enqueueRequest(
        method,
        path,
        options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : null,
        options.headers as Record<string, string> | undefined
      );
      
      return new Response(
        JSON.stringify({
          queued: true,
          queueId,
          message: 'Request queued for sync when online',
        }),
        {
          status: 202,
          statusText: 'Queued',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    // Re-throw the error
    throw error;
  }
}

/**
 * Convenience function for JSON responses
 */
export async function apiFetchJson<T = any>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const response = await apiFetch<T>(path, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  return response.json();
}

/**
 * Perform actual fetch request (web)
 */
async function performFetch(path: string, options: RequestInit): Promise<Response> {
  // Build full URL
  let fullUrl: string;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    fullUrl = path;
  } else {
    const baseUrl = getApiBaseUrl() || '';
    fullUrl = baseUrl 
      ? `${baseUrl}${path.startsWith('/') ? path : '/' + path}`
      : path.startsWith('/') ? path : '/' + path;
  }
  
  // Make the request
  return await fetch(fullUrl, {
    ...options,
    credentials: 'include', // Important for cookies/auth
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Get queued requests count (for UI)
 */
export async function getPendingRequestsCount(): Promise<number> {
  const requests = await getQueuedRequests();
  return requests.length;
}

