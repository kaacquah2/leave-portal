/**
 * Unified Desktop API
 * 
 * This module provides a unified interface that works with both Electron and Tauri.
 * It automatically detects which framework is available and uses the appropriate API.
 */

// Type-safe window access helper
function getElectronAPI(): Window['electronAPI'] {
  return typeof window !== 'undefined' ? window.electronAPI : undefined;
}

// Detect which desktop framework is available
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;

// Lazy load Tauri API if available
let tauriAPI: typeof import('./tauri-api').tauriAPI | null = null;

async function getTauriAPI() {
  if (!tauriAPI && isTauri) {
    const module = await import('./tauri-api');
    tauriAPI = module.tauriAPI;
  }
  return tauriAPI;
}

/**
 * Unified desktop API that works with both Electron and Tauri
 */
export const desktopAPI = {
  /**
   * Get the application version
   */
  getVersion: async (): Promise<string> => {
    if (isTauri) {
      const api = await getTauriAPI();
      if (api) {
        return await api.getVersion();
      }
    }
    const electronAPI = getElectronAPI();
    if (isElectron && electronAPI?.getVersion) {
      return await electronAPI.getVersion();
    }
    throw new Error('No desktop API available');
  },

  /**
   * Get the platform
   */
  getPlatform: async (): Promise<string> => {
    if (isTauri) {
      const api = await getTauriAPI();
      if (api) {
        return await api.getPlatform();
      }
    }
    const electronAPI = getElectronAPI();
    if (isElectron && electronAPI?.platform) {
      return electronAPI.platform;
    }
    throw new Error('No desktop API available');
  },

  /**
   * Send a message
   */
  sendMessage: async (message: string): Promise<string> => {
    if (isTauri) {
      const api = await getTauriAPI();
      if (api) {
        return await api.sendMessage(message);
      }
    }
    const electronAPI = getElectronAPI();
    if (isElectron && electronAPI?.sendMessage) {
      const result = await electronAPI.sendMessage(message);
      return result.received || '';
    }
    throw new Error('No desktop API available');
  },

  /**
   * API operations
   */
  api: {
    request: async (path: string, options?: any) => {
      if (isTauri) {
        const api = await getTauriAPI();
        if (api) {
          return await api.apiRequest(path, options);
        }
      }
      const electronAPI = getElectronAPI();
      if (isElectron && electronAPI?.apiRequest) {
        // Use existing Electron IPC
        return await electronAPI.apiRequest(path, options);
      }
      // Fallback to fetch for web
      const response = await fetch(path, options);
      return { ok: response.ok, data: await response.json() };
    },
    login: async (email: string, password: string, apiBaseUrl?: string) => {
      if (isTauri) {
        const api = await getTauriAPI();
        if (api && apiBaseUrl) {
          return await api.login(email, password, apiBaseUrl);
        }
      }
      const electronAPI = getElectronAPI();
      if (isElectron && electronAPI?.apiLogin) {
        return await electronAPI.apiLogin(email, password);
      }
      throw new Error('No desktop API available');
    },
    logout: async () => {
      if (isTauri) {
        const api = await getTauriAPI();
        if (api) {
          await api.logout();
          return;
        }
      }
      const electronAPI = getElectronAPI();
      if (isElectron && electronAPI?.apiLogout) {
        await electronAPI.apiLogout();
        return;
      }
      throw new Error('No desktop API available');
    },
    getMe: async () => {
      if (isTauri) {
        const api = await getTauriAPI();
        if (api) {
          return await api.getMe();
        }
      }
      const electronAPI = getElectronAPI();
      if (isElectron && electronAPI?.apiGetMe) {
        return await electronAPI.apiGetMe();
      }
      throw new Error('No desktop API available');
    },
    hasToken: async () => {
      if (isTauri) {
        const api = await getTauriAPI();
        if (api) {
          return await api.hasToken();
        }
      }
      const electronAPI = getElectronAPI();
      if (isElectron && electronAPI?.apiHasToken) {
        const result = await electronAPI.apiHasToken();
        return result?.hasToken || false;
      }
      return false;
    },
  },

  /**
   * Repository operations (offline-first)
   */
  repository: {
    getSyncStatus: async (apiBaseUrl: string) => {
      if (isTauri) {
        const api = await getTauriAPI();
        if (api) {
          return await api.repository.getSyncStatus(apiBaseUrl);
        }
      }
      const electronAPI = getElectronAPI();
      if (isElectron && electronAPI?.repository?.getSyncStatus) {
        return await electronAPI.repository.getSyncStatus();
      }
      throw new Error('No desktop API available');
    },
    triggerSync: async (apiBaseUrl: string) => {
      if (isTauri) {
        const api = await getTauriAPI();
        if (api) {
          return await api.repository.triggerSync(apiBaseUrl);
        }
      }
      const electronAPI = getElectronAPI();
      if (isElectron && electronAPI?.repository?.triggerSync) {
        return await electronAPI.repository.triggerSync();
      }
      throw new Error('No desktop API available');
    },
    employees: {
      findAll: async (filters?: any) => {
        if (isTauri) {
          const api = await getTauriAPI();
          if (api) {
            return await api.repository.employees.findAll(filters);
          }
        }
        const electronAPI = getElectronAPI();
        if (isElectron && electronAPI?.repository?.employees?.findAll) {
          return await electronAPI.repository.employees.findAll(filters);
        }
        throw new Error('No desktop API available');
      },
      findByStaffId: async (staffId: string) => {
        if (isTauri) {
          const api = await getTauriAPI();
          if (api) {
            return await api.repository.employees.findByStaffId(staffId);
          }
        }
        const electronAPI = getElectronAPI();
        if (isElectron && electronAPI?.repository?.employees?.findByStaffId) {
          return await electronAPI.repository.employees.findByStaffId(staffId);
        }
        throw new Error('No desktop API available');
      },
    },
    leaveRequests: {
      findAll: async (filters?: any) => {
        if (isTauri) {
          const api = await getTauriAPI();
          if (api) {
            return await api.repository.leaveRequests.findAll(filters);
          }
        }
        const electronAPI = getElectronAPI();
        if (isElectron && electronAPI?.repository?.leaveRequests?.findAll) {
          return await electronAPI.repository.leaveRequests.findAll(filters);
        }
        throw new Error('No desktop API available');
      },
      create: async (data: any) => {
        if (isTauri) {
          const api = await getTauriAPI();
          if (api) {
            return await api.repository.leaveRequests.create(data);
          }
        }
        const electronAPI = getElectronAPI();
        if (isElectron && electronAPI?.repository?.leaveRequests?.create) {
          return await electronAPI.repository.leaveRequests.create(data);
        }
        throw new Error('No desktop API available');
      },
    },
    leaveBalances: {
      findByStaffId: async (staffId: string) => {
        if (isTauri) {
          const api = await getTauriAPI();
          if (api) {
            return await api.repository.leaveBalances.findByStaffId(staffId);
          }
        }
        const electronAPI = getElectronAPI();
        if (isElectron && electronAPI?.repository?.leaveBalances?.findByStaffId) {
          return await electronAPI.repository.leaveBalances.findByStaffId(staffId);
        }
        throw new Error('No desktop API available');
      },
    },
  },

  /**
   * Check if running in a desktop environment
   */
  isDesktop: isTauri || isElectron,

  /**
   * Check if running in Tauri
   */
  isTauri,

  /**
   * File system operations
   */
  filesystem: {
    saveDocument: async (filename: string, contents: Uint8Array) => {
      if (isTauri) {
        const api = await getTauriAPI();
        if (api) {
          return await api.filesystem.saveDocument(filename, contents);
        }
      }
      const electronAPI = getElectronAPI();
      if (isElectron && electronAPI) {
        // Use Electron file operations if available
        throw new Error('Electron file operations not yet migrated');
      }
      throw new Error('No desktop API available');
    },
    readDocument: async (filePath: string) => {
      if (isTauri) {
        const api = await getTauriAPI();
        if (api) {
          return await api.filesystem.readDocument(filePath);
        }
      }
      throw new Error('No desktop API available');
    },
    getDocumentsPath: async () => {
      if (isTauri) {
        const api = await getTauriAPI();
        if (api) {
          return await api.filesystem.getDocumentsPath();
        }
      }
      throw new Error('No desktop API available');
    },
    saveToDocuments: async (filename: string, contents: Uint8Array) => {
      if (isTauri) {
        const api = await getTauriAPI();
        if (api) {
          return await api.filesystem.saveToDocuments(filename, contents);
        }
      }
      throw new Error('No desktop API available');
    },
  },

  /**
   * Check if running in Electron
   */
  isElectron,
};

