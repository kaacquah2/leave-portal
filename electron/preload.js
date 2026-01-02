/**
 * Electron Preload Script
 * 
 * Safely exposes Electron APIs to the renderer process via contextBridge.
 * This script runs in an isolated context with access to both Node.js APIs
 * and the renderer's DOM APIs.
 * 
 * @version 1.0.0
 * @see https://www.electronjs.org/docs/latest/tutorial/context-isolation
 */

const { contextBridge, ipcRenderer } = require('electron');

// API version for compatibility checking
const API_VERSION = '1.0.0';

// Get API URL from main process via IPC (consistent with main process)
// This ensures the same API URL resolution logic is used
let normalizedApiUrl = '';

// Try to get API URL synchronously first (for immediate access)
try {
  // Use synchronous IPC call for initial setup
  normalizedApiUrl = ipcRenderer.sendSync('get-api-url-sync') || '';
} catch (e) {
  // Fallback to async if sync fails
  console.warn('[Preload] Could not get API URL synchronously, will use async');
}

/**
 * Electron API exposed to renderer process
 * 
 * All methods are safely exposed via contextBridge to prevent exposing
 * Node.js APIs directly to the renderer process.
 * 
 * @typedef {Object} ElectronAPI
 * @property {string} platform - Platform information (win32, darwin, linux)
 * @property {Object} versions - Electron and Node.js version information
 * @property {string|null} apiUrl - API URL for remote server connection
 * @property {Function} getVersion - Get the application version
 * @property {Function} sendMessage - Send a message to the main process
 * @property {Function} onMessage - Listen for messages from the main process
 * @property {Function} removeListener - Remove an event listener
 * @property {boolean} isElectron - Always true when ElectronAPI is available
 * @property {string} apiVersion - API version for compatibility checking
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Platform information
   * @type {string}
   * @readonly
   */
  platform: process.platform,
  
  /**
   * Electron and Node.js version information
   * @type {Object}
   * @readonly
   */
  versions: process.versions,
  
  /**
   * API URL for remote server connection
   * 
   * This is the base URL that the Electron app uses to connect to the
   * remote Next.js API server. In development, this may be null (using localhost).
   * 
   * @type {string|null}
   * @readonly
   */
  apiUrl: normalizedApiUrl || null,
  
  /**
   * API version for compatibility checking
   * @type {string}
   * @readonly
   */
  apiVersion: API_VERSION,
  
  /**
   * Get the application version
   * 
   * @returns {Promise<string>} Promise that resolves to the application version string
   * @example
   * ```javascript
   * const version = await window.electronAPI.getVersion();
   * console.log('Version:', version);
   * ```
   */
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  /**
   * Send a message to the main process
   * 
   * @param {string} message - The message to send
   * @returns {Promise<Object>} Promise that resolves to a response object
   * @example
   * ```javascript
   * const response = await window.electronAPI.sendMessage('Hello from renderer!');
   * console.log('Response:', response);
   * ```
   */
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  
  /**
   * Listen for messages from the main process
   * 
   * @param {Function} callback - Function to call when a message is received
   * @example
   * ```javascript
   * window.electronAPI.onMessage((...args) => {
   *   console.log('Message from main:', args);
   * });
   * ```
   */
  onMessage: (callback) => {
    ipcRenderer.on('message', (event, ...args) => callback(...args));
  },
  
  /**
   * Remove an event listener
   * 
   * @param {string} channel - The IPC channel name
   * @param {Function} callback - The callback function to remove
   * @example
   * ```javascript
   * const handler = (data) => console.log(data);
   * window.electronAPI.onMessage(handler);
   * // Later...
   * window.electronAPI.removeListener('message', handler);
   * ```
   */
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
  
  /**
   * Check if running in Electron
   * 
   * This is always true when the ElectronAPI is available.
   * 
   * @type {boolean}
   * @readonly
   */
  isElectron: true,

  /**
   * Repository operations (offline-first)
   * All data access goes through IPC - NO direct network access
   */
  repository: {
    // Sync operations
    getSyncStatus: () => ipcRenderer.invoke('repo:sync:status'),
    triggerSync: () => ipcRenderer.invoke('repo:sync:trigger'),
    getPendingCount: () => ipcRenderer.invoke('repo:sync:pendingCount'),
    getBackgroundSyncStatus: () => ipcRenderer.invoke('repo:sync:backgroundStatus'),
    getIncrementalSyncStats: () => ipcRenderer.invoke('repo:sync:incrementalStats'),

    // Conflict resolution
    conflicts: {
      getPending: () => ipcRenderer.invoke('repo:conflicts:getPending'),
      resolve: (tableName, recordId, useServer) => ipcRenderer.invoke('repo:conflicts:resolve', tableName, recordId, useServer),
    },

    // Offline approvals
    approvals: {
      create: (leaveRequestId, approverId, approverName, approverRole, action, level, comments) => 
        ipcRenderer.invoke('repo:approvals:create', leaveRequestId, approverId, approverName, approverRole, action, level, comments),
      getPending: (approverId) => ipcRenderer.invoke('repo:approvals:getPending', approverId),
      canApprove: (role) => ipcRenderer.invoke('repo:approvals:canApprove', role),
    },

    // Employee operations (read-only offline)
    employees: {
      findAll: (filters) => ipcRenderer.invoke('repo:employees:findAll', filters),
      findByStaffId: (staffId) => ipcRenderer.invoke('repo:employees:findByStaffId', staffId),
    },

    // Leave request operations (read + write offline)
    leaveRequests: {
      findAll: (filters) => ipcRenderer.invoke('repo:leaveRequests:findAll', filters),
      create: (data) => ipcRenderer.invoke('repo:leaveRequests:create', data),
    },

    // Leave balance operations (read-only offline, server-authoritative)
    leaveBalances: {
      findByStaffId: (staffId) => ipcRenderer.invoke('repo:leaveBalances:findByStaffId', staffId),
    },
  },
});

// Expose API URL (will be updated async if needed)
contextBridge.exposeInMainWorld('__ELECTRON_API_URL__', normalizedApiUrl);

// Get API URL asynchronously as fallback
ipcRenderer.invoke('get-api-url').then((url) => {
  if (url && url !== normalizedApiUrl) {
    normalizedApiUrl = url;
    // Update the exposed value (if possible)
    // Note: contextBridge values are immutable, but the app can use the IPC call
  }
});

// Log that preload script has loaded
console.log('[Preload] Electron preload script loaded');
if (normalizedApiUrl) {
  console.log('[Preload] API URL configured:', normalizedApiUrl);
} else {
  console.log('[Preload] Development mode - using relative URLs (localhost)');
}
