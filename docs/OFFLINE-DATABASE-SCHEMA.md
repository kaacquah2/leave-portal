# Offline Database Schema Documentation

## Overview

The Electron desktop application uses a local SQLite database for offline data storage. This database mirrors key tables from the remote PostgreSQL database and maintains a sync queue for pending changes.

## Database Location

- **Path:** `app.getPath('userData')/database.sqlite`
- **Format:** SQLite 3 with WAL (Write-Ahead Logging) mode enabled
- **Platform:** Cross-platform (Windows, macOS, Linux)

## Tables

### 1. `sync_queue`

Stores pending changes that need to be synced with the remote server.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-incrementing ID |
| `table_name` | TEXT NOT NULL | Name of the table (e.g., 'LeaveRequest') |
| `operation` | TEXT NOT NULL | Operation type: 'INSERT', 'UPDATE', or 'DELETE' |
| `record_id` | TEXT NOT NULL | ID of the record |
| `payload` | TEXT NOT NULL | JSON string of the record data |
| `created_at` | TEXT NOT NULL | Timestamp when queued |
| `retries` | INTEGER DEFAULT 0 | Number of sync retry attempts |
| `last_error` | TEXT | Last error message if sync failed |

**Indexes:**
- `idx_sync_queue_created_at` on `created_at`
- `idx_sync_queue_table_name` on `table_name`

### 2. `sync_metadata`

Stores metadata about sync operations.

| Column | Type | Description |
|--------|------|-------------|
| `key` | TEXT PRIMARY KEY | Metadata key (e.g., 'last_sync_time') |
| `value` | TEXT NOT NULL | Metadata value |
| `updated_at` | TEXT NOT NULL | Last update timestamp |

**Common Keys:**
- `last_sync_time`: ISO timestamp of last successful sync

### 3. `StaffMember`

Mirrors the remote StaffMember table for offline access.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | Unique identifier |
| `staffId` | TEXT UNIQUE NOT NULL | Staff ID |
| `firstName` | TEXT NOT NULL | First name |
| `lastName` | TEXT NOT NULL | Last name |
| `email` | TEXT UNIQUE NOT NULL | Email address |
| `phone` | TEXT NOT NULL | Phone number |
| `department` | TEXT NOT NULL | Department |
| `position` | TEXT NOT NULL | Position |
| `grade` | TEXT NOT NULL | Grade |
| `level` | TEXT NOT NULL | Level |
| `rank` | TEXT | Staff rank |
| `step` | TEXT | Step within grade |
| `directorate` | TEXT | Directorate name |
| `division` | TEXT | Division name |
| `unit` | TEXT | Unit name |
| `dutyStation` | TEXT | Duty station |
| `photoUrl` | TEXT | Photo URL |
| `active` | INTEGER DEFAULT 1 | Active status (0 or 1) |
| `employmentStatus` | TEXT DEFAULT 'active' | Employment status |
| `terminationDate` | TEXT | Termination date |
| `terminationReason` | TEXT | Termination reason |
| `joinDate` | TEXT NOT NULL | Join date |
| `confirmationDate` | TEXT | Confirmation date |
| `managerId` | TEXT | Manager staff ID |
| `immediateSupervisorId` | TEXT | Supervisor staff ID |
| `createdAt` | TEXT NOT NULL | Creation timestamp |
| `updatedAt` | TEXT NOT NULL | Last update timestamp |
| `synced` | INTEGER DEFAULT 0 | Sync status (0 or 1) |
| `synced_at` | TEXT | Last sync timestamp |

**Indexes:**
- `idx_staff_member_staff_id` on `staffId`

### 4. `LeaveRequest`

