const { contextBridge, ipcRenderer } = require('electron');

// Get API URL from environment variable (set at build time or runtime)
// This allows the Electron app to point to a remote API server
const apiUrl = process.env.ELECTRON_API_URL || process.env.NEXT_PUBLIC_API_URL || '';

// Expose protected methods that allow the renderer process
// to use Electron APIs without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform information
  platform: process.platform,
  versions: process.versions,
  
  // API URL for remote server connection
  apiUrl: apiUrl || null,
  
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
});

// Also expose API URL directly on window for easier access
// This is safe because we control the value
if (apiUrl) {
  contextBridge.exposeInMainWorld('__ELECTRON_API_URL__', apiUrl);
  console.log('[Preload] Electron API URL configured:', apiUrl);
} else {
  console.log('[Preload] Electron API URL not set - using relative URLs (localhost or same origin)');

// Log that preload script has loaded
console.log('Electron preload script loaded');

