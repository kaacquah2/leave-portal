/**
 * Electron Main Process
 * 
 * Simple, efficient, and secure Electron application entry point
 */

const { app, BrowserWindow, shell } = require('electron');
const logger = require('./logger');
const errorReporter = require('./error-reporter');
const { isDev, resolveApiUrl } = require('./utils');
const { isNavigationAllowed, safeOpenExternal } = require('./security');
const { setupProtocol, registerSchemes } = require('./protocol-handler');
const WindowManager = require('./window-manager');
const IpcHandlers = require('./ipc-handlers');
const { initEncryptedDatabase, closeEncryptedDatabase } = require('./database-encrypted');
const { setupRepositoryHandlers } = require('./ipc-repository-handlers');
const { cleanupExpiredSessions } = require('./offline-session');
const { startBackgroundSync, stopBackgroundSync } = require('./background-sync');
const { autoResolveConflicts } = require('./conflict-resolver');
const { runBootstrap } = require('./bootstrap');
const { checkAndRecoverOnStartup, startPeriodicBackups, stopPeriodicBackups, createBackup, BACKUP_BEFORE_UPDATE } = require('./disaster-recovery');
const { startExpiryMonitoring, stopExpiryMonitoring, isAppLocked } = require('./token-expiry-enforcer');
const { startAutoUpdateChecking, stopAutoUpdateChecking } = require('./auto-updater');

// Constants
// Default Vercel URL - can be overridden via ELECTRON_DEFAULT_API_URL environment variable
// Priority: ELECTRON_API_URL > NEXT_PUBLIC_API_URL > ELECTRON_DEFAULT_API_URL > hardcoded default
const DEFAULT_VERCEL_URL = process.env.ELECTRON_DEFAULT_API_URL || 'https://hr-leave-portal.vercel.app';

// Resolve API URL once at startup
const API_BASE_URL = resolveApiUrl(DEFAULT_VERCEL_URL);

// Validate native fetch availability (Electron >= 28 required)
if (typeof fetch !== 'function') {
  throw new Error('Native fetch not available – Electron >= 28 required');
}

// Global instances
let windowManager = null;
let ipcHandlers = null;

// Graceful shutdown state (module scope for accessibility)
let isShuttingDown = false;
let activeOperations = new Set();

/**
 * Initialize application
 */
async function initialize() {
  logger.info('[Electron] Application starting');
  errorReporter.initErrorReporter();
  
  // STEP 1: Initialize encrypted database (CRITICAL: Must be first)
  try {
    initEncryptedDatabase();
    logger.info('[Electron] Encrypted database initialized');
  } catch (error) {
    logger.error(`[Electron] Failed to initialize database: ${error.message}`);
    
    // Attempt disaster recovery
    try {
      logger.warn('[Electron] Attempting disaster recovery...');
      checkAndRecoverOnStartup();
      // Retry initialization after recovery
      initEncryptedDatabase();
      logger.info('[Electron] Database recovered and initialized');
    } catch (recoveryError) {
      logger.error(`[Electron] Disaster recovery failed: ${recoveryError.message}`);
      throw new Error('Database initialization and recovery failed');
    }
  }
  
  // STEP 2: Check database integrity and recover if needed
  try {
    checkAndRecoverOnStartup();
  } catch (error) {
    logger.error(`[Electron] Error during startup integrity check: ${error.message}`);
    // Continue - recovery may have succeeded
  }
  
  // STEP 3: Run bootstrap (first-run initialization)
  try {
    const bootstrapResult = runBootstrap();
    if (bootstrapResult.success && !bootstrapResult.skipped) {
      logger.info('[Electron] Bootstrap completed successfully');
    } else if (bootstrapResult.skipped) {
      logger.info('[Electron] Bootstrap already completed - skipped');
    } else {
      logger.warn(`[Electron] Bootstrap failed: ${bootstrapResult.message}`);
    }
  } catch (error) {
    logger.error(`[Electron] Error during bootstrap: ${error.message}`);
    // Continue - bootstrap can retry on next launch
  }
  
  // STEP 4: Cleanup expired sessions on startup
  const cleaned = cleanupExpiredSessions();
  if (cleaned > 0) {
    logger.info(`[Electron] Cleaned up ${cleaned} expired sessions`);
  }
  
  // STEP 5: Start token expiry monitoring
  startExpiryMonitoring();
  
  // STEP 6: Start periodic backups
  startPeriodicBackups();
  
  // STEP 7: Initialize IPC handlers
  ipcHandlers = new IpcHandlers(API_BASE_URL, logger);
  ipcHandlers.setup();
  
  // STEP 8: Setup repository IPC handlers (offline-first data access)
  setupRepositoryHandlers(API_BASE_URL, logger);
  
  // STEP 9: Start background sync (automatic sync when online)
  startBackgroundSync(API_BASE_URL, logger);
  
  // STEP 10: Auto-resolve conflicts on startup
  try {
    const conflictResult = autoResolveConflicts(logger);
    if (conflictResult.resolved > 0) {
      logger.info(`[Electron] Auto-resolved ${conflictResult.resolved} conflicts`);
    }
  } catch (error) {
    logger.error(`[Electron] Error auto-resolving conflicts: ${error.message}`);
  }
  
  // STEP 11: Start auto-update checking (production only)
  if (!isDev()) {
    startAutoUpdateChecking();
  }
  
  // STEP 12: Setup custom protocol
  setupProtocol();
  
  // STEP 13: Initialize window manager
  windowManager = new WindowManager(API_BASE_URL, logger);
  
  // STEP 14: Create splash screen
  windowManager.createSplashScreen();
  
  // STEP 15: Create main window after short delay
  setTimeout(() => {
    // Check if app is locked before creating window
    if (isAppLocked()) {
      logger.warn('[Electron] App is locked - showing lock screen');
      // Window manager should handle lock screen display
    }
    
    windowManager.createWindow();
    
    // Close splash screen after delay
    setTimeout(() => {
      const splash = windowManager.getSplashWindow();
      if (splash && !splash.isDestroyed()) {
        splash.close();
      }
    }, 500);
  }, 1000);
}

