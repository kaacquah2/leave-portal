/**
 * API Configuration for Electron and Web
 * 
 * In Electron production builds, this allows pointing to a remote API server.
 * In development or web builds, uses relative URLs.
 */

// Get API base URL from environment or window (injected by Electron)
function getApiBaseUrl(): string {
  // Check if we're in Electron and have a configured API URL
  if (typeof window !== 'undefined') {
    // Priority 1: Check if Electron injected the API URL (via preload script)
    // This is the most reliable method for Electron apps
    const electronApiUrl = (window as any).__ELECTRON_API_URL__ || 
                         ((window as any).electronAPI?.apiUrl);
    if (electronApiUrl && electronApiUrl.trim() !== '') {
      // Normalize: remove trailing slash
      return electronApiUrl.replace(/\/$/, '');
    }
    
    // Priority 2: Check environment variable (set at build time)
    const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envApiUrl && envApiUrl.trim() !== '') {
      return envApiUrl.replace(/\/$/, '');
    }
    
    // Priority 3: If in Electron but no API URL, check if we're loading from remote
    // This handles the case where the page loads from Vercel but API URL wasn't injected
    const isElectron = !!(window as any).electronAPI || !!(window as any).__ELECTRON_API_URL__ !== undefined;
    if (isElectron && window.location.protocol === 'https:') {
      // We're in Electron and loading from HTTPS, use the current origin
      const origin = window.location.origin;
      console.log('[API Config] Using current origin as API URL:', origin);
      return origin;
    }
  }
  
  // Default: use relative URLs (same origin)
  // This works for:
  // - Web development (localhost:3000)
  // - Web production (same domain)
  // - Electron development (localhost:3000)
  return '';
}

export const API_BASE_URL = getApiBaseUrl();

/**
 * Make an API request with the correct base URL
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // If endpoint already has http/https, use it directly
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return fetch(endpoint, {
      ...options,
      credentials: 'include', // Important for cookies/auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }
  
  // Build full URL
  const baseUrl = API_BASE_URL || '';
  const fullUrl = baseUrl 
    ? `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
    : endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  
  // Log in development and Electron for debugging
  if (process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && (window as any).electronAPI)) {
    console.log('[API Request]', fullUrl, options.method || 'GET');
  }
  
  return fetch(fullUrl, {
    ...options,
    credentials: 'include', // Important for cookies/auth
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Check if we're running in Electron
 */
export function isElectron(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).electronAPI || !!(window as any).__ELECTRON_API_URL__;
}

