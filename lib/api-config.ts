/**
 * API Configuration for Tauri and Web
 * 
 * In Tauri production builds, this allows pointing to a remote API server.
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


// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if we're running in a desktop environment (Tauri)
 * Exported for use in other modules
 */
export function isDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  // Check for Tauri
  if ('__TAURI__' in window) return true;
  // Legacy: Check for Electron (shouldn't exist anymore, but kept for compatibility)
  const win = window as unknown as WindowElectronAPI;
  return !!(win.electronAPI) || !!(win.__ELECTRON_API_URL__);
}

/**
 * @deprecated Use isDesktop() instead
 */
export function isElectron(): boolean {
  return isDesktop();
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
  
  // Check if we're in Tauri/Desktop environment
  if (typeof window !== 'undefined') {
    const win = window as unknown as WindowElectronAPI;
    
    // Priority 1: Check environment variable (set during build or runtime)
    // In Tauri builds, this should point to the remote API server
    const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envApiUrl && envApiUrl.trim() !== '') {
      cachedApiBaseUrl = normalizeUrl(envApiUrl);
      return cachedApiBaseUrl;
    }
    
    // Priority 2: Check if Tauri injected the API URL via window
    // Tauri can inject this via the Rust backend
    if ('__TAURI__' in window) {
      // Try to get API URL from Tauri (if available)
      // This would be set by the Tauri backend
      const tauriApiUrl = (window as any).__TAURI_API_URL__;
      if (tauriApiUrl && tauriApiUrl.trim() !== '') {
        cachedApiBaseUrl = normalizeUrl(tauriApiUrl);
        return cachedApiBaseUrl;
      }
    }
    
    // Priority 3: Legacy - Check if Electron injected the API URL (for backward compatibility)
    const electronApiUrl = win.__ELECTRON_API_URL__ || win.electronAPI?.apiUrl;
    if (electronApiUrl && electronApiUrl.trim() !== '') {
      cachedApiBaseUrl = normalizeUrl(electronApiUrl);
      return cachedApiBaseUrl;
    }
    
    // Priority 4: If in desktop but no API URL configured, use remote origin
    // This is a fallback - in production Tauri builds, API URL should be explicitly configured
    if (isDesktop()) {
      if (window.location.protocol === 'https:') {
        // Loading from remote HTTPS - use same origin
        const origin = window.location.origin;
        console.log('[API Config] Using current origin as API URL:', origin);
        cachedApiBaseUrl = origin;
        return cachedApiBaseUrl;
      } else {
        // Loading from file:// or app:// - need explicit API URL
        // In Tauri static builds, API calls must go to remote server
        console.warn('[API Config] Tauri detected but no API URL configured. API calls will fail.');
        console.warn('[API Config] Set NEXT_PUBLIC_API_URL environment variable or configure in Tauri backend.');
        // Return empty string - caller should handle this gracefully
        cachedApiBaseUrl = '';
        return cachedApiBaseUrl;
      }
    }
  }
  
  // Default: use relative URLs (same origin) - only for web builds
  cachedApiBaseUrl = '';
  return cachedApiBaseUrl;
}

export const API_BASE_URL = getApiBaseUrl();

/**
 * Export getApiBaseUrl for use in other modules
 */
export { getApiBaseUrl };

// ============================================================================
// Electron IPC Request Handler
// ============================================================================

/**
 * Handle API request via desktop API (Tauri or Electron)
 */
async function handleDesktopRequest(
  endpoint: string,
  options: RequestInit
): Promise<Response> {
  // Try to use unified desktop API
  try {
    const { desktopAPI } = await import('./desktop-api');
    if (desktopAPI.isDesktop) {
      const result = await desktopAPI.api.request(endpoint, {
        method: options.method || 'GET',
        body: parseRequestBody(options.body),
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
    console.warn('[API Request] Desktop API not available, falling back to fetch');
  }
  
  // Fallback: Try legacy Electron API
  const electronAPI = getElectronAPI();
  if (electronAPI?.api) {
    try {
      const body = parseRequestBody(options.body);
      const result = await electronAPI.api.request(endpoint, {
        method: options.method || 'GET',
        body,
        headers: (options.headers as Record<string, string>) || {},
      });
      
      return new Response(JSON.stringify(result.data || {}), {
        status: result.status || (result.ok ? 200 : 500),
        statusText: result.statusText || (result.ok ? 'OK' : 'Error'),
        headers: {
          'Content-Type': 'application/json',
          ...(result.headers || {}),
        },
      });
    } catch (error: any) {
      console.error('[API Request] Legacy Electron IPC error:', error);
    }
  }
  
  throw new Error('Desktop API not available');
}

// ============================================================================
// Main API Request Function
// ============================================================================

/**
 * Make an API request with the correct base URL
 * 
 * NOW WITH OFFLINE SUPPORT:
 * - Online: Routes through desktop API or direct fetch, caches GET responses
 * - Offline: GET returns cached data, write requests are queued
 * 
 * In Electron: routes through main process via IPC (no CORS issues)
 * In Web: uses direct fetch with cookies (same-origin, no CORS)
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
  // Use the unified offline-capable API fetch wrapper
  // This provides automatic offline support, caching, and queueing
  const { apiFetch } = await import('./api-fetch');
  
  // Pass through to apiFetch with offline support
  // apiFetch will handle:
  // - Desktop API routing (if in Tauri/Electron)
  // - Offline detection
  // - Caching (for GET requests)
  // - Queueing (for write requests when offline)
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

