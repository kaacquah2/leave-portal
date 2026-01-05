/**
 * Tauri API Wrapper
 * 
 * This module provides a TypeScript interface to Tauri commands.
 * It replaces the Electron window.electronAPI interface.
 */

// Dynamic import to avoid bundling Tauri APIs in Next.js static builds
// Tauri modules are ignored by webpack during static export builds

/**
 * Type definition for Tauri's invoke function
 */
type TauriInvoke = <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

let invoke: TauriInvoke | null = null;

async function getInvoke(): Promise<TauriInvoke | null> {
  // Only attempt to load Tauri API at runtime, never during build
  if (invoke === null && typeof window !== 'undefined' && '__TAURI__' in window) {
    try {
      // Use a pattern that webpack cannot statically analyze
      // Build the module path dynamically to prevent static analysis
      const base = '@tauri-apps';
      const sub = 'api';
      const mod = 'tauri';
      const tauriPath = [base, sub, mod].join('/');
      
      // Use Function constructor to create a dynamic import
      // This prevents webpack from analyzing the import statement
      // The module is ignored by webpack.IgnorePlugin in next.config.mjs
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const importFn = new Function('p', 'return import(p)');
      const tauriModule = await importFn(tauriPath);
      invoke = tauriModule.invoke as TauriInvoke;
    } catch (error) {
      // Silently fail if Tauri API is not available
      // This is expected during Next.js build (static export)
      // The module will be available at runtime in Tauri
      // The webpack warning is harmless - the module is properly ignored
    }
  }
  return invoke;
}

/**
 * API request options
 */
export interface ApiRequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * API response structure
 */
export interface ApiResponse {
  ok: boolean;
  status: number;
  statusText?: string;
  data: any;
  error?: string;
}

/**
 * Repository response structure
 */
export interface RepositoryResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Tauri API interface (replacement for window.electronAPI)
 */
