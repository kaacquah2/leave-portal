const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
// Detect dev mode - try electron-is-dev, fallback to NODE_ENV
let isDev = false;
try {
  isDev = require('electron-is-dev');
} catch (e) {
  // In production, electron-is-dev may not be available
  isDev = process.env.NODE_ENV === 'development';
}

let mainWindow;

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

  // Load the app from remote URL (requires internet)
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
    // Production: Always load from remote URL (requires internet)
    startUrl = (remoteApiUrl || DEFAULT_VERCEL_URL).replace(/\/$/, '');
    console.log('[Electron] Production mode - loading from remote URL (requires internet):', startUrl);
    console.log('[Electron] ⚠️  WARNING: App requires internet connection to load');
    console.log('[Electron] 🔧 API calls will be made to:', startUrl);
  }
  
  // Add error handling with better connection status and offline fallback
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron] Failed to load:', validatedURL, errorCode, errorDescription);
    
    // Don't show error for navigation cancellations (common in SPAs)
    if (errorCode === -3) {
      console.log('[Electron] Navigation cancelled (likely SPA routing)');
      return;
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
      if (parsedUrl.origin !== currentOrigin && !isDev) {
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


// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
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


// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

