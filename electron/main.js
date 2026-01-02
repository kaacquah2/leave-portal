const { app, BrowserWindow, Menu, shell, ipcMain, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
// Import modules
const db = require('./database');
const logger = require('./logger');
const errorReporter = require('./error-reporter');

// Detect dev mode - try electron-is-dev, fallback to NODE_ENV
let isDev = false;
try {
  isDev = require('electron-is-dev');
} catch (e) {
  // In production, electron-is-dev may not be available
  isDev = process.env.NODE_ENV === 'development';
}

let mainWindow;
let splashWindow = null;

// Register IPC handlers
function setupIpcHandlers() {
  // Handle get-version request
  ipcMain.handle('get-version', () => {
    return app.getVersion();
  });

  // Handle send-message request
  ipcMain.handle('send-message', (event, message) => {
    console.log('[Electron] Message from renderer:', message);
    // You can add custom message handling here
    return { success: true, received: message };
  });

  // Database IPC handlers
  ipcMain.handle('db-add-to-sync-queue', async (event, tableName, operation, recordId, payload) => {
    try {
      const id = db.addToSyncQueue(tableName, operation, recordId, payload);
      return { success: true, id };
    } catch (error) {
      console.error('[Electron] Error adding to sync queue:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-get-sync-queue', async (event, limit = 50) => {
    try {
      const items = db.getSyncQueue(limit);
      return { success: true, items };
    } catch (error) {
      console.error('[Electron] Error getting sync queue:', error);
      return { success: false, error: error.message, items: [] };
    }
  });

  ipcMain.handle('db-remove-from-sync-queue', async (event, id) => {
    try {
      db.removeFromSyncQueue(id);
      return { success: true };
    } catch (error) {
      console.error('[Electron] Error removing from sync queue:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-increment-sync-queue-retry', async (event, id, error) => {
    try {
      db.incrementSyncQueueRetry(id, error);
      return { success: true };
    } catch (err) {
      console.error('[Electron] Error incrementing sync queue retry:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db-get-last-sync-time', async () => {
    try {
      const timestamp = db.getLastSyncTime();
      return { success: true, timestamp };
    } catch (error) {
      console.error('[Electron] Error getting last sync time:', error);
      return { success: false, error: error.message, timestamp: null };
    }
  });

  ipcMain.handle('db-set-last-sync-time', async (event, timestamp) => {
    try {
      db.setLastSyncTime(timestamp);
      return { success: true };
    } catch (error) {
      console.error('[Electron] Error setting last sync time:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-mark-synced', async (event, tableName, recordId) => {
    try {
      db.markSynced(tableName, recordId);
      return { success: true };
    } catch (error) {
      console.error('[Electron] Error marking as synced:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-upsert-record', async (event, tableName, record) => {
    try {
      db.upsertRecord(tableName, record);
      return { success: true };
    } catch (error) {
      console.error('[Electron] Error upserting record:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-get-record', async (event, tableName, recordId) => {
    try {
      const record = db.getRecord(tableName, recordId);
      return { success: true, record };
    } catch (error) {
      console.error('[Electron] Error getting record:', error);
      return { success: false, error: error.message, record: null };
    }
  });

  ipcMain.handle('db-get-all-records', async (event, tableName, limit = 1000) => {
    try {
      const records = db.getAllRecords(tableName, limit);
      return { success: true, records };
    } catch (error) {
      console.error('[Electron] Error getting all records:', error);
      return { success: false, error: error.message, records: [] };
    }
  });

  ipcMain.handle('db-delete-record', async (event, tableName, recordId) => {
    try {
      db.deleteRecord(tableName, recordId);
      return { success: true };
    } catch (error) {
      console.error('[Electron] Error deleting record:', error);
      return { success: false, error: error.message };
    }
  });
}

// Register custom protocol for better security and reliability (better than file://)
function setupProtocol() {
  // Only register if not already registered
  if (!protocol.isProtocolRegistered('app')) {
    protocol.registerFileProtocol('app', (request, callback) => {
      // Remove 'app://' or 'app:///' prefix
      let url = request.url.replace(/^app:\/\/+/, '');
      // Ensure it starts with / for proper path resolution
      if (!url.startsWith('/')) {
        url = '/' + url;
      }
      
      // Find the out directory in various possible locations
      const possibleOutDirs = [
        path.join(process.resourcesPath || app.getAppPath(), 'app', 'out'),
        path.join(process.resourcesPath || app.getAppPath(), 'out'),
        path.join(app.getAppPath(), 'out'),
        path.join(__dirname, '..', 'out'),
      ];
      
      let outDir = null;
      for (const dir of possibleOutDirs) {
        if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.html'))) {
          outDir = dir;
          break;
        }
      }
      
      if (!outDir) {
        console.error('[Electron] ❌ Could not find out directory for custom protocol');
        callback({ error: -6 }); // ERR_FILE_NOT_FOUND
        return;
      }
      
      // Remove leading slash from URL for path.join
      let urlPath = url.startsWith('/') ? url.substring(1) : url;
      
      // Fix double _next paths that might occur (e.g., _next/_next/static/... -> _next/static/...)
      // This can happen if base path or webpack publicPath is incorrectly set
      urlPath = urlPath.replace(/^_next\/_next\//, '_next/');
      
      // Handle image paths that might start with ./ (from path fixing script)
      // e.g., "./mofa-logo.png" -> "mofa-logo.png"
      if (urlPath.startsWith('./')) {
        urlPath = urlPath.substring(2);
      }
      
      // Normalize the path (handles .., ., and multiple slashes)
      const filePath = path.normalize(path.join(outDir, urlPath));
      
      // Security: Only allow files from the out directory
      const normalizedOutDir = path.normalize(outDir);
      if (!filePath.startsWith(normalizedOutDir)) {
        console.warn('[Electron] ⚠️  Blocked access to file outside out directory:', filePath);
        callback({ error: -6 }); // ERR_FILE_NOT_FOUND
        return;
      }
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        // Try to fix double _next issue if file not found
        if (urlPath.includes('_next/_next/')) {
          const fixedPath = filePath.replace(/[\\/]_next[\\/]_next[\\/]/g, path.sep + '_next' + path.sep);
          if (fs.existsSync(fixedPath)) {
            console.log('[Electron] ✅ Fixed double _next path:', urlPath, '->', path.relative(outDir, fixedPath));
            callback({ path: fixedPath });
            return;
          }
        }
        console.warn('[Electron] ⚠️  File not found:', filePath);
        console.warn('[Electron] ⚠️  Requested URL:', request.url);
        console.warn('[Electron] ⚠️  Resolved path:', urlPath);
        callback({ error: -6 }); // ERR_FILE_NOT_FOUND
        return;
      }
      
      // For HTML files, inject CSP meta tag to allow app:// protocol
      if (filePath.endsWith('.html')) {
        try {
          let htmlContent = fs.readFileSync(filePath, 'utf8');
          
          // Remove any existing CSP meta tag
          htmlContent = htmlContent.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');
          
          // Create CSP meta tag with app:// protocol support
          const cspMeta = '<meta http-equiv="Content-Security-Policy" content="default-src app: \'self\' https:; script-src app: \'self\' \'unsafe-inline\' \'unsafe-eval\' https:; style-src app: \'self\' \'unsafe-inline\' https:; style-src-elem app: \'self\' \'unsafe-inline\' https:; img-src app: \'self\' data: https:; font-src app: \'self\' data: https:; connect-src \'self\' https:; manifest-src app: \'self\' https:;">';
          
          // Insert CSP meta tag right after <head> tag
          if (htmlContent.includes('<head>')) {
            htmlContent = htmlContent.replace('<head>', `<head>${cspMeta}`);
          } else if (htmlContent.includes('<head ')) {
            // Handle <head> with attributes
            htmlContent = htmlContent.replace(/(<head[^>]*>)/, `$1${cspMeta}`);
          }
          
          // Write modified HTML to a temporary file
          const tempFilePath = filePath + '.temp';
          fs.writeFileSync(tempFilePath, htmlContent, 'utf8');
          callback({ path: tempFilePath });
          return;
        } catch (err) {
          console.warn('[Electron] ⚠️  Could not inject CSP into HTML, using original file:', err.message);
          // Fall back to original file if injection fails
        }
      }
      
      callback({ path: filePath });
    });
    console.log('[Electron] ✅ Custom protocol "app://" registered');
  }
}

// Check internet connectivity with improved reliability
function checkInternetConnectivity(vercelUrl = 'https://hr-leave-portal.vercel.app') {
  return new Promise((resolve) => {
    // Use Electron's net module to check connectivity
    // Try multiple endpoints for better reliability
    const testUrls = [
      vercelUrl,
      'https://www.google.com', // Fallback test
      'https://8.8.8.8', // Google DNS (fastest)
    ];
    
    let attempts = 0;
    const maxAttempts = testUrls.length;
    const timeout = 5000; // 5 second timeout per attempt
    
    function tryConnect(urlIndex = 0) {
      if (urlIndex >= testUrls.length) {
        // All attempts failed
        console.log('[Electron] ❌ All connectivity checks failed - assuming offline');
        resolve(false);
        return;
      }
      
      const testUrl = testUrls[urlIndex];
      console.log(`[Electron] 🔍 Checking connectivity to: ${testUrl}`);
      
      const request = net.request({
        method: 'HEAD',
        url: testUrl,
      });
      
      let resolved = false;
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log(`[Electron] ⏱️  Timeout checking ${testUrl}`);
          // Try next URL
          tryConnect(urlIndex + 1);
        }
      }, timeout);
      
      request.on('response', (response) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          const statusCode = response.statusCode;
          // Accept 2xx, 3xx, and even 4xx/5xx as "connected" (server responded)
          if (statusCode >= 200 && statusCode < 600) {
            console.log(`[Electron] ✅ Connectivity confirmed via ${testUrl} (${statusCode})`);
            resolve(true);
          } else {
            // Unexpected status, try next URL
            tryConnect(urlIndex + 1);
          }
        }
      });
      
      request.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          console.log(`[Electron] ❌ Error checking ${testUrl}:`, error.message);
          // Try next URL
          tryConnect(urlIndex + 1);
        }
      });
      
      request.end();
    }
    
    // Start connectivity check
    tryConnect(0);
  });
}

// Get window state from storage
function getWindowState() {
  const userDataPath = app.getPath('userData');
  const stateFile = path.join(userDataPath, 'window-state.json');
  
  try {
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      
      // Validate window state to prevent invalid saved states
      const { screen } = require('electron');
      const displays = screen.getAllDisplays();
      const primaryDisplay = displays.find(d => d.bounds.x === 0 && d.bounds.y === 0) || displays[0];
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      
      // Validate bounds
      if (state.width && state.width > 0 && state.width <= screenWidth * 2 &&
          state.height && state.height > 0 && state.height <= screenHeight * 2) {
        // Validate position (allow some off-screen for multi-monitor setups)
        if (state.x !== undefined && state.y !== undefined) {
          // Position is valid if within reasonable bounds
          if (state.x >= -screenWidth && state.x <= screenWidth * 2 &&
              state.y >= -screenHeight && state.y <= screenHeight * 2) {
            return state;
          }
        } else {
          // No position saved, but size is valid
          return state;
        }
      }
      
      logger.warn('[Electron] Invalid window state detected, using defaults');
    }
  } catch (error) {
    logger.warn('[Electron] Could not read window state:', error.message);
  }
  
  return null;
}

// Save window state to storage
function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  
  const userDataPath = app.getPath('userData');
  const stateFile = path.join(userDataPath, 'window-state.json');
  
  try {
    // Ensure userData directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    const bounds = mainWindow.getBounds();
    const state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: mainWindow.isMaximized(),
      isFullScreen: mainWindow.isFullScreen(),
    };
    
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.warn('[Electron] Could not save window state:', error.message);
  }
}

/**
 * Create splash screen
 */
function createSplashScreen() {
  if (isDev) {
    // Skip splash screen in development
    return;
  }

  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: true,
    },
  });

  // Create splash screen HTML
  const splashHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .logo {
          font-size: 48px;
          font-weight: bold;
          margin-bottom: 20px;
          opacity: 0;
          animation: fadeIn 0.5s ease-in forwards;
        }
        .title {
          font-size: 24px;
          margin-bottom: 10px;
          opacity: 0;
          animation: fadeIn 0.5s ease-in 0.2s forwards;
        }
        .subtitle {
          font-size: 14px;
          opacity: 0.8;
          opacity: 0;
          animation: fadeIn 0.5s ease-in 0.4s forwards;
        }
        .progress {
          width: 200px;
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          margin-top: 30px;
          overflow: hidden;
          opacity: 0;
          animation: fadeIn 0.5s ease-in 0.6s forwards;
        }
        .progress-bar {
          height: 100%;
          background: white;
          width: 0%;
          animation: progress 2s ease-in-out forwards;
        }
        @keyframes fadeIn {
          to { opacity: 1; }
        }
        @keyframes progress {
          to { width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="logo">HR Portal</div>
      <div class="title">Loading Application</div>
      <div class="subtitle">Please wait...</div>
      <div class="progress">
        <div class="progress-bar"></div>
      </div>
    </body>
    </html>
  `;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);
  splashWindow.center();
}

async function createWindow() {
  // Get saved window state or use defaults
  const savedState = getWindowState();
  const defaultBounds = {
    width: 1400,
    height: 900,
    x: undefined,
    y: undefined,
  };
  
  const windowBounds = savedState && !savedState.isMaximized
    ? {
        width: savedState.width || defaultBounds.width,
        height: savedState.height || defaultBounds.height,
        x: savedState.x,
        y: savedState.y,
      }
    : defaultBounds;
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    ...windowBounds,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      // Additional security settings
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      // Enable sandbox for better security
      // Note: Sandbox mode requires preload script to use contextBridge
      // which we already do, so it should be safe to enable
      sandbox: true, // Enabled for enhanced security
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

  // Restore window state
  if (savedState && savedState.isMaximized) {
    mainWindow.maximize();
  }
  
  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus on window
    mainWindow.focus();
    
    // Close splash screen if still open
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    
    logger.info('[Electron] Main window ready');
    
    // DevTools only enabled in development mode (never in production)
    // Removed ENABLE_DEVTOOLS environment variable check for security
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });
  
  // Save window state on move/resize
  let saveStateTimeout;
  ['resize', 'move'].forEach(event => {
    mainWindow.on(event, () => {
      clearTimeout(saveStateTimeout);
      saveStateTimeout = setTimeout(() => {
        saveWindowState();
      }, 500); // Debounce saves
    });
  });
  
  // Save window state on close
  mainWindow.on('close', () => {
    saveWindowState();
  });
  
  // Also show window after a delay if ready-to-show doesn't fire (fallback)
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.log('[Electron] Showing window after timeout (ready-to-show may not have fired)');
      mainWindow.show();
    }
  }, 2000); // 2 second fallback

  // Load the app - prioritize Vercel URL when online, use static files when offline
  // Check if we have a remote API URL (Vercel deployment)
  // Priority: ELECTRON_API_URL > NEXT_PUBLIC_API_URL > DEFAULT_VERCEL_URL (production only)
  // Default Vercel URL for production builds
  const DEFAULT_VERCEL_URL = 'https://hr-leave-portal.vercel.app'
  const remoteApiUrl = process.env.ELECTRON_API_URL || 
                       process.env.NEXT_PUBLIC_API_URL || 
                       (isDev ? null : DEFAULT_VERCEL_URL);
  
  if (!isDev && !remoteApiUrl) {
    console.error('[Electron] ERROR: ELECTRON_API_URL or NEXT_PUBLIC_API_URL must be set for production builds')
  }
  
  // Function to check for local static files
  function findLocalStaticFiles() {
    const appPath = app.getAppPath();
    const resourcesPath = process.resourcesPath || appPath;
    const possibleLocalPaths = [
      // Production paths (most common)
      path.join(resourcesPath, 'app', 'out', 'index.html'), // Unpacked (preferred for app://)
      path.join(resourcesPath, 'out', 'index.html'), // Direct resources path
      path.join(appPath, 'out', 'index.html'), // App path
      path.join(__dirname, '..', 'out', 'index.html'), // Development/unpacked
      path.join(__dirname, 'out', 'index.html'), // Alternative dev path
      // ASAR paths (packed, but we prefer unpacked)
      path.join(resourcesPath, 'app.asar', 'out', 'index.html'), // Packed ASAR
      // Additional fallback paths
      path.join(process.cwd(), 'out', 'index.html'), // Current working directory
      path.join(app.getPath('exe'), '..', 'resources', 'app', 'out', 'index.html'), // Relative to exe
    ];
    
    for (const localPath of possibleLocalPaths) {
      try {
        const resolvedPath = path.resolve(localPath);
        if (fs.existsSync(resolvedPath)) {
          // Verify the directory structure exists
          const outDir = path.dirname(resolvedPath);
          const nextDir = path.join(outDir, '_next');
          if (!fs.existsSync(nextDir)) {
            console.warn(`[Electron] ⚠️  Found index.html but _next directory missing at: ${nextDir}`);
            continue;
          }
          
          // Use custom app:// protocol instead of file:// for better reliability
          const relativePath = path.relative(outDir, resolvedPath).replace(/\\/g, '/');
          const appUrl = `app:///${relativePath}`;
          
          return { url: appUrl, path: resolvedPath, outDir };
        }
      } catch (e) {
        // Log error but continue checking other paths
        console.warn(`[Electron] ⚠️  Error checking path ${localPath}:`, e.message);
      }
    }
    
    return null;
  }

  // Function to determine start URL - OFFLINE-FIRST approach
  async function determineStartUrl() {
    if (isDev) {
      // Development: always use localhost
      return {
        url: 'http://localhost:3000',
        source: 'localhost',
        isOnline: true
      };
    }
    
    // OFFLINE-FIRST: Check for local static files FIRST (works offline)
    console.log('[Electron] 🔍 Checking for local static files (OFFLINE-FIRST)...');
    const localFiles = findLocalStaticFiles();
    
    if (localFiles) {
      console.log('[Electron] ✅ Found local static files at:', localFiles.path);
      console.log('[Electron] ✅ Verified _next directory exists');
      console.log('[Electron] 📦 Loading from LOCAL files (OFFLINE-FIRST mode):', localFiles.url);
      console.log('[Electron] 🔧 Using custom app:// protocol for better reliability');
      
      // Check connectivity in background (for API calls, not for loading)
      const isOnline = await checkInternetConnectivity(remoteApiUrl || DEFAULT_VERCEL_URL);
      if (isOnline) {
        console.log('[Electron] 🌐 Internet connection detected - API calls will go to remote server');
        console.log('[Electron] 🔧 API URL:', remoteApiUrl || DEFAULT_VERCEL_URL);
      } else {
        console.log('[Electron] ⚠️  No internet connection - API calls will be queued for sync');
      }
      
      return {
        url: localFiles.url,
        source: 'local',
        isOnline: isOnline
      };
    }
    
    // Fallback: No local files found - check internet and use Vercel
    console.log('[Electron] ⚠️  No local static files found');
    console.log('[Electron] 🔍 Checking internet connectivity for remote fallback...');
    const isOnline = await checkInternetConnectivity(remoteApiUrl || DEFAULT_VERCEL_URL);
    
    if (isOnline) {
      // Internet available - use Vercel URL as fallback
      const vercelUrl = (remoteApiUrl || DEFAULT_VERCEL_URL).replace(/\/$/, '');
      console.log('[Electron] ✅ Internet connection detected');
      console.log('[Electron] 🌐 Loading from Vercel URL (FALLBACK mode):', vercelUrl);
      console.log('[Electron] 🔧 API calls will be made to:', vercelUrl);
      console.log('[Electron] ⚠️  NOTE: App requires internet connection (no local files bundled)');
      return {
        url: vercelUrl,
        source: 'vercel',
        isOnline: true
      };
    } else {
      // No internet AND no local files - cannot start
      console.error('[Electron] ❌ No internet connection AND no local static files found');
      console.error('[Electron] ⚠️  App cannot start without internet or local files');
      console.error('[Electron] 📋 Debug information:');
      const appPath = app.getAppPath();
      const resourcesPath = process.resourcesPath || appPath;
      console.error(`   - app.getAppPath(): ${appPath}`);
      console.error(`   - process.resourcesPath: ${resourcesPath}`);
      console.error(`   - __dirname: ${__dirname}`);
      console.error(`   - process.cwd(): ${process.cwd()}`);
      console.error(`   - process.execPath: ${process.execPath}`);
      console.error('[Electron] 💡 Solution: Build app with static files included (npm run build:electron)');
      
      return {
        url: null,
        source: 'error',
        isOnline: false
      };
    }
  }
  
  // Determine start URL
  const startUrlInfo = await determineStartUrl();
  let startUrl = startUrlInfo.url;
  
  // If no URL could be determined, show error
  if (!startUrl) {
    const errorHtml = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; font-family: Arial, sans-serif; padding: 20px; text-align: center; background: #f9fafb;">
        <div style="max-width: 600px; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h1 style="color: #dc2626; margin-bottom: 20px; font-size: 24px;">Cannot Start Application</h1>
          <p style="color: #666; margin: 10px 0; font-size: 14px;">The application requires either:</p>
          <ul style="text-align: left; color: #6b7280; margin: 20px 0; padding-left: 20px; font-size: 14px;">
            <li style="margin: 8px 0;">An active internet connection to load from Vercel, OR</li>
            <li style="margin: 8px 0;">Local static files bundled with the application</li>
          </ul>
          <p style="color: #666; margin: 20px 0; font-size: 14px;">Currently, neither is available.</p>
          <div style="margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px;">
            <p style="color: #374151; margin-bottom: 10px; font-weight: 600;"><strong>Solutions:</strong></p>
            <ul style="text-align: left; color: #6b7280; margin: 10px 0; padding-left: 20px; font-size: 14px;">
              <li style="margin: 8px 0;">Check your internet connection</li>
              <li style="margin: 8px 0;">Verify the application was built with static files included</li>
              <li style="margin: 8px 0;">Try restarting the application</li>
            </ul>
          </div>
          <button onclick="window.location.reload()" style="margin-top: 20px; padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 500;">Retry</button>
        </div>
      </div>
    `;
    
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.executeJavaScript(`
        document.body.innerHTML = ${JSON.stringify(errorHtml)};
      `);
    });
    
    // Load a blank page first
    startUrl = 'about:blank';
  }
  
  // Track resource loading failures and connection status
  let resourceLoadFailures = 0;
  let hasSwitchedToRemote = false;
  let hasSwitchedToLocal = false;
  let currentUrlSource = startUrlInfo.source;
  let isCurrentlyOnline = startUrlInfo.isOnline;
  const MAX_RESOURCE_FAILURES = 3; // Switch after 3 failures
  
  // Function to switch to local files if online connection fails
  async function switchToLocalFiles() {
    if (hasSwitchedToLocal || currentUrlSource === 'local') return false;
    
    console.log('[Electron] 🔄 Switching to local static files (offline mode)...');
    
    // Get all possible paths to check
    const appPath = app.getAppPath();
    const resourcesPath = process.resourcesPath || appPath;
    const possibleLocalPaths = [
      // Production paths (most common)
      path.join(resourcesPath, 'app', 'out', 'index.html'), // Unpacked (preferred for file://)
      path.join(resourcesPath, 'out', 'index.html'), // Direct resources path
      path.join(appPath, 'out', 'index.html'), // App path
      path.join(__dirname, '..', 'out', 'index.html'), // Development/unpacked
      path.join(__dirname, 'out', 'index.html'), // Alternative dev path
      // ASAR paths (packed, but we prefer unpacked)
      path.join(resourcesPath, 'app.asar', 'out', 'index.html'), // Packed ASAR
      // Additional fallback paths
      path.join(process.cwd(), 'out', 'index.html'), // Current working directory
      path.join(app.getPath('exe'), '..', 'resources', 'app', 'out', 'index.html'), // Relative to exe
    ];
    
    for (const localPath of possibleLocalPaths) {
      try {
        const resolvedPath = path.resolve(localPath);
        if (fs.existsSync(resolvedPath)) {
          // Verify the directory structure exists
          const outDir = path.dirname(resolvedPath);
          const nextDir = path.join(outDir, '_next');
          if (!fs.existsSync(nextDir)) {
            console.warn(`[Electron] ⚠️  Found index.html but _next directory missing at: ${nextDir}`);
            continue;
          }
          
          // Use custom app:// protocol instead of file:// for better reliability
          // outDir is already declared above, reuse it
          const relativePath = path.relative(outDir, resolvedPath).replace(/\\/g, '/');
          // Ensure the path starts with / for the protocol handler
          const appUrl = `app:///${relativePath}`;
          
          hasSwitchedToLocal = true;
          currentUrlSource = 'local';
          isCurrentlyOnline = false;
          mainWindow.loadURL(appUrl);
          console.log('[Electron] ✅ Switched to local files using app:// protocol:', appUrl);
          return true;
        }
      } catch (e) {
        console.warn(`[Electron] ⚠️  Error checking path ${localPath}:`, e.message);
      }
    }
    
    console.error('[Electron] ❌ Could not find local static files to switch to');
    return false;
  }
  
  // Function to switch to Vercel URL if internet becomes available
  async function switchToVercelUrl() {
    if (hasSwitchedToRemote || currentUrlSource === 'vercel' || isDev) return;
    
    const isOnline = await checkInternetConnectivity(remoteApiUrl || DEFAULT_VERCEL_URL);
    if (isOnline) {
      const vercelUrl = (remoteApiUrl || DEFAULT_VERCEL_URL).replace(/\/$/, '');
      console.log('[Electron] 🔄 Internet connection detected - switching to Vercel URL...');
      hasSwitchedToRemote = true;
      currentUrlSource = 'vercel';
      isCurrentlyOnline = true;
      mainWindow.loadURL(vercelUrl);
      console.log('[Electron] ✅ Switched to Vercel URL:', vercelUrl);
      return true;
    }
    
    return false;
  }
  
  // Add error handling with connection-aware fallback
  mainWindow.webContents.on('did-fail-load', async (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    // Handle resource loading failures (chunks, CSS, etc.) when using app:// or file:// protocol
    if (!isMainFrame && startUrl && (startUrl.startsWith('app://') || startUrl.startsWith('file://'))) {
      // Check if it's a chunk loading error (ERR_FILE_NOT_FOUND or similar)
      if (errorCode === -6 || errorCode === -105 || 
          errorDescription.includes('ERR_FILE_NOT_FOUND') || 
          errorDescription.includes('net::ERR_FILE_NOT_FOUND') ||
          validatedURL.includes('_next/static')) {
        resourceLoadFailures++;
        console.warn(`[Electron] Resource load failure (${resourceLoadFailures}/${MAX_RESOURCE_FAILURES}):`, validatedURL);
        console.warn(`[Electron] Error: ${errorDescription} (Code: ${errorCode})`);
        
        // Try to fix the path and reload the resource
        // If the URL is relative but missing the base path, try to fix it
        if (validatedURL.includes('_next/static') && !validatedURL.startsWith('file://')) {
          // This is a relative path that failed - might be a path resolution issue
          console.warn(`[Electron] ⚠️  Relative path failed: ${validatedURL}`);
          console.warn(`[Electron] 💡 This might indicate a path resolution issue with file:// protocol`);
        }
        
        // If too many resources fail, check if we can switch to Vercel
        if (resourceLoadFailures >= MAX_RESOURCE_FAILURES) {
          console.error('[Electron] ⚠️  Too many resource load failures - attempting to switch to online mode');
          const switched = await switchToVercelUrl();
          if (switched) {
            return; // Don't show error page, we're switching
          } else {
            console.error('[Electron] ❌ Could not switch to online mode - app may not function correctly');
            console.error('[Electron] 💡 Please check that static files are properly bundled and paths are correct');
          }
        }
      }
    }
    
    // Handle main frame failures
    if (isMainFrame) {
      console.error('[Electron] Failed to load main page:', validatedURL, errorCode, errorDescription);
      
      // Don't show error for navigation cancellations (common in SPAs)
      if (errorCode === -3) {
        console.log('[Electron] Navigation cancelled (likely SPA routing)');
        return;
      }
      
      // If main frame fails and we're using Vercel URL, try local files
      if (startUrl && !startUrl.startsWith('app://') && !startUrl.startsWith('file://') && currentUrlSource === 'vercel') {
        console.error('[Electron] ⚠️  Main page load failed with Vercel URL');
        console.error('[Electron] 🔄 Attempting to switch to local files...');
        
        const switched = await switchToLocalFiles();
        if (switched) {
          return; // Don't show error page, we're switching
        }
      }
      
      // If main frame fails and we're using app:// or file://, try Vercel if online
      if (startUrl && (startUrl.startsWith('app://') || startUrl.startsWith('file://')) && currentUrlSource === 'local') {
        console.error('[Electron] ⚠️  Main page load failed with file:// protocol');
        console.error('[Electron] 🔄 Checking if we can switch to Vercel URL...');
        
        const switched = await switchToVercelUrl();
        if (switched) {
          return; // Don't show error page, we're switching
        }
      }
      
      // Show error page for other main frame failures
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
    }
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
    
    // Check connection status periodically and switch if needed
    connectionCheckInterval = setInterval(async () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Check internet connectivity
        const isOnline = await checkInternetConnectivity(remoteApiUrl || DEFAULT_VERCEL_URL);
        
        // If we're offline but internet is now available, switch to Vercel
        if (isOnline && !isCurrentlyOnline && currentUrlSource === 'local') {
          console.log('[Electron] 🌐 Internet connection restored - switching to Vercel URL...');
          await switchToVercelUrl();
        }
        // If we're online but lost connection, switch to local files
        else if (!isOnline && isCurrentlyOnline && currentUrlSource === 'vercel') {
          console.log('[Electron] ⚠️  Internet connection lost - switching to local files...');
          await switchToLocalFiles();
        }
        
        // Log API URL status
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
    }, 10000); // Check every 10 seconds
  });
  
  // Inject CSP before page loads for app:// protocol
  // This needs to happen early to prevent CSP violations
  mainWindow.webContents.on('did-start-loading', () => {
    const isAppProtocol = startUrl && startUrl.startsWith('app://');
    if (isAppProtocol && !isDev) {
      // Inject CSP meta tag immediately when page starts loading
      // This prevents resources from being blocked
      mainWindow.webContents.executeJavaScript(`
        (function() {
          // Remove any existing CSP meta tag first
          const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
          if (existingCSP) {
            existingCSP.remove();
          }
          
          // Create new CSP meta tag with app:// protocol support
          const meta = document.createElement('meta');
          meta.httpEquiv = 'Content-Security-Policy';
          meta.content = "default-src app: 'self' https:; script-src app: 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src app: 'self' 'unsafe-inline' https:; style-src-elem app: 'self' 'unsafe-inline' https:; img-src app: 'self' data: https:; font-src app: 'self' data: https:; connect-src 'self' https:; manifest-src app: 'self' https:;";
          
          // Insert at the beginning of head to ensure it's processed early
          if (document.head) {
            document.head.insertBefore(meta, document.head.firstChild);
          } else {
            // If head doesn't exist yet, wait for DOMContentLoaded
            document.addEventListener('DOMContentLoaded', function() {
              document.head.insertBefore(meta, document.head.firstChild);
            });
          }
        })();
      `).catch(err => console.warn('[Electron] Could not inject CSP early:', err));
    }
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      console.log('[Electron] Page finished loading successfully');
    }
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
    }
    
    // Also inject CSP after page loads as a fallback (for app:// protocol)
    const isAppProtocol = startUrl && startUrl.startsWith('app://');
    if (isAppProtocol && !isDev) {
      mainWindow.webContents.executeJavaScript(`
        (function() {
          // Remove any existing CSP meta tag first
          const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
          if (existingCSP) {
            existingCSP.remove();
          }
          
          // Create new CSP meta tag with app:// protocol support including manifest-src
          const meta = document.createElement('meta');
          meta.httpEquiv = 'Content-Security-Policy';
          meta.content = "default-src app: 'self' https:; script-src app: 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src app: 'self' 'unsafe-inline' https:; style-src-elem app: 'self' 'unsafe-inline' https:; img-src app: 'self' data: https:; font-src app: 'self' data: https:; connect-src 'self' https:; manifest-src app: 'self' https:;";
          
          // Insert at the beginning of head
          if (document.head) {
            document.head.insertBefore(meta, document.head.firstChild);
          }
        })();
      `).catch(err => console.warn('[Electron] Could not inject security headers:', err));
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
  
  // Log console messages from renderer and detect chunk loading errors as backup detection
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}]:`, message);
    
    // Detect ERR_FILE_NOT_FOUND errors in console (chunk loading failures) as backup
    // This catches errors that might not trigger did-fail-load
    if (level >= 2 && message.includes('ERR_FILE_NOT_FOUND') && startUrl && (startUrl.startsWith('app://') || startUrl.startsWith('file://')) && !hasSwitchedToRemote) {
      resourceLoadFailures++;
      console.warn(`[Electron] Detected chunk loading error in console (${resourceLoadFailures}/${MAX_RESOURCE_FAILURES})`);
      
      // If too many chunk errors, switch to remote URL
      if (resourceLoadFailures >= MAX_RESOURCE_FAILURES && !hasSwitchedToRemote) {
        hasSwitchedToRemote = true;
        console.error('[Electron] ⚠️  Multiple chunk loading failures detected via console');
        console.error('[Electron] 🔄 Switching to remote URL fallback...');
        
        const remoteUrl = (remoteApiUrl || DEFAULT_VERCEL_URL).replace(/\/$/, '');
        console.log('[Electron] 🔄 Loading from remote URL:', remoteUrl);
        mainWindow.loadURL(remoteUrl);
      }
    }
  });
  
  mainWindow.loadURL(startUrl);

  // Handle window close event (before closed)
  mainWindow.on('close', (event) => {
    // Save window state before closing
    saveWindowState();
    
    // On macOS, keep app running even when window is closed
    if (process.platform === 'darwin') {
      event.preventDefault();
      mainWindow.hide();
    }
    // On Windows/Linux, allow normal close (state already saved above)
  });
  
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
      const currentOrigin = startUrl.startsWith('app://') || startUrl.startsWith('file://')
        ? (startUrl.startsWith('app://') ? 'app://' : 'file://')
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
  // Initialize logger and error reporter
  logger.info('[Electron] Application starting');
  errorReporter.initErrorReporter();
  
  // Initialize database
  try {
    db.initDatabase();
    logger.info('[Electron] Database initialized');
  } catch (error) {
    logger.error('[Electron] Failed to initialize database:', error);
    errorReporter.reportError(error, { context: 'database_init' });
  }
  
  // Setup IPC handlers
  setupIpcHandlers();
  
  // Setup custom protocol (better than file:// for loading static files)
  // This provides better security and reliability than file:// protocol
  setupProtocol();
  
  // Create splash screen
  createSplashScreen();
  
  // Create main window after a short delay (for splash screen)
  setTimeout(() => {
    createWindow();
    // Close splash screen when main window is ready
    if (splashWindow) {
      setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
          splashWindow = null;
        }
      }, 500);
    }
  }, 1000);

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


// Security: Prevent new window creation and handle navigation
app.on('web-contents-created', (event, contents) => {
  // Prevent new window creation
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  
  // Additional security: Prevent navigation to external URLs
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
      // Allow app://, file:// protocols and localhost in dev
      if (parsedUrl.protocol === 'app:' || parsedUrl.protocol === 'file:' || (isDev && parsedUrl.hostname === 'localhost')) {
      return;
    }
    
    // Block navigation to external URLs
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
  
  // Prevent new window (legacy handler for older Electron versions)
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

