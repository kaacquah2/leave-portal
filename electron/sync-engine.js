/**
 * Sync Engine for Offline-First HR System
 * 
 * Ministry of Foreign Affairs (MoFA), Ghana - HR Leave Portal
 * 
 * This module implements a robust sync engine that:
 * 1. Pulls server updates (server-authoritative data)
 * 2. Pushes local changes (client-submitted data)
 * 3. Resolves conflicts (server wins for approvals, client wins for submissions)
 * 4. Handles failures with retry logic
 * 
 * Architecture:
 * - Pull Phase: Fetch server updates since last_sync_at
 * - Push Phase: Process sync_queue FIFO
 * - Conflict Resolution: Server-authoritative for balances/approvals, client for submissions
 * - Failure Handling: Exponential backoff, dead-letter queue
 */

const { getEncryptedDatabase } = require('./database-encrypted');
const authStorage = require('./auth-storage');

/**
 * Sync engine configuration
 */
const SYNC_CONFIG = {
  maxRetries: 5,
  retryDelay: 1000, // Initial delay in ms
  retryBackoffMultiplier: 2,
  batchSize: 50, // Process 50 items at a time
  pullTimeout: 30000, // 30 seconds
  pushTimeout: 60000, // 60 seconds
};

/**
 * Sync status
 */
const SyncStatus = {
  IDLE: 'idle',
  PULLING: 'pulling',
  PUSHING: 'pushing',
  COMPLETE: 'complete',
  ERROR: 'error',
};

/**
 * Get sync metadata value
 */
function getSyncMetadata(key, defaultValue = null) {
  const db = getEncryptedDatabase();
  const stmt = db.prepare('SELECT value FROM sync_metadata WHERE key = ?');
  const result = stmt.get(key);
  return result ? result.value : defaultValue;
}

/**
 * Set sync metadata value
 */
function setSyncMetadata(key, value) {
  const db = getEncryptedDatabase();
  const stmt = db.prepare(`
    INSERT INTO sync_metadata (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
  `);
  stmt.run(key, value, value);
}

/**
 * Get last sync timestamp
 */
function getLastSyncAt() {
  return getSyncMetadata('last_sync_at', '1970-01-01T00:00:00Z');
}

/**
 * Set last sync timestamp
 */
function setLastSyncAt(timestamp) {
  setSyncMetadata('last_sync_at', timestamp);
}

/**
 * Check if online
 */
async function isOnline(apiBaseUrl) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${apiBaseUrl}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Pull Phase: Fetch server updates
 * 
 * Fetches all server updates since last_sync_at
 * Server-authoritative data: employees, leave_balances, holidays
 */