Mirrors the remote LeaveRequest table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | Unique identifier |
| `staffId` | TEXT NOT NULL | Staff ID (foreign key) |
| `staffName` | TEXT NOT NULL | Staff name |
| `leaveType` | TEXT NOT NULL | Leave type |
| `startDate` | TEXT NOT NULL | Start date (ISO format) |
| `endDate` | TEXT NOT NULL | End date (ISO format) |
| `days` | INTEGER NOT NULL | Number of days |
| `reason` | TEXT NOT NULL | Reason for leave |
| `status` | TEXT DEFAULT 'pending' | Status: 'pending', 'approved', 'rejected', 'cancelled' |
| `approvedBy` | TEXT | Approver user ID |
| `approvalDate` | TEXT | Approval date |
| `templateId` | TEXT | Template ID |
| `approvalLevels` | TEXT | JSON string of approval levels |
| `officerTakingOver` | TEXT | Officer taking over |
| `handoverNotes` | TEXT | Handover notes |
| `declarationAccepted` | INTEGER DEFAULT 0 | Declaration accepted (0 or 1) |
| `payrollImpactFlag` | INTEGER DEFAULT 0 | Payroll impact flag |
| `locked` | INTEGER DEFAULT 0 | Locked status |
| `createdAt` | TEXT NOT NULL | Creation timestamp |
| `updatedAt` | TEXT NOT NULL | Last update timestamp |
| `synced` | INTEGER DEFAULT 0 | Sync status |
| `synced_at` | TEXT | Last sync timestamp |

**Indexes:**
- `idx_leave_request_staff_id` on `staffId`
- `idx_leave_request_status` on `status`

**Foreign Keys:**
- `staffId` references `StaffMember(staffId)`

### 5. `LeaveBalance`

Mirrors the remote LeaveBalance table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | Unique identifier |
| `staffId` | TEXT UNIQUE NOT NULL | Staff ID (foreign key) |
| `annual` | REAL DEFAULT 0 | Annual leave balance |
| `sick` | REAL DEFAULT 0 | Sick leave balance |
| `unpaid` | REAL DEFAULT 0 | Unpaid leave balance |
| `specialService` | REAL DEFAULT 0 | Special service leave |
| `training` | REAL DEFAULT 0 | Training leave |
| `study` | REAL DEFAULT 0 | Study leave |
| `maternity` | REAL DEFAULT 0 | Maternity leave |
| `paternity` | REAL DEFAULT 0 | Paternity leave |
| `compassionate` | REAL DEFAULT 0 | Compassionate leave |
| `annualCarryForward` | REAL DEFAULT 0 | Annual carry forward |
| `sickCarryForward` | REAL DEFAULT 0 | Sick carry forward |
| `specialServiceCarryForward` | REAL DEFAULT 0 | Special service carry forward |
| `trainingCarryForward` | REAL DEFAULT 0 | Training carry forward |
| `studyCarryForward` | REAL DEFAULT 0 | Study carry forward |
| `lastAccrualDate` | TEXT | Last accrual date |
| `accrualPeriod` | TEXT | Accrual period |
| `annualExpiresAt` | TEXT | Annual leave expiration |
| `sickExpiresAt` | TEXT | Sick leave expiration |
| `specialServiceExpiresAt` | TEXT | Special service expiration |
| `trainingExpiresAt` | TEXT | Training leave expiration |
| `studyExpiresAt` | TEXT | Study leave expiration |
| `createdAt` | TEXT NOT NULL | Creation timestamp |
| `updatedAt` | TEXT NOT NULL | Last update timestamp |
| `synced` | INTEGER DEFAULT 0 | Sync status |
| `synced_at` | TEXT | Last sync timestamp |

**Indexes:**
- `idx_leave_balance_staff_id` on `staffId`

**Foreign Keys:**
- `staffId` references `StaffMember(staffId)`

### 6. `Holiday`

Stores holiday information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | Unique identifier |
| `name` | TEXT NOT NULL | Holiday name |
| `date` | TEXT NOT NULL | Holiday date (ISO format) |
| `type` | TEXT NOT NULL | Holiday type: 'public', 'company', 'regional' |
| `recurring` | INTEGER DEFAULT 0 | Recurring flag (0 or 1) |
| `year` | INTEGER | Year (if not recurring) |
| `createdAt` | TEXT NOT NULL | Creation timestamp |
| `updatedAt` | TEXT NOT NULL | Last update timestamp |
| `synced` | INTEGER DEFAULT 0 | Sync status |
| `synced_at` | TEXT | Last sync timestamp |

