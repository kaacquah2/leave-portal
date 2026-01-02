/**
 * API Configuration for Electron and Web
 * 
 * In Electron production builds, this allows pointing to a remote API server.
 * In development or web builds, uses relative URLs.
 * 
 * Refactored for:
 * - Better type safety with TypeScript interfaces
 * - Modular helper functions
 * - Improved error handling
 * - URL normalization using URL API
 * - Generic response types
 */

// ============================================================================
// Type Definitions
// ============================================================================

interface WindowElectronAPI {
  electronAPI?: {
    apiUrl?: string;
    api?: {
      request: (endpoint: string, options: ElectronApiRequestOptions) => Promise<ElectronApiResponse>;
    };
  };
  __ELECTRON_API_URL__?: string;
}

interface ElectronApiRequestOptions {
  method: string;
  body?: any;
  headers?: Record<string, string>;
}

interface ElectronApiResponse {
  data?: any;
  status?: number;
  statusText?: string;
  ok?: boolean;
  headers?: Record<string, string>;
}

interface ParsedEndpoint {
  tableName: string;
  recordId?: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
}

interface QueuedResponse {
  id: string;
  _queued: true;
  _message: string;
  [key: string]: any;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if we're running in Electron
 * Exported for use in other modules
 */
export function isElectron(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as WindowElectronAPI;
  return !!(win.electronAPI) || !!(win.__ELECTRON_API_URL__);
}

/**
 * Get Electron API instance if available
 */
function getElectronAPI(): WindowElectronAPI['electronAPI'] | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as WindowElectronAPI;
  return win.electronAPI || null;
}

/**
 * Normalize URL with proper parsing
 * Handles edge cases like query strings, hash fragments, and protocols
 */
function normalizeUrl(url: string): string {
  try {
    // If URL already has protocol, use URL constructor for proper parsing
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/$/, '');
    }
    
    // For URLs without protocol, determine if localhost (use http) or remote (use https)
    const trimmed = url.trim();
    const isLocalhost = trimmed.includes('localhost') || trimmed.includes('127.0.0.1') || trimmed.startsWith(':');
    const protocol = isLocalhost ? 'http://' : 'https://';
    
    // Use URL constructor to properly handle the URL
    const parsed = new URL(protocol + trimmed);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/$/, '');
  } catch (error) {
    // Fallback to simple normalization if URL parsing fails
    console.warn('[API Config] URL normalization failed, using fallback:', error);
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }
    return normalized.replace(/\/$/, '');
  }
}

/**
 * Parse endpoint to extract table name, record ID, and operation type
 * Handles various endpoint patterns:
 * - /api/table/123
 * - /api/table
 * - /api/users/123/comments/456 (nested)
 * - /api/table?query=value (query params)
 */
function parseEndpointForOfflineSync(
  endpoint: string,
  method: string
): ParsedEndpoint | null {
  try {
    // Remove query string and hash for parsing
    const cleanEndpoint = endpoint.split('?')[0].split('#')[0];
    const endpointParts = cleanEndpoint.split('/').filter(Boolean);
    
    if (endpointParts.length === 0) return null;
    
    // Determine operation type
    const methodUpper = method.toUpperCase();
    let operation: 'INSERT' | 'UPDATE' | 'DELETE' = 'INSERT';
    if (methodUpper === 'DELETE') {
      operation = 'DELETE';
    } else if (methodUpper === 'PATCH' || methodUpper === 'PUT') {
      operation = 'UPDATE';
    }
    
    // Extract table name and record ID
    // For REST endpoints: /api/table or /api/table/id
    // For nested: /api/users/123/comments - use the last resource as table
    let tableName = endpointParts[endpointParts.length - 1];
    let recordId: string | undefined;
    
    // Check if last part is an ID (numeric or UUID)
    const idPattern = /^(\d+|[a-f0-9-]{36}|[a-f0-9-]{32})$/i;
    if (tableName && idPattern.test(tableName)) {
      recordId = tableName;
      // Table name is the previous part
      tableName = endpointParts[endpointParts.length - 2] || endpointParts[endpointParts.length - 1];
    }
    
    // If we still don't have a valid table name, try to extract from common patterns
    if (!tableName || tableName === 'api') {
      // Look for common REST patterns
      const apiIndex = endpointParts.indexOf('api');
      if (apiIndex >= 0 && endpointParts.length > apiIndex + 1) {
        tableName = endpointParts[apiIndex + 1];
      } else {
        // Fallback: use the last non-empty part
        tableName = endpointParts.filter(p => p !== 'api' && !idPattern.test(p)).pop() || 'unknown';
      }
    }
    
    // Capitalize table name (common convention)
    tableName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
    
    return { tableName, recordId, operation };
  } catch (error) {
    console.warn('[API Config] Failed to parse endpoint:', endpoint, error);
    return null;
  }
}

