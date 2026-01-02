const { contextBridge, ipcRenderer } = require('electron');

// Default Vercel URL for production builds
const DEFAULT_VERCEL_URL = 'https://hr-leave-portal.vercel.app';

// Get API URL from environment variable (set at build time or runtime)
// Priority: ELECTRON_API_URL > NEXT_PUBLIC_API_URL > DEFAULT_VERCEL_URL (production only)
// This allows the Electron app to point to a remote API server
// Detect dev mode without requiring electron-is-dev (which may not be available in production)
let isDev = false;
try {
  // Try to require electron-is-dev (works in development)
  isDev = require('electron-is-dev');
} catch (e) {
  // In production, electron-is-dev may not be available
  // Fall back to NODE_ENV check
  isDev = process.env.NODE_ENV === 'development';
}
const apiUrl = process.env.ELECTRON_API_URL || 
               process.env.NEXT_PUBLIC_API_URL || 
               (isDev ? '' : DEFAULT_VERCEL_URL);

// Normalize API URL (ensure protocol, remove trailing slash)
let normalizedApiUrl = apiUrl ? apiUrl.trim() : '';
if (normalizedApiUrl && normalizedApiUrl !== '') {
  // Ensure protocol is present
  if (!normalizedApiUrl.startsWith('http://') && !normalizedApiUrl.startsWith('https://')) {
    // Default to https:// for production URLs
    normalizedApiUrl = `https://${normalizedApiUrl}`;
  }
  // Remove trailing slash
  normalizedApiUrl = normalizedApiUrl.replace(/\/$/, '');
} else {
  normalizedApiUrl = '';
}

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
  
  // Database IPC handlers for offline-first functionality
  // These enable queuing operations when offline and syncing when online
  db: {
    // Add item to sync queue (for offline operations)
    addToSyncQueue: (tableName, operation, recordId, payload) => 
      ipcRenderer.invoke('db-add-to-sync-queue', tableName, operation, recordId, payload),
    
    // Get sync queue items
    getSyncQueue: (limit = 50) => 
      ipcRenderer.invoke('db-get-sync-queue', limit),
    
    // Remove item from sync queue
    removeFromSyncQueue: (id) => 
      ipcRenderer.invoke('db-remove-from-sync-queue', id),
    
    // Increment retry count for sync queue item
    incrementSyncQueueRetry: (id, error) => 
      ipcRenderer.invoke('db-increment-sync-queue-retry', id, error),
    
    // Get last sync time
    getLastSyncTime: () => 
      ipcRenderer.invoke('db-get-last-sync-time'),
    
    // Set last sync time
    setLastSyncTime: (timestamp) => 
      ipcRenderer.invoke('db-set-last-sync-time', timestamp),
    
    // Mark record as synced
    markSynced: (tableName, recordId) => 
      ipcRenderer.invoke('db-mark-synced', tableName, recordId),
    
    // Upsert record (insert or update)
    upsertRecord: (tableName, record) => 
      ipcRenderer.invoke('db-upsert-record', tableName, record),
    
    // Get record by ID
    getRecord: (tableName, recordId) => 
      ipcRenderer.invoke('db-get-record', tableName, recordId),
    
    // Get all records from table
    getAllRecords: (tableName, limit = 1000) => 
      ipcRenderer.invoke('db-get-all-records', tableName, limit),
    
    // Delete record
    deleteRecord: (tableName, recordId) => 
      ipcRenderer.invoke('db-delete-record', tableName, recordId),
  },
  
  // Check if running in Electron
  isElectron: true,
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