export const tauriAPI = {
  /**
   * Get the application version
   */
  getVersion: async (): Promise<string> => {
    const invokeFn = await getInvoke();
    if (!invokeFn) throw new Error('Tauri API not available');
    return await invokeFn<string>('get_version');
  },

  /**
   * Get the platform (os, arch)
   */
  getPlatform: async (): Promise<string> => {
    const invokeFn = await getInvoke();
    if (!invokeFn) throw new Error('Tauri API not available');
    return await invokeFn<string>('get_platform');
  },

  /**
   * Send a message (example command)
   */
  sendMessage: async (message: string): Promise<string> => {
    const invokeFn = await getInvoke();
    if (!invokeFn) throw new Error('Tauri API not available');
    return await invokeFn<string>('send_message', { message });
  },

  /**
   * Get API base URL
   */
  getApiUrl: async (): Promise<string | null> => {
    const invokeFn = await getInvoke();
    if (!invokeFn) throw new Error('Tauri API not available');
    return await invokeFn<string | null>('get_api_url');
  },

  /**
   * Make an API request
   */
  apiRequest: async (path: string, options?: ApiRequestOptions): Promise<ApiResponse> => {
    const invokeFn = await getInvoke();
    if (!invokeFn) throw new Error('Tauri API not available');
    return await invokeFn<ApiResponse>('api_request', { path, options });
  },

  /**
   * Login
   */
  login: async (email: string, password: string, apiBaseUrl: string): Promise<ApiResponse> => {
    const invokeFn = await getInvoke();
    if (!invokeFn) throw new Error('Tauri API not available');
    return await invokeFn<ApiResponse>('api_login', { email, password, api_base_url: apiBaseUrl });
  },

  /**
   * Logout
   */
  logout: async (): Promise<void> => {
    const invokeFn = await getInvoke();
    if (!invokeFn) throw new Error('Tauri API not available');
    await invokeFn('api_logout');
  },

  /**
   * Get current user
   */
  getMe: async (): Promise<ApiResponse> => {
    const invokeFn = await getInvoke();
    if (!invokeFn) throw new Error('Tauri API not available');
    return await invokeFn<ApiResponse>('api_get_me');
  },

  /**
   * Check if user has token
   */
  hasToken: async (): Promise<boolean> => {
    const invokeFn = await getInvoke();
    if (!invokeFn) throw new Error('Tauri API not available');
    const result = await invokeFn<{ hasToken: boolean }>('api_has_token');
    return result.hasToken;
  },

  /**
   * Refresh authentication token
   */
  refresh: async (): Promise<ApiResponse> => {
    const invokeFn = await getInvoke();
    if (!invokeFn) throw new Error('Tauri API not available');
    return await invokeFn<ApiResponse>('api_refresh');
  },

  /**
   * Repository operations
   */
  repository: {
    /**
     * Get sync status
     */
    getSyncStatus: async (apiBaseUrl: string): Promise<RepositoryResponse> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      return await invokeFn<RepositoryResponse>('repo_sync_status', { api_base_url: apiBaseUrl });
    },

    /**
     * Trigger manual sync
     */
    triggerSync: async (apiBaseUrl: string): Promise<RepositoryResponse> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      return await invokeFn<RepositoryResponse>('repo_sync_trigger', { api_base_url: apiBaseUrl });
    },

    /**
     * Employees
     */
    employees: {
      findAll: async (filters?: any): Promise<RepositoryResponse> => {
        const invokeFn = await getInvoke();
        if (!invokeFn) throw new Error('Tauri API not available');
        return await invokeFn<RepositoryResponse>('repo_employees_find_all', { filters });
      },
      findByStaffId: async (staffId: string): Promise<RepositoryResponse> => {
        const invokeFn = await getInvoke();
        if (!invokeFn) throw new Error('Tauri API not available');
        return await invokeFn<RepositoryResponse>('repo_employees_find_by_staffId', { staffId: staffId });
      },
    },

    /**
     * Leave requests
     */
    leaveRequests: {
      findAll: async (filters?: any): Promise<RepositoryResponse> => {
        const invokeFn = await getInvoke();
        if (!invokeFn) throw new Error('Tauri API not available');
        return await invokeFn<RepositoryResponse>('repo_leave_requests_find_all', { filters });
      },
      create: async (data: any): Promise<RepositoryResponse> => {
        const invokeFn = await getInvoke();
        if (!invokeFn) throw new Error('Tauri API not available');
        return await invokeFn<RepositoryResponse>('repo_leave_requests_create', { data });
      },
    },

    /**
     * Leave balances
     */
    leaveBalances: {
      findByStaffId: async (staffId: string): Promise<RepositoryResponse> => {
        const invokeFn = await getInvoke();
        if (!invokeFn) throw new Error('Tauri API not available');
        return await invokeFn<RepositoryResponse>('repo_leave_balances_find_by_staffId', { staffId: staffId });
      },
    },

    /**
     * Background sync
     */
    getBackgroundSyncStatus: async (): Promise<RepositoryResponse> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      return await invokeFn<RepositoryResponse>('repo_get_background_sync_status');
    },

    /**
     * Conflicts
     */
    getPendingConflicts: async (): Promise<RepositoryResponse> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      return await invokeFn<RepositoryResponse>('repo_get_pending_conflicts');
    },
  },

  /**
   * File system operations
   */
  filesystem: {
    saveDocument: async (filename: string, contents: Uint8Array): Promise<string> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      return await invokeFn<string>('save_document', { filename, contents: Array.from(contents) });
    },
    readDocument: async (filePath: string): Promise<Uint8Array> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      const data = await invokeFn<number[]>('read_document', { file_path: filePath });
      return new Uint8Array(data);
    },
    getDocumentsPath: async (): Promise<string> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      return await invokeFn<string>('get_documents_path');
    },
    saveToDocuments: async (filename: string, contents: Uint8Array): Promise<string> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      return await invokeFn<string>('save_to_documents', { filename, contents: Array.from(contents) });
    },
    fileExists: async (filePath: string): Promise<boolean> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      return await invokeFn<boolean>('file_exists', { file_path: filePath });
    },
    deleteFile: async (filePath: string): Promise<void> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      await invokeFn('delete_file', { file_path: filePath });
    },
    listFiles: async (directory: string): Promise<string[]> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      return await invokeFn<string[]>('list_files', { directory });
    },
  },

  /**
   * Offline operations
   */
  offline: {
    getCacheEntry: async (key: string): Promise<{ data: any }> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      const result = await invokeFn<any>('offline_get_cache_entry', { key });
      return { data: result };
    },
    setCacheEntry: async (entry: any): Promise<void> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      await invokeFn('offline_set_cache_entry', { entry });
    },
    clearCacheEntry: async (key: string): Promise<void> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      await invokeFn('offline_clear_cache_entry', { key });
    },
    clearAllCache: async (): Promise<void> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      await invokeFn('offline_clear_all_cache');
    },
    enqueueRequest: async (request: any): Promise<void> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      await invokeFn('offline_enqueue_request', { request });
    },
    getQueuedRequests: async (): Promise<{ data: any[] }> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      const result = await invokeFn<any[]>('offline_get_queued_requests');
      return { data: result || [] };
    },
    dequeueRequest: async (id: string): Promise<void> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      await invokeFn('offline_dequeue_request', { id });
    },
    clearQueue: async (): Promise<void> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API not available');
      await invokeFn('offline_clear_queue');
    },
  },

  /**
   * Check if running in Tauri
   */
  isTauri: true,
};

/**
 * Check if Tauri is available
 */
export function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

