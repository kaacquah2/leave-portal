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
      let normalized = electronApiUrl.trim();
      // Ensure protocol is present
      if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        // Default to https:// for production URLs
        normalized = `https://${normalized}`;
      }
      // Remove trailing slash
      normalized = normalized.replace(/\/$/, '');
      return normalized;
    }
    
    // Priority 2: Check environment variable (set at build time)
    const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envApiUrl && envApiUrl.trim() !== '') {
      let normalized = envApiUrl.trim();
      // Ensure protocol is present
      if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        // Default to https:// for production URLs
        normalized = `https://${normalized}`;
      }
      // Remove trailing slash
      normalized = normalized.replace(/\/$/, '');
      return normalized;
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
 * Automatically handles offline mode by queuing requests when offline
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Check if we're offline and this is a write operation
  const isWriteOperation = options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase());
  const isOffline = typeof window !== 'undefined' && !navigator.onLine;
  
  // If offline and it's a write operation, queue it for later
  if (isOffline && isWriteOperation) {
    try {
      // Import offline service dynamically to avoid circular dependencies
      const { offlineService } = await import('./offline-service');
      
      if (offlineService.isOfflineModeAvailable()) {
        // Extract table name and operation from endpoint
        const endpointParts = endpoint.split('/').filter(Boolean);
        const tableName = endpointParts[endpointParts.length - 2] || endpointParts[endpointParts.length - 1];
        const recordId = endpointParts[endpointParts.length - 1]?.match(/^\d+$|^[a-f0-9-]+$/) ? endpointParts[endpointParts.length - 1] : undefined;
        
        // Determine operation type
        let operation: 'INSERT' | 'UPDATE' | 'DELETE' = 'INSERT';
        if (options.method?.toUpperCase() === 'DELETE') {
          operation = 'DELETE';
        } else if (options.method?.toUpperCase() === 'PATCH' || options.method?.toUpperCase() === 'PUT') {
          operation = 'UPDATE';
        }
        
        // Parse payload if available
        let payload: any = {};
        try {
          if (options.body) {
            payload = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
          }
        } catch (e) {
          // Ignore parse errors
        }
        
        // Generate temp ID if needed
        const tempId = recordId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Queue the operation
        await offlineService.addToSyncQueue(
          tableName.charAt(0).toUpperCase() + tableName.slice(1), // Capitalize table name
          operation,
          tempId,
          payload
        );
        
        console.log('[API Request] Queued for offline sync:', endpoint, operation);
        
        // Return a mock successful response for optimistic updates
        // The actual sync will happen when online
        return new Response(JSON.stringify({ 
          id: tempId,
          ...payload,
          _queued: true,
          _message: 'Queued for sync when online'
        }), {
          status: 202, // Accepted (queued)
          statusText: 'Queued for offline sync',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('[API Request] Error queuing offline request:', error);
      // Fall through to attempt actual request (might fail, but that's expected offline)
    }
  }
  
  // If endpoint already has http/https, use it directly
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    try {
      return await fetch(endpoint, {
        ...options,
        credentials: 'include', // Important for cookies/auth
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    } catch (error) {
      // If fetch fails and we're offline, try to queue it
      if (isOffline && isWriteOperation) {
        try {
          const { offlineService } = await import('./offline-service');
          if (offlineService.isOfflineModeAvailable()) {
            // Already handled above, but try again as fallback
            throw error; // Re-throw to be handled by caller
          }
        } catch (e) {
          // Ignore
        }
      }
      throw error;
    }
  }
  
  // Build full URL
  const baseUrl = API_BASE_URL || '';
  const fullUrl = baseUrl 
    ? `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
    : endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  
  // Log in development and Electron for debugging
  if (process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && (window as any).electronAPI)) {
    console.log('[API Request]', fullUrl, options.method || 'GET', isOffline ? '(OFFLINE)' : '');
  }
  
  try {
    return await fetch(fullUrl, {
      ...options,
      credentials: 'include', // Important for cookies/auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (error: any) {
    // If fetch fails and we're offline with a write operation, try to queue it
    if (isOffline && isWriteOperation) {
      try {
        const { offlineService } = await import('./offline-service');
        if (offlineService.isOfflineModeAvailable()) {
          // Extract table name and operation from endpoint
          const endpointParts = endpoint.split('/').filter(Boolean);
          const tableName = endpointParts[endpointParts.length - 2] || endpointParts[endpointParts.length - 1];
          const recordId = endpointParts[endpointParts.length - 1]?.match(/^\d+$|^[a-f0-9-]+$/) ? endpointParts[endpointParts.length - 1] : undefined;
          
          let operation: 'INSERT' | 'UPDATE' | 'DELETE' = 'INSERT';
          if (options.method?.toUpperCase() === 'DELETE') {
            operation = 'DELETE';
          } else if (options.method?.toUpperCase() === 'PATCH' || options.method?.toUpperCase() === 'PUT') {
            operation = 'UPDATE';
          }
          
          let payload: any = {};
          try {
            if (options.body) {
              payload = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
            }
          } catch (e) {
            // Ignore parse errors
          }
          
          const tempId = recordId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          await offlineService.addToSyncQueue(
            tableName.charAt(0).toUpperCase() + tableName.slice(1),
            operation,
            tempId,
            payload
          );
          
          console.log('[API Request] Queued failed request for offline sync:', endpoint);
          
          // Return mock response
          return new Response(JSON.stringify({ 
            id: tempId,
            ...payload,
            _queued: true,
            _message: 'Queued for sync when online'
          }), {
            status: 202,
            statusText: 'Queued for offline sync',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }
      } catch (queueError) {
        console.error('[API Request] Error queuing failed request:', queueError);
      }
    }
    
    // Re-throw the original error if we couldn't queue it
    throw error;
  }
}

/**
 * Check if we're running in Electron
 */
export function isElectron(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).electronAPI || !!(window as any).__ELECTRON_API_URL__;
}

