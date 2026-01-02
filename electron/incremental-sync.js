/**
 * Incremental Sync
 * 
 * Only syncs changed fields instead of entire records
 * Reduces bandwidth and improves sync performance
 * 
 * Features:
 * - Field-level change tracking
 * - Delta sync (only changed fields)
 * - Conflict detection at field level
 */

const { getEncryptedDatabase } = require('./database-encrypted');

/**
 * Track field-level changes
 */
function trackFieldChanges(tableName, recordId, changes) {
  const db = getEncryptedDatabase();
  const now = new Date().toISOString();

  // Store field changes in sync metadata
  const key = `field_changes:${tableName}:${recordId}`;
  const existing = db.prepare('SELECT value FROM sync_metadata WHERE key = ?').get(key);
  
  const fieldChanges = existing ? JSON.parse(existing.value) : {};
  
  // Merge new changes
  Object.assign(fieldChanges, changes);
  fieldChanges.lastUpdated = now;

  // Store back
  const stmt = db.prepare(`
    INSERT INTO sync_metadata (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
  `);
  stmt.run(key, JSON.stringify(fieldChanges), now, JSON.stringify(fieldChanges), now);
}

/**
 * Get field changes for a record
 */
function getFieldChanges(tableName, recordId) {
  const db = getEncryptedDatabase();
  const key = `field_changes:${tableName}:${recordId}`;
  const result = db.prepare('SELECT value FROM sync_metadata WHERE key = ?').get(key);
  
  if (!result) {
    return null;
  }

  return JSON.parse(result.value);
}

/**
 * Clear field changes after successful sync
 */
function clearFieldChanges(tableName, recordId) {
  const db = getEncryptedDatabase();
  const key = `field_changes:${tableName}:${recordId}`;
  db.prepare('DELETE FROM sync_metadata WHERE key = ?').run(key);
}

/**
 * Create delta payload (only changed fields)
 */
function createDeltaPayload(tableName, recordId, currentRecord, baseRecord) {
  const delta = {};
  let hasChanges = false;

  // Compare each field
  for (const [key, value] of Object.entries(currentRecord)) {
    // Skip sync metadata fields
    if (key.startsWith('sync_') || key.startsWith('server_') || key.startsWith('local_')) {
      continue;
    }

    // Check if field changed
    if (baseRecord && baseRecord[key] !== value) {
      delta[key] = value;
      hasChanges = true;
    } else if (!baseRecord) {
      // New record - include all fields
      delta[key] = value;
      hasChanges = true;
    }
  }

  if (!hasChanges) {
    return null;
  }

  return {
    table: tableName,
    id: recordId,
    operation: baseRecord ? 'UPDATE' : 'INSERT',
    delta,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Apply delta to record
 */
function applyDelta(record, delta) {
  const updated = { ...record };
  
  for (const [field, value] of Object.entries(delta.delta)) {
    updated[field] = value;
  }

  updated.updated_at = new Date().toISOString();
  return updated;
}

/**
 * Detect field-level conflicts
 */
function detectFieldConflicts(localRecord, serverRecord, trackedChanges) {
  const conflicts = [];

  if (!trackedChanges) {
    return conflicts;
  }

  // Check each changed field
  for (const [field, localValue] of Object.entries(trackedChanges)) {
    if (field === 'lastUpdated') continue;

    const serverValue = serverRecord[field];
    
    // If server also changed this field and values differ
    if (serverValue !== undefined && serverValue !== localValue) {
      conflicts.push({
        field,
        localValue,
        serverValue,
        resolution: 'server_wins', // Default: server wins
      });
    }
  }

  return conflicts;
}

/**
 * Sync with incremental updates
 */
async function syncIncremental(tableName, recordId, currentRecord, apiBaseUrl, token) {
  // Get base record (last synced version)
  const db = getEncryptedDatabase();
  const baseRecord = db.prepare(`SELECT * FROM ${tableName} WHERE id = ? OR staff_id = ?`).get(recordId, recordId);

  // Create delta payload
  const delta = createDeltaPayload(tableName, recordId, currentRecord, baseRecord);
  
  if (!delta) {
    return { synced: true, message: 'No changes to sync' };
  }

  // Compress delta (if compression enabled)
  const { compressJSON } = require('./sync-compression');
  const compressedDelta = await compressJSON(delta);

  // Send delta to server
  const response = await fetch(`${apiBaseUrl}/api/sync/delta`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
    },
    body: compressedDelta,
  });

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.statusText}`);
  }

  const result = await response.json();

  // Clear field changes on success
  clearFieldChanges(tableName, recordId);

  return {
    synced: true,
    result,
    deltaSize: compressedDelta.length,
    originalSize: JSON.stringify(currentRecord).length,
  };
}

/**
 * Get sync statistics
 */
function getIncrementalSyncStats() {
  const db = getEncryptedDatabase();
  
  // Count records with field changes
  const changes = db.prepare(`
    SELECT COUNT(*) as count
    FROM sync_metadata
    WHERE key LIKE 'field_changes:%'
  `).get();

  return {
    recordsWithChanges: changes.count,
  };
}

module.exports = {
  trackFieldChanges,
  getFieldChanges,
  clearFieldChanges,
  createDeltaPayload,
  applyDelta,
  detectFieldConflicts,
  syncIncremental,
  getIncrementalSyncStats,
};