### 7. `LeaveRequestTemplate`

Stores leave request templates.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | Unique identifier |
| `name` | TEXT NOT NULL | Template name |
| `leaveType` | TEXT NOT NULL | Leave type |
| `defaultDays` | INTEGER NOT NULL | Default number of days |
| `defaultReason` | TEXT NOT NULL | Default reason |
| `department` | TEXT | Department |
| `active` | INTEGER DEFAULT 1 | Active status (0 or 1) |
| `createdAt` | TEXT NOT NULL | Creation timestamp |
| `updatedAt` | TEXT NOT NULL | Last update timestamp |
| `synced` | INTEGER DEFAULT 0 | Sync status |
| `synced_at` | TEXT | Last sync timestamp |

## Data Types

### TEXT
- Used for strings, dates (stored as ISO 8601 strings), and JSON data
- Dates are stored as ISO 8601 strings (e.g., "2024-12-01T10:00:00.000Z")

### INTEGER
- Used for numeric IDs, counts, and boolean flags (0 or 1)
- Boolean values: 0 = false, 1 = true

### REAL
- Used for floating-point numbers (leave balances, etc.)

## Sync Mechanism

### Adding to Sync Queue

When a record is created, updated, or deleted offline:

1. Record is saved to local table
2. Entry is added to `sync_queue` with:
   - `table_name`: Name of the table
   - `operation`: 'INSERT', 'UPDATE', or 'DELETE'
   - `record_id`: ID of the record
   - `payload`: JSON string of the record data

### Syncing to Server

When connection is restored:

1. Read items from `sync_queue` (oldest first)
2. Group by `table_name` for batch processing
3. Send batch to server via `/api/sync` endpoint
4. On success:
   - Remove item from `sync_queue`
   - Mark record as synced (`synced = 1`, `synced_at = now()`)
5. On failure:
   - Increment `retries` counter
   - Store error in `last_error`
   - Retry on next sync attempt

### Pulling from Server

When online:

1. Get `last_sync_time` from `sync_metadata`
2. Request changes from server via `/api/pull?since={last_sync_time}`
3. Upsert received records to local tables
4. Update `last_sync_time` in `sync_metadata`

## Best Practices

1. **Always use transactions** for multiple related operations
2. **Validate data** before inserting into sync queue
3. **Handle conflicts** when syncing (server data takes precedence)
4. **Clean up old sync queue items** after successful sync
5. **Monitor sync queue size** to prevent unbounded growth
6. **Backup database** periodically for disaster recovery

## Maintenance

### Log Rotation
- Logs are stored in `app.getPath('userData')/logs/`
- Maximum log file size: 10MB
- Maximum log files: 5
- Old logs are automatically rotated and removed

### Database Cleanup
- Sync queue items are removed after successful sync
- Old synced records can be archived (not implemented yet)
- Database file size should be monitored

## Security Considerations

1. **Database Location**: Stored in user data directory (protected by OS)
2. **No Encryption**: Database is not encrypted (consider adding for sensitive data)
3. **Access Control**: Only Electron main process can access database
4. **Data Validation**: All data should be validated before storage

## Migration

When schema changes:

1. Add new columns with `ALTER TABLE` (SQLite supports this)
2. Update sync logic to handle new fields
3. Test migration on sample database
4. Consider versioning the database schema

## API Reference

See `electron/database.js` for available functions:
- `initDatabase()` - Initialize database
- `addToSyncQueue()` - Add item to sync queue
- `getSyncQueue()` - Get sync queue items
- `removeFromSyncQueue()` - Remove item from queue
- `upsertRecord()` - Insert or update record
- `getRecord()` - Get record by ID
- `getAllRecords()` - Get all records from table
- `deleteRecord()` - Delete record
- `markSynced()` - Mark record as synced
- `getLastSyncTime()` - Get last sync timestamp
- `setLastSyncTime()` - Set last sync timestamp

