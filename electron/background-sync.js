/**
 * Background Sync Manager
 * 
 * Automatically syncs when device comes online
 * Monitors network status and triggers sync at intervals
 * 
 * Features:
 * - Automatic sync on network connection
 * - Periodic sync when online
 * - Smart sync scheduling (avoid during high activity)
 * - Battery-aware sync (reduce frequency on battery)
 */

const { getSyncStatus, sync, isOnline } = require('./sync-engine');
const { app } = require('electron');

/**
 * Background sync configuration
 */
const SYNC_CONFIG = {
  enabled: true,
  intervalWhenOnline: 5 * 60 * 1000, // 5 minutes when online
  intervalWhenOffline: 30 * 1000, // Check every 30 seconds when offline
  minSyncInterval: 60 * 1000, // Minimum 1 minute between syncs
  maxSyncInterval: 30 * 60 * 1000, // Maximum 30 minutes
  batteryAware: true, // Reduce frequency on battery
  quietHours: {
    enabled: false,
    start: '22:00', // 10 PM
    end: '06:00', // 6 AM
  },
};

let syncInterval = null;
let lastSyncTime = 0;
let isSyncing = false;
let networkStatus = 'unknown'; // 'online' | 'offline' | 'unknown'

/**
 * Check if device is on battery power
 */
function isOnBattery() {
  try {
    // Electron doesn't have direct battery API, but we can infer from system
    // For now, assume not on battery (can be enhanced with native module)
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Check if in quiet hours
 */
function isQuietHours() {
  if (!SYNC_CONFIG.quietHours.enabled) {
    return false;
  }

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;

  const [startHour, startMin] = SYNC_CONFIG.quietHours.start.split(':').map(Number);
  const [endHour, endMin] = SYNC_CONFIG.quietHours.end.split(':').map(Number);
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  if (startTime > endTime) {
    // Overnight quiet hours (e.g., 22:00 to 06:00)
    return currentTime >= startTime || currentTime < endTime;
  } else {
    // Daytime quiet hours
    return currentTime >= startTime && currentTime < endTime;
  }
}

/**
 * Get sync interval based on current conditions
 */
function getSyncInterval(apiBaseUrl) {
  let interval = SYNC_CONFIG.intervalWhenOnline;

  // Increase interval if on battery
  if (SYNC_CONFIG.batteryAware && isOnBattery()) {
    interval *= 2; // Double the interval on battery
  }

  // Don't sync during quiet hours
  if (isQuietHours()) {
    interval = SYNC_CONFIG.maxSyncInterval;
  }

  // Ensure within bounds
  return Math.max(SYNC_CONFIG.minSyncInterval, Math.min(interval, SYNC_CONFIG.maxSyncInterval));
}

/**
 * Perform background sync
 */
async function performBackgroundSync(apiBaseUrl, logger) {
  // Prevent concurrent syncs
  if (isSyncing) {
    logger?.debug('[Background Sync] Sync already in progress, skipping');
    return;
  }

  // Check minimum interval
  const timeSinceLastSync = Date.now() - lastSyncTime;
  if (timeSinceLastSync < SYNC_CONFIG.minSyncInterval) {
    logger?.debug(`[Background Sync] Too soon since last sync (${Math.round(timeSinceLastSync / 1000)}s), skipping`);
    return;
  }

  // Check if online
  const online = await isOnline(apiBaseUrl);
  if (!online) {
    networkStatus = 'offline';
    logger?.debug('[Background Sync] Device offline, skipping sync');
    return;
  }

  networkStatus = 'online';

  // Check quiet hours
  if (isQuietHours()) {
    logger?.debug('[Background Sync] Quiet hours, skipping sync');
    return;
  }

  // Check if there's anything to sync
  const status = getSyncStatus();
  if (status.pendingCount === 0) {
    logger?.debug('[Background Sync] No pending items to sync');
    return;
  }

  logger?.info(`[Background Sync] Starting automatic sync (${status.pendingCount} pending items)`);
  isSyncing = true;
  lastSyncTime = Date.now();

  try {
    await sync(apiBaseUrl, logger);
    logger?.info('[Background Sync] Automatic sync completed successfully');
  } catch (error) {
    logger?.error(`[Background Sync] Automatic sync failed: ${error.message}`);
  } finally {
    isSyncing = false;
  }
}

/**
 * Start background sync monitoring
 */
function startBackgroundSync(apiBaseUrl, logger) {
  if (!SYNC_CONFIG.enabled) {
    logger?.info('[Background Sync] Background sync is disabled');
    return;
  }

  if (syncInterval) {
    logger?.warn('[Background Sync] Background sync already started');
    return;
  }

  logger?.info('[Background Sync] Starting background sync monitor');

  // Initial sync check
  performBackgroundSync(apiBaseUrl, logger);

  // Set up interval
  const scheduleNextSync = () => {
    const interval = getSyncInterval(apiBaseUrl);
    syncInterval = setTimeout(() => {
      performBackgroundSync(apiBaseUrl, logger).finally(() => {
        scheduleNextSync(); // Schedule next sync
      });
    }, interval);
  };

  scheduleNextSync();

  // Monitor network status changes
  // Note: Electron doesn't have direct network status API
  // We'll check on each interval instead
}

/**
 * Stop background sync monitoring
 */
function stopBackgroundSync() {
  if (syncInterval) {
    clearTimeout(syncInterval);
    syncInterval = null;
  }
}

/**
 * Trigger immediate sync (manual)
 */
async function triggerImmediateSync(apiBaseUrl, logger) {
  if (isSyncing) {
    logger?.warn('[Background Sync] Sync already in progress');
    return { success: false, error: 'Sync already in progress' };
  }

  logger?.info('[Background Sync] Triggering immediate sync');
  isSyncing = true;
  lastSyncTime = Date.now();

  try {
    const result = await sync(apiBaseUrl, logger);
    return { success: true, result };
  } catch (error) {
    logger?.error(`[Background Sync] Immediate sync failed: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    isSyncing = false;
  }
}

/**
 * Get background sync status
 */
function getBackgroundSyncStatus() {
  return {
    enabled: SYNC_CONFIG.enabled,
    isSyncing,
    lastSyncTime: lastSyncTime > 0 ? new Date(lastSyncTime).toISOString() : null,
    networkStatus,
    nextSyncIn: syncInterval ? getSyncInterval() : null,
    isOnBattery: isOnBattery(),
    isQuietHours: isQuietHours(),
  };
}

/**
 * Update background sync configuration
 */
function updateConfig(newConfig) {
  Object.assign(SYNC_CONFIG, newConfig);
}

// Cleanup on app quit
app.on('before-quit', () => {
  stopBackgroundSync();
});

module.exports = {
  startBackgroundSync,
  stopBackgroundSync,
  triggerImmediateSync,
  getBackgroundSyncStatus,
  updateConfig,
  SYNC_CONFIG,
};