/**
 * Setup application event handlers
 */
function setupAppHandlers() {
  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createWindow();
    }
  });

  // Quit when all windows are closed (except macOS)
  app.on('window-all-closed', () => {
    if (windowManager) {
      windowManager.cleanup();
    }
    if (ipcHandlers) {
      ipcHandlers.cleanup();
    }
    
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Cleanup on app quit
  app.on('before-quit', () => {
    if (windowManager) {
      windowManager.cleanup();
    }
    if (ipcHandlers) {
      ipcHandlers.cleanup();
    }
  });

  // Graceful shutdown handling for long-running operations
  // (State variables are in module scope above)
  
  // Handle shutdown signals
  const gracefulShutdown = async (signal) => {
    if (isShuttingDown) {
      logger.warn(`[Electron] Already shutting down, ignoring ${signal}`);
      return;
    }

    isShuttingDown = true;
    logger.info(`[Electron] Received ${signal}, initiating graceful shutdown...`);

    // Wait for active operations to complete (with timeout)
    const shutdownTimeout = 10000; // 10 seconds
    const startTime = Date.now();

    while (activeOperations.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
      logger.info(`[Electron] Waiting for ${activeOperations.size} active operation(s) to complete...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (activeOperations.size > 0) {
      logger.warn(`[Electron] ${activeOperations.size} operation(s) did not complete within timeout`);
    }

    // Cleanup resources
    if (windowManager) {
      windowManager.cleanup();
    }
    if (ipcHandlers) {
      ipcHandlers.cleanup();
    }
    
    // Stop background sync
    stopBackgroundSync();
    
    // Stop token expiry monitoring
    stopExpiryMonitoring();
    
    // Stop periodic backups
    stopPeriodicBackups();
    
    // Stop auto-update checking
    stopAutoUpdateChecking();
    
    // Create backup before shutdown (if enabled)
    if (BACKUP_BEFORE_UPDATE) {
      try {
        createBackup('pre-shutdown');
        logger.info('[Electron] Pre-shutdown backup created');
      } catch (error) {
        logger.warn(`[Electron] Failed to create pre-shutdown backup: ${error.message}`);
      }
    }
    
    // Close encrypted database
    try {
      closeEncryptedDatabase();
      logger.info('[Electron] Database closed');
    } catch (error) {
      logger.error(`[Electron] Error closing database: ${error.message}`);
    }

    logger.info('[Electron] Graceful shutdown complete');
    app.quit();
  };

  // Register signal handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Export function to track active operations (for use in IPC handlers and other modules)
  // Usage: const cleanup = trackOperation('operation-id'); ... cleanup();
  global.trackOperation = (operationId) => {
    activeOperations.add(operationId);
    logger.debug(`[Electron] Operation started: ${operationId} (${activeOperations.size} active)`);
    return () => {
      activeOperations.delete(operationId);
      logger.debug(`[Electron] Operation completed: ${operationId} (${activeOperations.size} active)`);
    };
  };

  // Security: Prevent new window creation and handle navigation
  app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      safeOpenExternal(url, shell, logger);
      return { action: 'deny' };
    });
    
    contents.on('will-navigate', (event, navigationUrl) => {
      if (!isNavigationAllowed(navigationUrl, isDev())) {
        event.preventDefault();
        safeOpenExternal(navigationUrl, shell, logger);
      }
    });
    
    // Legacy handler for older Electron versions
    contents.on('new-window', (event, navigationUrl) => {
      event.preventDefault();
      safeOpenExternal(navigationUrl, shell, logger);
    });
  });
}

// Register protocol schemes before app is ready
registerSchemes();

// Initialize when Electron is ready
app.whenReady().then(() => {
  setupAppHandlers();
  initialize();
});
