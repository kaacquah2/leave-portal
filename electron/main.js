const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;
let localDatabase = null;

// Initialize local database (only in Electron)
function initializeLocalDatabase() {
  try {
    const { getLocalDatabase } = require('./database.js');
    localDatabase = getLocalDatabase();
    localDatabase.initialize();
    console.log('[Electron] Local SQLite database initialized');
  } catch (error) {
    console.error('[Electron] Failed to initialize local database:', error);
    // Continue without offline mode if database fails
  }
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    icon: (() => {
      // Try different icon formats based on platform
      const iconPath = process.platform === 'win32' 
        ? path.join(__dirname, '../public/mofa.ico')
        : process.platform === 'darwin'
        ? path.join(__dirname, '../public/icon.icns')
        : path.join(__dirname, '../public/icon.png');
      
      // Fallback to png if platform-specific icon doesn't exist
      const fs = require('fs');
      if (fs.existsSync(iconPath)) {
        return iconPath;
      }
      // Try icon.ico as fallback
      const iconIcoPath = path.join(__dirname, '../public/icon.ico');
      if (fs.existsSync(iconIcoPath)) {
        return iconIcoPath;
      }
      // Try icon-256x256.png (created by our script)
      const icon256Path = path.join(__dirname, '../public/icon-256x256.png');
      if (fs.existsSync(icon256Path)) {
        return icon256Path;
      }
      // Try generic png
      const pngPath = path.join(__dirname, '../public/icon.png');
      if (fs.existsSync(pngPath)) {
        return pngPath;
      }
      // Try mofa-logo as fallback
      const logoPath = path.join(__dirname, '../public/mofa-logo.png');
      if (fs.existsSync(logoPath)) {
        return logoPath;
      }
      // No icon (Electron will use default)
      return undefined;
    })(),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false, // Don't show until ready
    backgroundColor: '#ffffff',
    autoHideMenuBar: false, // Show menu bar on Windows
    frame: true, // Show window frame
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus on window
    // Temporarily enable DevTools for debugging (remove in production)
    if (isDev || process.env.ENABLE_DEVTOOLS === 'true') {
      mainWindow.webContents.openDevTools();
    }
  });
  
  // Also show window after a delay if ready-to-show doesn't fire (fallback)
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.log('[Electron] Showing window after timeout (ready-to-show may not have fired)');
      mainWindow.show();
    }
  }, 2000); // 2 second fallback

  // Load the app - Hybrid approach: Local files first, fallback to Vercel
  // Default Vercel URL for production builds
  const DEFAULT_VERCEL_URL = 'https://hr-leave-portal.vercel.app';
  
  // Check if we have a remote API URL (Vercel deployment)
  // Priority: ELECTRON_API_URL > NEXT_PUBLIC_API_URL > DEFAULT_VERCEL_URL
  const remoteApiUrl = process.env.ELECTRON_API_URL || 
                       process.env.NEXT_PUBLIC_API_URL || 
                       (isDev ? null : DEFAULT_VERCEL_URL);
  
  let startUrl;
  if (isDev) {
    // Development: always use localhost
    startUrl = 'http://localhost:3000';
    console.log('[Electron] Development mode - loading from localhost:3000');
  } else {
    // Production: Try to load from local static files first (works offline)
    // Static files are bundled in the Electron app and accessible via ASAR or unpacked
    const fs = require('fs');
    
    // Try multiple possible locations for static files (in order of preference)
    const possiblePaths = [
      // 1. Relative to main.js (development/unpacked)
      path.join(__dirname, '../out/index.html'),
      // 2. In ASAR archive (most common in production)
      path.join(process.resourcesPath, 'app.asar', 'out', 'index.html'),
      // 3. Unpacked from ASAR (if asarUnpack is configured)
      path.join(process.resourcesPath, 'app', 'out', 'index.html'),
      // 4. Alternative ASAR location
      path.join(app.getAppPath(), 'out', 'index.html'),
    ];
    
    // Check each path
    let localIndexPath = null;
    for (const possiblePath of possiblePaths) {
      try {
        if (fs.existsSync(possiblePath)) {
          localIndexPath = possiblePath;
          console.log('[Electron] Found static files at:', possiblePath);
          break;
        }
      } catch (error) {
        // Continue checking other paths
        console.log('[Electron] Path check failed:', possiblePath, error.message);
      }
    }
    
    if (localIndexPath) {
      // Use local static files (works offline!)
      // Note: Electron can read from ASAR archives directly with file:// protocol
      startUrl = `file://${localIndexPath}`;
      console.log('[Electron] ✅ Production mode - loading from LOCAL static files (OFFLINE-CAPABLE)');
      console.log('[Electron] 📁 Static files location:', localIndexPath);
      console.log('[Electron] 🌐 API calls will be made to:', remoteApiUrl || DEFAULT_VERCEL_URL);
      console.log('[Electron] 💡 App will work WITHOUT internet connection!');
    } else {
      // Fallback to Vercel URL (requires internet)
      startUrl = (remoteApiUrl || DEFAULT_VERCEL_URL).replace(/\/$/, '');
      console.log('[Electron] ⚠️  Production mode - LOCAL static files not found');
      console.log('[Electron] 🌐 Loading from remote URL (requires internet):', startUrl);
      console.log('[Electron] ⚠️  WARNING: App requires internet connection to load');
      console.log('[Electron] 📦 Check that "out/**/*" is included in electron-builder files array');
      console.log('[Electron] 🔧 API calls will be made to:', startUrl);
    }
  }
  
  // Add error handling with better connection status and offline fallback
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron] Failed to load:', validatedURL, errorCode, errorDescription);
    
    // Don't show error for navigation cancellations (common in SPAs)
    if (errorCode === -3) {
      console.log('[Electron] Navigation cancelled (likely SPA routing)');
      return;
    }
    
    // If loading from remote URL failed, try to fallback to local files
    if (validatedURL && validatedURL.startsWith('http')) {
      console.log('[Electron] Remote URL failed, attempting to load from local static files...');
      const fs = require('fs');
      const staticFilesPath = path.join(__dirname, '../out/index.html');
      const asarStaticPath = path.join(process.resourcesPath, 'app.asar', 'out', 'index.html');
      const asarUnpackedPath = path.join(process.resourcesPath, 'app', 'out', 'index.html');
      
      let localIndexPath = null;
      if (fs.existsSync(staticFilesPath)) {
        localIndexPath = staticFilesPath;
      } else if (fs.existsSync(asarStaticPath)) {
        localIndexPath = asarStaticPath;
      } else if (fs.existsSync(asarUnpackedPath)) {
        localIndexPath = asarUnpackedPath;
      }
      
      if (localIndexPath) {
        console.log('[Electron] Found local static files, loading from:', localIndexPath);
        mainWindow.loadURL(`file://${localIndexPath}`);
        return; // Don't show error, we're trying local files
      }
    }
    
    const errorHtml = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; font-family: Arial, sans-serif; padding: 20px; text-align: center; background: #f9fafb;">
        <div style="max-width: 600px; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h1 style="color: #dc2626; margin-bottom: 20px; font-size: 24px;">Failed to Load Application</h1>
          <p style="color: #666; margin: 10px 0; font-size: 14px;"><strong>Error:</strong> ${errorDescription}</p>
          <p style="color: #666; margin: 10px 0; font-size: 14px;"><strong>Error Code:</strong> ${errorCode}</p>
          <p style="color: #666; margin: 10px 0; font-size: 14px;"><strong>URL:</strong> ${validatedURL}</p>
          <div style="margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px;">
            <p style="color: #374151; margin-bottom: 10px; font-weight: 600;"><strong>Possible Solutions:</strong></p>
            <ul style="text-align: left; color: #6b7280; margin: 10px 0; padding-left: 20px; font-size: 14px;">
              <li style="margin: 8px 0;">Check your internet connection (if loading from remote)</li>
              <li style="margin: 8px 0;">Verify the server is accessible: ${startUrl}</li>
              <li style="margin: 8px 0;">Check if the server is running and responding</li>
              <li style="margin: 8px 0;">Try restarting the application</li>
              <li style="margin: 8px 0;">Check firewall settings</li>
            </ul>
          </div>
          <button onclick="window.location.reload()" style="margin-top: 20px; padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 500;">Retry Connection</button>
        </div>
      </div>
    `;
    
    mainWindow.webContents.executeJavaScript(`
      if (document.body) {
        document.body.innerHTML = ${JSON.stringify(errorHtml)};
      }
    `);
  });
  
  // Add timeout for page load with better connection status
  let loadTimeout;
  let connectionCheckInterval;
  
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('[Electron] Page started loading from:', startUrl);
    
    // Set a 45-second timeout for page load (increased for remote connections)
    loadTimeout = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.error('[Electron] Page load timeout after 45 seconds');
        mainWindow.webContents.executeJavaScript(`
          (function() {
            if (document.body && !document.body.querySelector('.timeout-message')) {
              const timeoutDiv = document.createElement('div');
              timeoutDiv.className = 'timeout-message';
              timeoutDiv.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: #fef3c7; border-bottom: 2px solid #f59e0b; padding: 15px; text-align: center; z-index: 10000; font-family: Arial, sans-serif;';
              timeoutDiv.innerHTML = '<p style="margin: 0; color: #92400e;"><strong>Loading is taking longer than expected.</strong> The application is connecting to: ${startUrl}. If this persists, please check your internet connection.</p>';
              document.body.appendChild(timeoutDiv);
            }
          })();
        `);
      }
    }, 45000); // 45 seconds for remote connections
    
    // Check connection status periodically
    connectionCheckInterval = setInterval(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.executeJavaScript(`
          (function() {
            const apiUrl = window.__ELECTRON_API_URL__ || window.electronAPI?.apiUrl || '';
            if (apiUrl) {
              console.log('[Renderer] API URL configured:', apiUrl);
            } else {
              console.warn('[Renderer] API URL not configured');
            }
          })();
        `).catch(err => console.error('[Electron] Connection check error:', err));
      }
    }, 5000); // Check every 5 seconds
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      console.log('[Electron] Page finished loading successfully');
    }
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
    }
  });
  
  mainWindow.webContents.on('did-stop-loading', () => {
    if (loadTimeout) {
      clearTimeout(loadTimeout);
    }
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
    }
  });
  
  // Log console messages from renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}]:`, message);
  });
  
  mainWindow.loadURL(startUrl);

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      const currentOrigin = startUrl.startsWith('file://') 
        ? 'file://' 
        : new URL(startUrl).origin;
      
      // Allow navigation within the same origin (for SPA routing)
      // Allow localhost in dev mode
      // For file:// protocol, allow all file:// URLs
      if (startUrl.startsWith('file://')) {
        // Allow all file:// navigation for SPA routing
        if (!navigationUrl.startsWith('file://')) {
          event.preventDefault();
          shell.openExternal(navigationUrl);
        }
      } else if (parsedUrl.origin !== currentOrigin && !isDev) {
        event.preventDefault();
        shell.openExternal(navigationUrl);
      }
    } catch (e) {
      // Invalid URL, prevent navigation
      event.preventDefault();
    }
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' },
        { role: 'paste', label: 'Paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'forceReload', label: 'Force Reload' },
        { role: 'toggleDevTools', label: 'Toggle Developer Tools' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Actual Size' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Full Screen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize', label: 'Minimize' },
        { role: 'close', label: 'Close' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About HR Leave Portal',
          click: () => {
            // You can create an about dialog here
            console.log('HR Leave Portal v0.1.0');
          },
        },
      ],
    },
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about', label: 'About ' + app.getName() },
        { type: 'separator' },
        { role: 'services', label: 'Services' },
        { type: 'separator' },
        { role: 'hide', label: 'Hide ' + app.getName() },
        { role: 'hideOthers', label: 'Hide Others' },
        { role: 'unhide', label: 'Show All' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit ' + app.getName() },
      ],
    });

    // Window menu
    template[4].submenu = [
      { role: 'close', label: 'Close' },
      { role: 'minimize', label: 'Minimize' },
      { role: 'zoom', label: 'Zoom' },
      { type: 'separator' },
      { role: 'front', label: 'Bring All to Front' },
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Setup IPC handlers for local database operations
function setupIpcHandlers() {
  if (!localDatabase) return;

  // Get sync queue
  ipcMain.handle('db:get-sync-queue', async (event, limit = 50) => {
    try {
      return localDatabase.getSyncQueue(limit);
    } catch (error) {
      console.error('[IPC] Error getting sync queue:', error);
      return [];
    }
  });

  // Add to sync queue
  ipcMain.handle('db:add-to-sync-queue', async (event, tableName, operation, recordId, payload) => {
    try {
      return localDatabase.addToSyncQueue(tableName, operation, recordId, payload);
    } catch (error) {
      console.error('[IPC] Error adding to sync queue:', error);
      throw error;
    }
  });

  // Remove from sync queue
  ipcMain.handle('db:remove-from-sync-queue', async (event, id) => {
    try {
      localDatabase.removeFromSyncQueue(id);
    } catch (error) {
      console.error('[IPC] Error removing from sync queue:', error);
      throw error;
    }
  });

  // Get last sync time
  ipcMain.handle('db:get-last-sync-time', async () => {
    try {
      return localDatabase.getLastSyncTime();
    } catch (error) {
      console.error('[IPC] Error getting last sync time:', error);
      return null;
    }
  });

  // Set last sync time
  ipcMain.handle('db:set-last-sync-time', async (event, timestamp) => {
    try {
      localDatabase.setLastSyncTime(timestamp);
    } catch (error) {
      console.error('[IPC] Error setting last sync time:', error);
      throw error;
    }
  });

  // Mark record as synced
  ipcMain.handle('db:mark-synced', async (event, tableName, recordId) => {
    try {
      localDatabase.markSynced(tableName, recordId);
    } catch (error) {
      console.error('[IPC] Error marking as synced:', error);
      throw error;
    }
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Initialize local database first
  initializeLocalDatabase();
  
  // Setup IPC handlers
  setupIpcHandlers();
  
  // Create window
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup database on app quit
app.on('before-quit', () => {
  if (localDatabase) {
    try {
      localDatabase.close();
      console.log('[Electron] Local database closed');
    } catch (error) {
      console.error('[Electron] Error closing database:', error);
    }
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

