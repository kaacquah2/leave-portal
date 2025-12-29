const { contextBridge, ipcRenderer } = require('electron');

// Default Vercel URL for production builds
const DEFAULT_VERCEL_URL = 'https://hr-leave-portal.vercel.app';

// Get API URL from environment variable (set at build time or runtime)
// Priority: ELECTRON_API_URL > NEXT_PUBLIC_API_URL > DEFAULT_VERCEL_URL (production only)
// This allows the Electron app to point to a remote API server
const isDev = process.env.NODE_ENV === 'development' || require('electron-is-dev');
const apiUrl = process.env.ELECTRON_API_URL || 
               process.env.NEXT_PUBLIC_API_URL || 
               (isDev ? '' : DEFAULT_VERCEL_URL);

// Normalize API URL (remove trailing slash)
const normalizedApiUrl = apiUrl ? apiUrl.replace(/\/$/, '') : '';

// Expose protected methods that allow the renderer process
// to use Electron APIs without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform information
  platform: process.platform,
  versions: process.versions,
  
  // API URL for remote server connection
  apiUrl: normalizedApiUrl || null,
  
  // Example: Get app version
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Example: Send message to main process
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  
  // Example: Listen for messages from main process
  onMessage: (callback) => {
    ipcRenderer.on('message', (event, ...args) => callback(...args));
  },
  
  // Remove listener
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
  
  // Check if running in Electron
  isElectron: true,
  
  // Local database operations (offline mode)
  db: {
    getSyncQueue: (limit) => ipcRenderer.invoke('db:get-sync-queue', limit),
    addToSyncQueue: (tableName, operation, recordId, payload) => 
      ipcRenderer.invoke('db:add-to-sync-queue', tableName, operation, recordId, payload),
    removeFromSyncQueue: (id) => ipcRenderer.invoke('db:remove-from-sync-queue', id),
    getLastSyncTime: () => ipcRenderer.invoke('db:get-last-sync-time'),
    setLastSyncTime: (timestamp) => ipcRenderer.invoke('db:set-last-sync-time', timestamp),
    markSynced: (tableName, recordId) => ipcRenderer.invoke('db:mark-synced', tableName, recordId),
  },
});

// Always expose API URL directly on window for easier access
// This is safe because we control the value
// In production, this will always have a value (either from env or default Vercel URL)
if (normalizedApiUrl) {
  contextBridge.exposeInMainWorld('__ELECTRON_API_URL__', normalizedApiUrl);
  console.log('[Preload] Electron API URL configured:', normalizedApiUrl);
} else {
  console.log('[Preload] Development mode - using relative URLs (localhost)');
  // Still expose empty string so the app knows it's in Electron
  contextBridge.exposeInMainWorld('__ELECTRON_API_URL__', '');
}

// Log that preload script has loaded
console.log('[Preload] Electron preload script loaded');
console.log('[Preload] Environment:', isDev ? 'development' : 'production');
