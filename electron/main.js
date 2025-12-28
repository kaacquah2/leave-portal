const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

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
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Load the app
  // Check if we have a remote API URL (Vercel deployment)
  const remoteApiUrl = process.env.ELECTRON_API_URL || process.env.NEXT_PUBLIC_API_URL;
  
  let startUrl;
  if (isDev) {
    // Development: always use localhost
    startUrl = 'http://localhost:3000';
  } else if (remoteApiUrl) {
    // Production with remote API: load from Vercel/hosted URL
    // Remove trailing slash and ensure proper format
    startUrl = remoteApiUrl.replace(/\/$/, '');
    console.log('[Electron] Loading from remote URL:', startUrl);
  } else {
    // Production without remote API: load from local files (standalone build)
    // Use app.getAppPath() for packaged apps, __dirname for development
    const appPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'app.asar', 'out')
      : path.join(__dirname, '../out');
    
    startUrl = `file://${path.join(appPath, 'index.html')}`;
    console.log('[Electron] Loading from local files:', startUrl);
    console.log('[Electron] App path:', appPath);
    console.log('[Electron] WARNING: No remote API URL set. API calls will fail.');
    console.log('[Electron] Set ELECTRON_API_URL environment variable to point to your API server.');
  }
  
  // Add error handling
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron] Failed to load:', validatedURL, errorCode, errorDescription);
    mainWindow.webContents.executeJavaScript(`
      document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; font-family: Arial, sans-serif;">
        <h1 style="color: #dc2626;">Failed to Load Application</h1>
        <p style="color: #666; margin: 20px 0;">Error: ${errorDescription}</p>
        <p style="color: #666;">URL: ${validatedURL}</p>
        <p style="color: #666; margin-top: 20px;">Please check the console for more details.</p>
      </div>';
    `);
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

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
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

