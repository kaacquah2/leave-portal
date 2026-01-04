/**
 * Window interface extensions for desktop APIs
 * 
 * These types extend the Window interface to include:
 * - Tauri API (__TAURI__)
 * - Electron API (electronAPI) - legacy support
 */

interface Window {
  /**
   * Tauri API - available when running in Tauri
   */
  __TAURI__?: {
    [key: string]: any;
  };

  /**
   * Electron API - legacy support (deprecated, use Tauri instead)
   */
  electronAPI?: {
    getVersion?: () => Promise<string>;
    platform?: string;
    sendMessage?: (message: string) => Promise<{ received?: string }>;
    apiRequest?: (path: string, options?: any) => Promise<any>;
    apiLogin?: (email: string, password: string) => Promise<any>;
    apiLogout?: () => Promise<void>;
    apiGetMe?: () => Promise<any>;
    apiHasToken?: () => Promise<{ hasToken: boolean }>;
    repository?: {
      getSyncStatus?: () => Promise<any>;
      triggerSync?: () => Promise<any>;
      employees?: {
        findAll?: (filters?: any) => Promise<any>;
        findByStaffId?: (staffId: string) => Promise<any>;
      };
      leaveRequests?: {
        findAll?: (filters?: any) => Promise<any>;
        create?: (data: any) => Promise<any>;
      };
      leaveBalances?: {
        findByStaffId?: (staffId: string) => Promise<any>;
      };
    };
  };

  /**
   * Legacy Electron API URL injection
   */
  __ELECTRON_API_URL__?: string;
}

