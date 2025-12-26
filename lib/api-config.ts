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
    // Check if Electron injected the API URL (via preload script)
    const electronApiUrl = (window as any).__ELECTRON_API_URL__ || 
                         ((window as any).electronAPI?.apiUrl);
    if (electronApiUrl) {
      return electronApiUrl;
    }
    
    // Check environment variable (set at build time)
    const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envApiUrl) {
      return envApiUrl;
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
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint}`;
  
  return fetch(url, {
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