/**
 * Safely parse request body
 */
function parseRequestBody(body: BodyInit | null | undefined): any {
  if (!body) return undefined;
  
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (error) {
      console.warn('[API Config] Failed to parse body as JSON, returning as string:', error);
      return body; // Return as-is if not valid JSON
    }
  }
  
  if (body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer) {
    // For non-JSON body types, return as-is
    return body;
  }
  
  return body;
}

/**
 * Generate a temporary ID for optimistic updates
 */
function generateTempId(existingId?: string): string {
  if (existingId) return existingId;
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// API Base URL Resolution
// ============================================================================

/**
 * Get API base URL from environment or window (injected by Electron)
 * Memoized to avoid repeated calculations
 */
let cachedApiBaseUrl: string | null = null;

function getApiBaseUrl(): string {
  // Return cached value if available
  if (cachedApiBaseUrl !== null) {
    return cachedApiBaseUrl;
  }
  
  // Check if we're in Electron and have a configured API URL
  if (typeof window !== 'undefined') {
    const win = window as unknown as WindowElectronAPI;
    
    // Priority 1: Check if Electron injected the API URL (via preload script)
    const electronApiUrl = win.__ELECTRON_API_URL__ || win.electronAPI?.apiUrl;
    if (electronApiUrl && electronApiUrl.trim() !== '') {
      cachedApiBaseUrl = normalizeUrl(electronApiUrl);
      return cachedApiBaseUrl;
    }
    
    // Priority 2: Check environment variable (set at build time)
    const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envApiUrl && envApiUrl.trim() !== '') {
      cachedApiBaseUrl = normalizeUrl(envApiUrl);
      return cachedApiBaseUrl;
    }
    
    // Priority 3: If in Electron but no API URL, check if we're loading from remote
    if (isElectron() && window.location.protocol === 'https:') {
      const origin = window.location.origin;
      console.log('[API Config] Using current origin as API URL:', origin);
      cachedApiBaseUrl = origin;
      return cachedApiBaseUrl;
    }
  }
  
  // Default: use relative URLs (same origin)
  cachedApiBaseUrl = '';
  return cachedApiBaseUrl;
}

export const API_BASE_URL = getApiBaseUrl();

// ============================================================================
// Offline Queue Helper
// ============================================================================

/**
 * Queue a write operation for offline sync
 * Returns a queued response if successful, null otherwise
 */
