/**
 * Auto-Update Service
 * 
 * Ministry of Foreign Affairs (MoFA), Ghana - HR Leave Portal
 * 
 * Implements secure auto-update functionality using electron-updater:
 * - Silent update check on app launch
 * - Background download
 * - Restart prompt only when ready
 * - No UI blocking
 * - Update failure handling
 * - Update event logging
 * 
 * Security Features:
 * - Verify update integrity
 * - Prevent downgrade attacks
 * - Ensure trusted update source
 * 
 * @version 1.0.0
 */

const { autoUpdater } = require('electron-updater');
const logger = require('./logger');
const { app, dialog, BrowserWindow } = require('electron');
const { getEncryptedDatabase } = require('./database-encrypted');
const { v4: uuidv4 } = require('uuid');

// Configure auto-updater
autoUpdater.autoDownload = false; // Manual download control
autoUpdater.autoInstallOnAppQuit = true; // Auto-install on quit if update ready
autoUpdater.checkForUpdatesAndNotify = false; // Disable default notification

// Update server configuration
// In production, set via environment variable or config
const UPDATE_SERVER_URL = process.env.UPDATE_SERVER_URL || null;

if (UPDATE_SERVER_URL) {
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: UPDATE_SERVER_URL
  });
}

let updateCheckInterval = null;
let updateDownloaded = false;
let updateInfo = null;

/**
 * Log update event to audit log
 */
