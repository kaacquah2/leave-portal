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
import { getCachedResponse, cacheResponse, clearCachedResponse } from '../offline-cache';
import { enqueueRequest, getQueuedRequests } from '../offline-queue';

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
  
  // Online: perform actual request with stale-while-revalidate pattern
  try {
    // Check cache first for GET requests (stale-while-revalidate)
    if (method === 'GET' && !options.skipCache) {
      const query = extractQueryString(path);
      const cleanPath = extractPath(path);
      const cached = await getCachedResponse(method, cleanPath, query);
      
      if (cached !== null) {
        const maxAge = options.cacheMaxAge || 300; // Default 5 minutes
        // Get cache entry to check timestamp
        const { getCachedEntry } = await import('../offline-cache');
        const cacheEntry = await getCachedEntry(method, cleanPath, query);
        
        if (cacheEntry && cacheEntry.timestamp) {
          const cacheAge = (Date.now() - new Date(cacheEntry.timestamp).getTime()) / 1000;
          const isStale = cacheAge > maxAge;
          
          if (!isStale) {
            // Return fresh cached data immediately
            return new Response(JSON.stringify(cached), {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'X-Cached': 'true',
              },
            });
          } else {
            // Return stale data immediately, fetch fresh in background
            const staleResponse = new Response(JSON.stringify(cached), {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'X-Cached': 'true',
                'X-Stale': 'true',
              },
            });
            
            // Fetch fresh data in background (fire and forget)
            (async () => {
              try {
                let freshResponse: Response;
                if (isDesktop()) {
                  try {
                    freshResponse = await handleDesktopRequest(path, options);
                  } catch {
                    freshResponse = await performFetch(path, options);
                  }
                } else {
                  freshResponse = await performFetch(path, options);
                }
                
                if (freshResponse.ok) {
                  const data = await freshResponse.clone().json();
                  await cacheResponse(method, cleanPath, data, query, maxAge);
                }
              } catch (error) {
                // Ignore background fetch errors
                console.warn('[API Fetch] Background refresh failed:', error);
              }
            })();
            
            return staleResponse;
          }
        } else {
          // No timestamp info, return cached data anyway
          return new Response(JSON.stringify(cached), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-Cached': 'true',
            },
          });
        }
      }
    }
    
    // No cache or cache miss - perform actual request
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
 * @deprecated Use apiFetch() instead. This is kept for backward compatibility.
 * Make an API request with the correct base URL
 * 
 * NOW WITH OFFLINE SUPPORT:
 * - Online: Routes through desktop API or direct fetch, caches GET responses
 * - Offline: GET returns cached data, write requests are queued
 * 
 * @template T - Expected response type (defaults to any)
 * @param endpoint - API endpoint (relative or absolute)
 * @param options - Fetch options
 * @returns Promise resolving to Response object
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  return await apiFetch<T>(endpoint, {
    ...options,
    credentials: 'include', // Important for cookies/auth
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * @deprecated Use apiFetchJson() instead. This is kept for backward compatibility.
 * Convenience function for typed API requests
 * Automatically parses JSON response and returns typed data
 * 
 * @template T - Expected response type
 * @param endpoint - API endpoint
 * @param options - Fetch options
 * @returns Promise resolving to typed response data
 */
export async function apiRequestJson<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  return await apiFetchJson<T>(endpoint, options);
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
  
  // Log the request for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[API Fetch] Making request:', {
      method: options.method || 'GET',
      url: fullUrl,
      hasBody: !!options.body,
    });
  }
  
  try {
    // Make the request
    const response = await fetch(fullUrl, {
      ...options,
      credentials: 'include', // Important for cookies/auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    return response;
  } catch (error: any) {
    // Enhanced error logging
    const errorMessage = error?.message || 'Unknown error';
    const errorName = error?.name || 'Error';
    
    console.error('[API Fetch] Request failed:', {
      url: fullUrl,
      method: options.method || 'GET',
      error: errorMessage,
      errorName: errorName,
      isNetworkError: errorName === 'TypeError' && errorMessage.includes('fetch'),
    });
    
    // Provide more helpful error message
    if (errorName === 'TypeError' && errorMessage.includes('fetch')) {
      // Network error - could be CORS, server down, or invalid URL
      const isAbsoluteUrl = fullUrl.startsWith('http://') || fullUrl.startsWith('https://');
      const isLocalhost = typeof window !== 'undefined' && 
                         (window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1');
      
      if (isAbsoluteUrl && isLocalhost) {
        console.error('[API Fetch] Possible issue: Making cross-origin request from localhost to:', fullUrl);
        console.error('[API Fetch] Suggestion: Use relative URLs in development or ensure CORS is configured on the server');
      } else if (!isAbsoluteUrl && typeof window === 'undefined') {
        console.error('[API Fetch] Possible issue: Relative URL used in server-side context');
      }
    }
    
    // Re-throw the error
    throw error;
  }
}

/**
 * Get queued requests count (for UI)
 */
export async function getPendingRequestsCount(): Promise<number> {
  const requests = await getQueuedRequests();
  return requests.length;
}