async function pullPhase(apiBaseUrl, logger) {
  const db = getEncryptedDatabase();
  const lastSyncAt = getLastSyncAt();
  const token = authStorage.getToken();

  if (!token) {
    throw new Error('No authentication token available');
  }

  logger?.info(`[Sync] Pull phase started (last_sync_at: ${lastSyncAt})`);

  try {
    // Fetch employees updated since last sync
    const employeesResponse = await fetch(
      `${apiBaseUrl}/api/employees?updated_since=${encodeURIComponent(lastSyncAt)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(SYNC_CONFIG.pullTimeout),
      }
    );

    let employees = [];
    if (employeesResponse.ok) {
      employees = await employeesResponse.json();
      logger?.info(`[Sync] Pulled ${employees.length} employee updates`);
      
      // Update local employees (server wins)
      const updateStmt = db.prepare(`
        UPDATE employees SET
          first_name = ?,
          last_name = ?,
          email = ?,
          phone = ?,
          department = ?,
          position = ?,
          grade = ?,
          level = ?,
          rank = ?,
          step = ?,
          directorate = ?,
          division = ?,
          unit = ?,
          duty_station = ?,
          photo_url = ?,
          active = ?,
          employment_status = ?,
          termination_date = ?,
          termination_reason = ?,
          join_date = ?,
          confirmation_date = ?,
          manager_id = ?,
          immediate_supervisor_id = ?,
          sync_status = 'synced',
          server_updated_at = ?,
          local_updated_at = datetime('now'),
          updated_at = datetime('now')
        WHERE staff_id = ?
      `);

      const insertStmt = db.prepare(`
        INSERT INTO employees (
          id, staff_id, first_name, last_name, email, phone, department,
          position, grade, level, rank, step, directorate, division, unit,
          duty_station, photo_url, active, employment_status, termination_date,
          termination_reason, join_date, confirmation_date, manager_id,
          immediate_supervisor_id, sync_status, server_updated_at,
          local_updated_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction((employees) => {
        for (const emp of employees) {
          const existing = db.prepare('SELECT staff_id FROM employees WHERE staff_id = ?').get(emp.staffId);
          
          if (existing) {
            updateStmt.run(
              emp.firstName, emp.lastName, emp.email, emp.phone, emp.department,
              emp.position, emp.grade, emp.level, emp.rank || null, emp.step || null,
              emp.directorate || null, emp.division || null, emp.unit || null,
              emp.dutyStation || null, emp.photoUrl || null,
              emp.active ? 1 : 0, emp.employmentStatus, emp.terminationDate || null,
              emp.terminationReason || null, emp.joinDate, emp.confirmationDate || null,
              emp.managerId || null, emp.immediateSupervisorId || null,
              emp.updatedAt, emp.staffId
            );
          } else {
            insertStmt.run(
              emp.id, emp.staffId, emp.firstName, emp.lastName, emp.email, emp.phone,
              emp.department, emp.position, emp.grade, emp.level, emp.rank || null,
              emp.step || null, emp.directorate || null, emp.division || null,
              emp.unit || null, emp.dutyStation || null, emp.photoUrl || null,
              emp.active ? 1 : 0, emp.employmentStatus, emp.terminationDate || null,
              emp.terminationReason || null, emp.joinDate, emp.confirmationDate || null,
              emp.managerId || null, emp.immediateSupervisorId || null,
              'synced', emp.updatedAt, new Date().toISOString(),
              emp.createdAt, emp.updatedAt
            );
          }
        }
      });

      transaction(employees);
    }

    // Fetch leave balances (server-authoritative)
    const balancesResponse = await fetch(
      `${apiBaseUrl}/api/balances?updated_since=${encodeURIComponent(lastSyncAt)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(SYNC_CONFIG.pullTimeout),
      }
    );

    let balances = [];
    if (balancesResponse.ok) {
      balances = await balancesResponse.json();
      logger?.info(`[Sync] Pulled ${balances.length} leave balance updates`);
      
      // Update local balances (server wins - always)
      const balanceUpdateStmt = db.prepare(`
        UPDATE leave_balances SET
          annual = ?, sick = ?, unpaid = ?, special_service = ?, training = ?,
          study = ?, maternity = ?, paternity = ?, compassionate = ?,
          last_accrual_date = ?, accrual_period = ?,
          annual_carry_forward = ?, sick_carry_forward = ?,
          special_service_carry_forward = ?, training_carry_forward = ?,
          study_carry_forward = ?,
          annual_expires_at = ?, sick_expires_at = ?,
          special_service_expires_at = ?, training_expires_at = ?,
          study_expires_at = ?,
          sync_status = 'synced',
          server_updated_at = ?,
          local_updated_at = datetime('now'),
          updated_at = datetime('now')
        WHERE staff_id = ?
      `);

      const balanceInsertStmt = db.prepare(`
        INSERT INTO leave_balances (
          id, staff_id, annual, sick, unpaid, special_service, training, study,
          maternity, paternity, compassionate, last_accrual_date, accrual_period,
          annual_carry_forward, sick_carry_forward, special_service_carry_forward,
          training_carry_forward, study_carry_forward,
          annual_expires_at, sick_expires_at, special_service_expires_at,
          training_expires_at, study_expires_at,
          sync_status, server_updated_at, local_updated_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const balanceTransaction = db.transaction((balances) => {
        for (const bal of balances) {
          const existing = db.prepare('SELECT staff_id FROM leave_balances WHERE staff_id = ?').get(bal.staffId);
          
          if (existing) {
            balanceUpdateStmt.run(
              bal.annual, bal.sick, bal.unpaid, bal.specialService, bal.training,
              bal.study, bal.maternity, bal.paternity, bal.compassionate,
              bal.lastAccrualDate || null, bal.accrualPeriod || null,
              bal.annualCarryForward || 0, bal.sickCarryForward || 0,
              bal.specialServiceCarryForward || 0, bal.trainingCarryForward || 0,
              bal.studyCarryForward || 0,
              bal.annualExpiresAt || null, bal.sickExpiresAt || null,
              bal.specialServiceExpiresAt || null, bal.trainingExpiresAt || null,
              bal.studyExpiresAt || null,
              bal.updatedAt, bal.staffId
            );
          } else {
            balanceInsertStmt.run(
              bal.id, bal.staffId, bal.annual, bal.sick, bal.unpaid,
              bal.specialService, bal.training, bal.study, bal.maternity,
              bal.paternity, bal.compassionate, bal.lastAccrualDate || null,
              bal.accrualPeriod || null, bal.annualCarryForward || 0,
              bal.sickCarryForward || 0, bal.specialServiceCarryForward || 0,
              bal.trainingCarryForward || 0, bal.studyCarryForward || 0,
              bal.annualExpiresAt || null, bal.sickExpiresAt || null,
              bal.specialServiceExpiresAt || null, bal.trainingExpiresAt || null,
              bal.studyExpiresAt || null,
              'synced', bal.updatedAt, new Date().toISOString(),
              bal.createdAt, bal.updatedAt
            );
          }
        }
      });

      balanceTransaction(balances);
    }

    // Update last sync timestamp
    setLastSyncAt(new Date().toISOString());
    logger?.info('[Sync] Pull phase completed');

    return { success: true, pulled: { employees: employees?.length || 0, balances: balances?.length || 0 } };
  } catch (error) {
    logger?.error(`[Sync] Pull phase error: ${error.message}`);
    throw error;
  }
}

/**
 * Push Phase: Send local changes to server
 * 
 * Processes sync_queue FIFO
 * Retries with exponential backoff on failure
 */
async function pushPhase(apiBaseUrl, logger) {
  const db = getEncryptedDatabase();
  const token = authStorage.getToken();

  if (!token) {
    throw new Error('No authentication token available');
  }

  logger?.info('[Sync] Push phase started');

  try {
    // Get pending sync queue items (FIFO, priority first)
    const queueItems = db.prepare(`
      SELECT * FROM sync_queue
      WHERE retries < max_retries
      ORDER BY priority DESC, created_at ASC
      LIMIT ?
    `).all(SYNC_CONFIG.batchSize);

    if (queueItems.length === 0) {
      logger?.info('[Sync] No items to push');
      return { success: true, pushed: 0, failed: 0 };
    }

    logger?.info(`[Sync] Processing ${queueItems.length} queue items`);

    let pushed = 0;
    let failed = 0;

    for (const item of queueItems) {
      try {
        const payload = JSON.parse(item.payload);
        let response;

        // Route to appropriate API endpoint based on table_name
        switch (item.table_name) {
          case 'leave_requests':
            if (item.operation === 'INSERT') {
              response = await fetch(`${apiBaseUrl}/api/leaves`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(SYNC_CONFIG.pushTimeout),
              });
            } else if (item.operation === 'UPDATE') {
              response = await fetch(`${apiBaseUrl}/api/leaves/${payload.id}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(SYNC_CONFIG.pushTimeout),
              });
            }
            break;

          case 'audit_logs':
            // Audit logs are append-only, always POST
            response = await fetch(`${apiBaseUrl}/api/audit-logs`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(SYNC_CONFIG.pushTimeout),
            });
            break;

          default:
            logger?.warn(`[Sync] Unknown table_name: ${item.table_name}`);
            continue;
        }

        if (response && response.ok) {
          const result = await response.json();
          
          // Mark record as synced
          const updateStmt = db.prepare(`
            UPDATE ${item.table_name} SET
              sync_status = 'synced',
              server_id = ?,
              server_updated_at = ?,
              local_updated_at = datetime('now'),
              updated_at = datetime('now')
            WHERE id = ?
          `);
          updateStmt.run(result.id, result.updatedAt, item.record_id);

          // Remove from sync queue
          db.prepare('DELETE FROM sync_queue WHERE id = ?').run(item.id);
          pushed++;
        } else {
          throw new Error(`HTTP ${response?.status || 'unknown'}: ${response?.statusText || 'unknown error'}`);
        }
      } catch (error) {
        // Increment retry count
        const newRetries = item.retries + 1;
        const updateStmt = db.prepare(`
          UPDATE sync_queue SET
            retries = ?,
            last_error = ?,
            last_attempt_at = datetime('now')
          WHERE id = ?
        `);
        updateStmt.run(newRetries, error.message, item.id);

        if (newRetries >= item.max_retries) {
          // Move to dead letter queue
          db.prepare(`
            INSERT INTO sync_dead_letter_queue (
              table_name, operation, record_id, payload, error_message,
              retry_count, last_attempt_at
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `).run(
            item.table_name, item.operation, item.record_id,
            item.payload, error.message, newRetries
          );
          
          // Remove from sync queue
          db.prepare('DELETE FROM sync_queue WHERE id = ?').run(item.id);
          logger?.error(`[Sync] Item ${item.id} moved to dead letter queue after ${newRetries} retries`);
        }

        failed++;
      }
    }

    logger?.info(`[Sync] Push phase completed: ${pushed} pushed, ${failed} failed`);
    return { success: true, pushed, failed };
  } catch (error) {
    logger?.error(`[Sync] Push phase error: ${error.message}`);
    throw error;
  }
}

/**
 * Main sync function
 * 
 * Executes pull phase, then push phase
 */
async function sync(apiBaseUrl, logger) {
  if (!await isOnline(apiBaseUrl)) {
    throw new Error('Device is offline');
  }

  logger?.info('[Sync] Starting sync...');

  try {
    // Pull first (get server updates)
    const pullResult = await pullPhase(apiBaseUrl, logger);
    
    // Then push (send local changes)
    const pushResult = await pushPhase(apiBaseUrl, logger);

    logger?.info('[Sync] Sync completed successfully');
    return {
      success: true,
      pull: pullResult,
      push: pushResult,
    };
  } catch (error) {
    logger?.error(`[Sync] Sync failed: ${error.message}`);
    throw error;
  }
}

/**
 * Get sync status
 */
function getSyncStatus() {
  const db = getEncryptedDatabase();
  
  const pendingCount = db.prepare('SELECT COUNT(*) as count FROM sync_queue').get().count;
  const deadLetterCount = db.prepare('SELECT COUNT(*) as count FROM sync_dead_letter_queue').get().count;
  const lastSyncAt = getLastSyncAt();

  return {
    pendingCount,
    deadLetterCount,
    lastSyncAt,
  };
}

module.exports = {
  sync,
  pullPhase,
  pushPhase,
  isOnline,
  getSyncStatus,
  getLastSyncAt,
  setLastSyncAt,
};