async function queueForOfflineSync(
  endpoint: string,
  method: string,
  body: BodyInit | null | undefined
): Promise<Response | null> {
  // Only queue write operations
  const isWriteOperation = method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  if (!isWriteOperation) return null;
  
  try {
    const { offlineService } = await import('./offline-service');
    
    if (!offlineService.isOfflineModeAvailable()) {
      return null;
    }
    
    // Parse endpoint to extract table/operation info
    const parsed = parseEndpointForOfflineSync(endpoint, method);
    if (!parsed) {
      console.warn('[API Request] Could not parse endpoint for offline sync:', endpoint);
      return null;
    }
    
    // Parse payload
    const payload = parseRequestBody(body) || {};
    
    // Generate temp ID if needed
    const tempId = generateTempId(parsed.recordId);
    
    // Queue the operation
    await offlineService.addToSyncQueue(
      parsed.tableName,
      parsed.operation,
      tempId,
      payload
    );
    
    console.log('[API Request] Queued for offline sync:', endpoint, parsed.operation);
    
    // Return a mock successful response for optimistic updates
    const queuedResponse: QueuedResponse = {
      id: tempId,
      ...payload,
      _queued: true,
      _message: 'Queued for sync when online'
    };
    
    return new Response(JSON.stringify(queuedResponse), {
      status: 202, // Accepted (queued)
      statusText: 'Queued for offline sync',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[API Request] Error queuing offline request:', error);
    return null;
  }
}

// ============================================================================
// Electron IPC Request Handler
// ============================================================================

/**
 * Handle API request via Electron IPC
 */
async function handleElectronRequest(
  endpoint: string,
  options: RequestInit
): Promise<Response> {
  const electronAPI = getElectronAPI();
  if (!electronAPI?.api) {
    throw new Error('Electron API not available');
  }
  
  try {
    const body = parseRequestBody(options.body);
    
    const result = await electronAPI.api.request(endpoint, {
      method: options.method || 'GET',
      body,
      headers: (options.headers as Record<string, string>) || {},
    });
    
    // Convert Electron IPC result to Response-like object
    return new Response(JSON.stringify(result.data || {}), {
      status: result.status || (result.ok ? 200 : 500),
      statusText: result.statusText || (result.ok ? 'OK' : 'Error'),
      headers: {
        'Content-Type': 'application/json',
        ...(result.headers || {}),
      },
    });
  } catch (error: any) {
    console.error('[API Request] Electron IPC error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Request failed' }), {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// ============================================================================
// Main API Request Function
// ============================================================================

/**
 * Make an API request with the correct base URL
 * In Electron: routes through main process via IPC (no CORS issues)
 * In Web: uses direct fetch with cookies (same-origin, no CORS)
 * Always attempts online first, falls back to offline queuing only if request fails
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
  // ✅ CRITICAL: Check if we're in Electron and route through IPC
  if (isElectron() && getElectronAPI()?.api) {
    return handleElectronRequest(endpoint, options);
  }
  
  // ✅ Web: Use direct fetch with cookies (same-origin, no CORS)
  const method = options.method || 'GET';
  const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  
  // Build full URL
  let fullUrl: string;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    fullUrl = endpoint;
  } else {
    const baseUrl = API_BASE_URL || '';
    fullUrl = baseUrl 
      ? `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
      : endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  }
  
  // Log in development and Electron for debugging
  if (process.env.NODE_ENV === 'development' || isElectron()) {
    const isOffline = typeof window !== 'undefined' && !navigator.onLine;
    console.log('[API Request]', fullUrl, method, isOffline ? '(navigator.onLine=false, but trying online anyway)' : '');
  }
  
  // ALWAYS try online first - don't check navigator.onLine to prevent requests
  // Both online and offline should work simultaneously
  try {
    const response = await fetch(fullUrl, {
      ...options,
      credentials: 'include', // Important for cookies/auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    // If request succeeded, return it
    if (response.ok || response.status < 500) {
      return response;
    }
    
    // If request failed with server error (5xx), try to queue for offline sync
    // but still return the error response so caller can handle it
    if (response.status >= 500 && isWriteOperation) {
      const queuedResponse = await queueForOfflineSync(endpoint, method, options.body);
      if (queuedResponse) {
        console.log('[API Request] Server error, but queued for offline sync:', endpoint);
      }
    }
    
    return response;
  } catch (error: any) {
    // Network error, CORS error, or other fetch failure
    // Try to queue for offline sync if it's a write operation
    console.log('[API Request] Network/fetch error, attempting offline queue:', error.message);
    
    const queuedResponse = await queueForOfflineSync(endpoint, method, options.body);
    if (queuedResponse) {
      // Return queued response - request will sync when online
      return queuedResponse;
    }
    
    // If we couldn't queue it, re-throw the original error
    throw error;
  }
}

/**
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
  const response = await apiRequest<T>(endpoint, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  return response.json();
}