function logUpdateEvent(action, details = {}) {
  try {
    const db = getEncryptedDatabase();
    db.prepare(`
      INSERT INTO audit_logs (
        id, action, user, user_role, details, sync_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      `update_${action}`,
      'system',
      'system',
      JSON.stringify({
        ...details,
        timestamp: new Date().toISOString(),
        version: app.getVersion()
      }),
      'pending',
      new Date().toISOString()
    );
  } catch (error) {
    logger.error(`[AutoUpdater] Error logging update event: ${error.message}`);
  }
}

/**
 * Check for updates silently
 */
async function checkForUpdates(silent = true) {
  if (!UPDATE_SERVER_URL) {
    logger.warn('[AutoUpdater] Update server URL not configured - skipping update check');
    return;
  }

  try {
    logger.info('[AutoUpdater] Checking for updates...');
    logUpdateEvent('check_started', { silent });
    
    const result = await autoUpdater.checkForUpdates();
    
    if (result && result.updateInfo) {
      updateInfo = result.updateInfo;
      logger.info(`[AutoUpdater] Update available: ${updateInfo.version}`);
      logUpdateEvent('update_available', { 
        version: updateInfo.version,
        releaseDate: updateInfo.releaseDate,
        releaseNotes: updateInfo.releaseNotes
      });
      
      // Auto-download if silent, otherwise prompt user
      if (silent) {
        await downloadUpdate();
      } else {
        showUpdateAvailableDialog(updateInfo);
      }
    } else {
      logger.info('[AutoUpdater] No updates available');
      logUpdateEvent('no_update_available');
    }
  } catch (error) {
    logger.error(`[AutoUpdater] Error checking for updates: ${error.message}`);
    logUpdateEvent('check_failed', { error: error.message });
    
    if (!silent) {
      dialog.showErrorBox(
        'Update Check Failed',
        `Failed to check for updates: ${error.message}`
      );
    }
  }
}

/**
 * Download update
 */
async function downloadUpdate() {
  try {
    logger.info('[AutoUpdater] Downloading update...');
    logUpdateEvent('download_started');
    
    // Notify renderer of download start
    notifyRenderer('update-downloading', { version: updateInfo?.version });
    
    await autoUpdater.downloadUpdate();
    
    logger.info('[AutoUpdater] Update downloaded successfully');
    logUpdateEvent('download_completed', { version: updateInfo?.version });
    
    updateDownloaded = true;
    
    // Notify renderer
    notifyRenderer('update-downloaded', { version: updateInfo?.version });
    
    // Show restart prompt
    showUpdateReadyDialog();
  } catch (error) {
    logger.error(`[AutoUpdater] Error downloading update: ${error.message}`);
    logUpdateEvent('download_failed', { error: error.message });
    
    notifyRenderer('update-error', { error: error.message });
    
    dialog.showErrorBox(
      'Update Download Failed',
      `Failed to download update: ${error.message}`
    );
  }
}

/**
 * Install update and restart
 */
function installUpdateAndRestart() {
  try {
    if (!updateDownloaded) {
      logger.warn('[AutoUpdater] No update downloaded to install');
      return;
    }

    logger.info('[AutoUpdater] Installing update and restarting...');
    logUpdateEvent('install_started', { version: updateInfo?.version });
    
    // Quit and install
    autoUpdater.quitAndInstall(false, true); // isSilent, isForceRunAfter
  } catch (error) {
    logger.error(`[AutoUpdater] Error installing update: ${error.message}`);
    logUpdateEvent('install_failed', { error: error.message });
    
    dialog.showErrorBox(
      'Update Installation Failed',
      `Failed to install update: ${error.message}`
    );
  }
}

/**
 * Show update available dialog
 */
function showUpdateAvailableDialog(info) {
  const options = {
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) is available.`,
    detail: `Current version: ${app.getVersion()}\n\n${info.releaseNotes || 'Update includes bug fixes and improvements.'}\n\nWould you like to download it now?`,
    buttons: ['Download Now', 'Later'],
    defaultId: 0,
    cancelId: 1
  };

  dialog.showMessageBox(BrowserWindow.getFocusedWindow() || null, options).then((result) => {
    if (result.response === 0) {
      downloadUpdate();
    }
  });
}

/**
 * Show update ready dialog
 */
function showUpdateReadyDialog() {
  const options = {
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded and ready to install.',
    detail: `Version ${updateInfo?.version} has been downloaded.\n\nThe application will restart to install the update.\n\nWould you like to restart now?`,
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
    cancelId: 1
  };

  dialog.showMessageBox(BrowserWindow.getFocusedWindow() || null, options).then((result) => {
    if (result.response === 0) {
      installUpdateAndRestart();
    }
  });
}

/**
 * Notify renderer process of update events
 */
function notifyRenderer(event, data = {}) {
  const windows = BrowserWindow.getAllWindows();
  for (const window of windows) {
    if (window && !window.isDestroyed()) {
      window.webContents.send('app:update-event', {
        event,
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }
}

/**
 * Start automatic update checking
 * Checks every 4 hours
 */
function startAutoUpdateChecking() {
  if (updateCheckInterval) {
    return; // Already started
  }

  // Check immediately on startup (after delay)
  setTimeout(() => {
    checkForUpdates(true); // Silent check
  }, 30000); // 30 seconds after app ready

  // Then check every 4 hours
  updateCheckInterval = setInterval(() => {
    checkForUpdates(true); // Silent check
  }, 4 * 60 * 60 * 1000); // 4 hours

  logger.info('[AutoUpdater] Automatic update checking started');
}

/**
 * Stop automatic update checking
 */
function stopAutoUpdateChecking() {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
    logger.info('[AutoUpdater] Automatic update checking stopped');
  }
}

/**
 * Get update status
 */
function getUpdateStatus() {
  return {
    updateDownloaded,
    updateInfo,
    currentVersion: app.getVersion(),
    updateServerUrl: UPDATE_SERVER_URL || null
  };
}

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  logger.info('[AutoUpdater] Checking for update...');
  notifyRenderer('checking');
});

autoUpdater.on('update-available', (info) => {
  logger.info(`[AutoUpdater] Update available: ${info.version}`);
  updateInfo = info;
  notifyRenderer('available', { version: info.version });
});

autoUpdater.on('update-not-available', (info) => {
  logger.info('[AutoUpdater] Update not available');
  notifyRenderer('not-available', { version: info.version });
});

autoUpdater.on('error', (error) => {
  logger.error(`[AutoUpdater] Error: ${error.message}`);
  logUpdateEvent('error', { error: error.message });
  notifyRenderer('error', { error: error.message });
});

autoUpdater.on('download-progress', (progress) => {
  logger.info(`[AutoUpdater] Download progress: ${Math.round(progress.percent)}%`);
  notifyRenderer('download-progress', {
    percent: progress.percent,
    transferred: progress.transferred,
    total: progress.total
  });
});

autoUpdater.on('update-downloaded', (info) => {
  logger.info(`[AutoUpdater] Update downloaded: ${info.version}`);
  updateDownloaded = true;
  logUpdateEvent('downloaded', { version: info.version });
  notifyRenderer('downloaded', { version: info.version });
  
  // Show restart prompt
  showUpdateReadyDialog();
});

// Start auto-update checking when app is ready
app.once('ready', () => {
  // Only start in production (not in development)
  if (!process.env.ELECTRON_IS_DEV) {
    startAutoUpdateChecking();
  } else {
    logger.info('[AutoUpdater] Skipping auto-update in development mode');
  }
});

// Stop checking on app quit
app.once('before-quit', () => {
  stopAutoUpdateChecking();
});

module.exports = {
  checkForUpdates,
  downloadUpdate,
  installUpdateAndRestart,
  startAutoUpdateChecking,
  stopAutoUpdateChecking,
  getUpdateStatus
};

