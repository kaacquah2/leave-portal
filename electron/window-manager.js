/**
 * Window management for Electron application
 */

const { BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { getWindowState, saveWindowState, validateWindowState } = require('./window-state');
const { isNavigationAllowed, safeOpenExternal } = require('./security');
const { isDev } = require('./utils');
const { getIconPath } = require('./icon-utils');

class WindowManager {
  constructor(apiBaseUrl, logger) {
    this.apiBaseUrl = apiBaseUrl;
    this.logger = logger;
    this.mainWindow = null;
    this.splashWindow = null;
    this.loadTimeout = null;
    this.saveStateTimeout = null;
  }

  /**
   * Create splash screen
   */
  createSplashScreen() {
    if (isDev()) {
      return;
    }

    this.splashWindow = new BrowserWindow({
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

    const splashHTML = this.getSplashHTML();
    this.splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);
    this.splashWindow.center();
  }

  /**
   * Get splash screen HTML
   */
  getSplashHTML() {
    return `
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
  }

  /**
   * Create main window
   */
  async createWindow() {
    const savedState = getWindowState();
    const defaultBounds = {
      width: 1400,
      height: 900,
      x: undefined,
      y: undefined,
    };
    
    // Validate and use saved state if available
    const validatedState = savedState ? validateWindowState(savedState) : null;
    const windowBounds = validatedState && !validatedState.isMaximized
      ? {
          width: validatedState.width || defaultBounds.width,
          height: validatedState.height || defaultBounds.height,
          x: validatedState.x,
          y: validatedState.y,
        }
      : defaultBounds;
    
    this.mainWindow = new BrowserWindow({
      ...windowBounds,
      minWidth: 1000,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
        sandbox: true,
      },
      icon: this.getIconPath(),
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      show: false,
      backgroundColor: '#ffffff',
      autoHideMenuBar: false,
      frame: true,
      opacity: validatedState ? 0 : 1, // Start transparent for animation if restoring
    });

    // Restore maximized state with animation
    if (validatedState?.isMaximized) {
      // Use setTimeout to ensure window is ready before maximizing
      setTimeout(() => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.maximize();
          this.animateWindowRestore();
        }
      }, 50);
    } else if (validatedState) {
      // Animate window restore for non-maximized windows
      // Window will be shown via animation in animateWindowRestore()
      setTimeout(() => {
        this.animateWindowRestore();
      }, 50);
    } else {
      // No saved state, show window normally
      this.mainWindow.setOpacity(1);
    }

    // Setup window event handlers
    this.setupWindowHandlers();

    // Load URL
    const startUrl = await this.determineStartUrl();
    if (startUrl) {
      this.mainWindow.loadURL(startUrl);
    } else {
      this.showStartupError();
    }

    // Create menu
    this.createMenu();
  }

  /**
   * Get icon path for current platform
   * Uses icon-utils for centralized icon path resolution
   */
  getIconPath() {
    return getIconPath(__dirname);
  }

  /**
   * Setup window event handlers
   */
  setupWindowHandlers() {
    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      // If window was restored from saved state, it will be shown via animation
      // Otherwise, show it immediately
      if (this.mainWindow.getOpacity() === 1) {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
      
      if (this.splashWindow && !this.splashWindow.isDestroyed()) {
        this.splashWindow.close();
        this.splashWindow = null;
      }
      
      this.logger?.info('[WindowManager] Main window ready');
      
      if (isDev()) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // Window state management
    const resizeHandler = () => {
      clearTimeout(this.saveStateTimeout);
      this.saveStateTimeout = setTimeout(() => {
        saveWindowState(this.mainWindow);
      }, 500);
    };

    const moveHandler = () => {
      clearTimeout(this.saveStateTimeout);
      this.saveStateTimeout = setTimeout(() => {
        saveWindowState(this.mainWindow);
      }, 500);
    };

    this.mainWindow.on('resize', resizeHandler);
    this.mainWindow.on('move', moveHandler);

    // Cleanup on close
    this.mainWindow.on('closed', () => {
      if (this.saveStateTimeout) {
        clearTimeout(this.saveStateTimeout);
      }
      this.mainWindow = null;
    });

    this.mainWindow.on('close', () => {
      saveWindowState(this.mainWindow);
      this.cleanupTimeouts();
    });

    // Navigation security
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      safeOpenExternal(url, require('electron').shell, this.logger);
      return { action: 'deny' };
    });

    this.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      if (!isNavigationAllowed(navigationUrl, isDev())) {
        event.preventDefault();
        safeOpenExternal(navigationUrl, require('electron').shell, this.logger);
      }
    });

    // Error handling
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (isMainFrame && errorCode !== -3) {
        const sanitizedDescription = String(errorDescription || 'Unknown error')
          .replace(/[<>]/g, '')
          .substring(0, 500);
        this.mainWindow.webContents.send('electron-error', {
          type: 'load-error',
          title: 'Failed to Load Application',
          error: sanitizedDescription,
          errorCode: errorCode,
          url: String(validatedURL || 'Unknown URL').substring(0, 500),
        });
      }
    });

    // Load timeout
    this.mainWindow.webContents.on('did-start-loading', () => {
      this.cleanupTimeouts();
      this.loadTimeout = setTimeout(() => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('electron-error', {
            type: 'timeout',
            title: 'Loading Timeout',
            message: 'Loading is taking longer than expected.',
          });
        }
        this.loadTimeout = null;
      }, 30000);
    });

    this.mainWindow.webContents.on('did-finish-load', () => {
      this.cleanupTimeouts();
    });

    this.mainWindow.webContents.on('did-stop-loading', () => {
      this.cleanupTimeouts();
    });
  }

  /**
   * Determine start URL
   */
  async determineStartUrl() {
    if (isDev()) {
      return 'http://localhost:3000';
    }

    const localFiles = this.findLocalStaticFiles();
    if (localFiles) {
      this.logger?.info(`[WindowManager] Loading from local files: ${localFiles.url}`);
      return localFiles.url;
    }

    this.logger?.error('[WindowManager] No local static files found');
    return null;
  }

  /**
   * Find local static files
   */
  findLocalStaticFiles() {
    const possibleOutDirs = [
      path.join(process.resourcesPath || app.getAppPath(), 'app', 'out'),
      path.join(process.resourcesPath || app.getAppPath(), 'out'),
      path.join(app.getAppPath(), 'out'),
      path.join(__dirname, '..', 'out'),
    ];
    
    for (const dir of possibleOutDirs) {
      try {
        const indexPath = path.join(dir, 'index.html');
        if (fs.existsSync(indexPath) && fs.existsSync(path.join(dir, '_next'))) {
          const relativePath = path.relative(dir, indexPath).replace(/\\/g, '/');
          return {
            url: `app:///${relativePath}`,
            path: indexPath,
            outDir: dir,
          };
        }
      } catch (e) {
        // Continue checking other paths
      }
    }
    
    return null;
  }

  /**
   * Show startup error
   */
  showStartupError() {
    this.mainWindow.webContents.once('did-finish-load', () => {
      this.mainWindow.webContents.send('electron-error', {
        type: 'startup-error',
        title: 'Cannot Start Application',
        message: 'The application requires local static files to be bundled.',
        details: 'Static files were not found in the expected location.',
      });
    });
    this.mainWindow.loadURL('about:blank');
  }

  /**
   * Create application menu
   */
  createMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit(),
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
          ...(isDev() ? [
            { role: 'reload', label: 'Reload' },
            { role: 'forceReload', label: 'Force Reload' },
            { role: 'toggleDevTools', label: 'Toggle Developer Tools' },
            { type: 'separator' },
          ] : []),
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
              console.log('HR Leave Portal v0.1.0');
            },
          },
        ],
      },
    ];

    // macOS specific adjustments
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

  /**
   * Cleanup timeouts
   */
  cleanupTimeouts() {
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }
  }

  /**
   * Get main window
   */
  getMainWindow() {
    return this.mainWindow;
  }

  /**
   * Get splash window
   */
  getSplashWindow() {
    return this.splashWindow;
  }

  /**
   * Animate window restore (fade in and slide effect)
   */
  animateWindowRestore() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    const savedState = getWindowState();
    if (!savedState) {
      // No saved state, just show window normally
      this.mainWindow.setOpacity(1);
      this.mainWindow.show();
      this.mainWindow.focus();
      return;
    }

    // Fade in animation
    let opacity = 0;
    const fadeIncrement = 0.05;
    const fadeInterval = 16; // ~60fps

    const fadeAnimation = setInterval(() => {
      opacity += fadeIncrement;
      if (opacity >= 1) {
        opacity = 1;
        clearInterval(fadeAnimation);
      }
      this.mainWindow.setOpacity(opacity);
    }, fadeInterval);

    // Show window after a brief delay to ensure it's positioned correctly
    setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    }, 50);
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.cleanupTimeouts();
    if (this.saveStateTimeout) {
      clearTimeout(this.saveStateTimeout);
    }
  }
}

module.exports = WindowManager;

