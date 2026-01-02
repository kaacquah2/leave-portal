/**
 * TypeScript definitions for Electron API exposed to renderer process
 * 
 * This file provides type definitions for the `window.electronAPI` object
 * that is exposed via contextBridge in the Electron preload script.
 * 
 * @version 1.0.0
 */

/**
 * Electron API interface exposed to the renderer process
 * 
 * This API is safely exposed via contextBridge and provides access to
 * Electron main process functionality without exposing Node.js APIs directly.
 * 
 * @example
 * ```typescript
 * if (window.electronAPI) {
 *   const version = await window.electronAPI.getVersion();
 *   console.log('App version:', version);
 * }
 * ```
 */
interface ElectronAPI {
  /**
   * Platform information
   * @readonly
   */
  platform: NodeJS.Platform;

  /**
   * Electron and Node.js version information
   * @readonly
   */
  versions: NodeJS.ProcessVersions;

  /**
   * API URL for remote server connection
   * 
   * This is the base URL that the Electron app uses to connect to the
   * remote Next.js API server. In development, this may be null (using localhost).
   * 
   * @readonly
   * @example
   * ```typescript
   * const apiUrl = window.electronAPI?.apiUrl;
   * if (apiUrl) {
   *   console.log('Connecting to:', apiUrl);
   * }
   * ```
   */
  apiUrl: string | null;

  /**
   * Get the application version
   * 
   * @returns Promise that resolves to the application version string
   * @example
   * ```typescript
   * const version = await window.electronAPI.getVersion();
   * console.log('Version:', version);
   * ```
   */
  getVersion: () => Promise<string>;

  /**
   * Send a message to the main process
   * 
   * @param message - The message to send
   * @returns Promise that resolves to a response object
   * @example
   * ```typescript
   * const response = await window.electronAPI.sendMessage('Hello from renderer!');
   * console.log('Response:', response);
   * ```
   */
  sendMessage: (message: string) => Promise<{ success: boolean; received: string }>;

  /**
   * Listen for messages from the main process
   * 
   * @param callback - Function to call when a message is received
   * @example
   * ```typescript
   * window.electronAPI.onMessage((...args) => {
   *   console.log('Message from main:', args);
   * });
   * ```
   */
  onMessage: (callback: (...args: any[]) => void) => void;

  /**
   * Remove an event listener
   * 
   * @param channel - The IPC channel name
   * @param callback - The callback function to remove
   * @example
   * ```typescript
   * const handler = (data) => console.log(data);
   * window.electronAPI.onMessage(handler);
   * // Later...
   * window.electronAPI.removeListener('message', handler);
   * ```
   */
  removeListener: (channel: string, callback: (...args: any[]) => void) => void;

  /**
   * Check if running in Electron
   * 
   * This is always `true` when the ElectronAPI is available.
   * 
   * @readonly
   */
  isElectron: true;
}

/**
 * Extended Window interface with Electron API
 * 
 * This extends the global Window interface to include the electronAPI
 * property that is injected by the Electron preload script.
 */
interface Window {
  /**
   * Electron API exposed via contextBridge
   * 
   * This property is only available when running in an Electron environment.
   * Check for its existence before using it.
   * 
   * @example
   * ```typescript
   * if (window.electronAPI) {
   *   // Use Electron-specific features
   *   const version = await window.electronAPI.getVersion();
   * }
   * ```
   */
  electronAPI?: ElectronAPI;

  /**
   * Direct API URL exposed by Electron preload script
   * 
   * This is a convenience property that provides direct access to the
   * API URL without going through the electronAPI object.
   * 
   * @example
   * ```typescript
   * const apiUrl = window.__ELECTRON_API_URL__;
   * if (apiUrl) {
   *   console.log('API URL:', apiUrl);
   * }
   * ```
   */
  __ELECTRON_API_URL__?: string;
}

/**
 * API version information
 * 
 * This can be used for API versioning in the future.
 */
declare const ELECTRON_API_VERSION = '1.0.0';

