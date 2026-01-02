# Electron Offline-First Architecture

## Ministry of Foreign Affairs (MoFA), Ghana - HR Leave Portal

**Production-Grade Offline-First Desktop Application**

---

## Architecture Overview

This document describes the complete offline-first architecture for the Electron desktop application. The system is designed for **high-compliance government use** with **zero data loss tolerance**.

### Core Principles

1. **Offline-First**: All operations work offline; sync is optional enhancement
2. **No Direct Network Access**: Renderer process NEVER calls fetch/axios directly
3. **Server-Authoritative**: Server wins for balances, approvals, employee data
4. **Client-Submitted**: Client wins for leave request submissions
5. **Full Audit Trail**: Every action logged locally and synced
6. **Encrypted Storage**: SQLCipher encryption for database at rest

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    RENDERER PROCESS (React)                   │
│  - UI Components                                              │
│  - User Interactions                                           │
│  - NO direct network access                                   │
└───────────────────────┬───────────────────────────────────────┘
                        │ IPC (contextBridge)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    PRELOAD SCRIPT                            │
│  - Exposes secure IPC methods                                │
│  - window.electronAPI.repository.*                         │
└───────────────────────┬───────────────────────────────────────┘
                        │ IPC (ipcRenderer.invoke)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    MAIN PROCESS                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  IPC Handlers                                         │  │
│  │  - repo:employees:findAll                             │  │
│  │  - repo:leaveRequests:create                          │  │
│  │  - repo:sync:trigger                                  │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐  │
│  │  Repository Layer (TypeScript)                       │  │
│  │  - EmployeeRepository                                │  │
│  │  - LeaveRequestRepository                             │  │
│  │  - LeaveBalanceRepository                             │  │
│  │  - AuditLogRepository                                 │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐  │
│  │  Encrypted SQLite Database                           │  │
│  │  - SQLCipher encryption                               │  │
│  │  - WAL mode for concurrency                           │  │
│  │  - Foreign key constraints                            │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐  │
│  │  Sync Engine                                          │  │
│  │  - Pull Phase (server updates)                       │  │
│  │  - Push Phase (local changes)                         │  │
│  │  - Conflict Resolution                                │  │
│  │  - Retry Logic                                        │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐  │
│  │  API Client (Main Process Only)                      │  │
│  │  - Controlled network access                         │  │
│  │  - Bearer token authentication                       │  │
│  │  - Retry with exponential backoff                    │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
└─────────────────┼────────────────────────────────────────────┘
                  │ HTTPS
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              VERCEL API (PostgreSQL Backend)                │
│  - Server-authoritative data                               │
│  - Leave request processing                                │
│  - Approval workflows                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Tables

#### `employees` (Read-Only Offline)
- Staff member profiles
- Organizational structure
- Manager relationships
- **Sync**: Server-authoritative (server wins)

#### `leave_requests` (Read + Write Offline)
- Leave request submissions
- Status tracking
- Approval workflow
- **Sync**: Client submissions allowed, server approvals win

#### `leave_balances` (Read-Only Offline)
- Current leave balances
- Accrual tracking
- Expiration dates
- **Sync**: Server-authoritative (always server wins)

#### `audit_logs` (Write Offline)
- Immutable audit trail
- Every action logged
- **Sync**: Must sync (append-only)

#### `sync_queue` (Internal)
- Pending sync operations
- FIFO processing
- Retry tracking

#### `sync_metadata` (Internal)
- Last sync timestamp
- Sync configuration
- Schema version

#### `local_sessions` (Authentication)
- Device-bound sessions
- Token hashing (not plain storage)
- Expiration enforcement

---

## Sync Engine

### Pull Phase

1. **Fetch Server Updates**
   - Query server for updates since `last_sync_at`
   - Server-authoritative data: employees, balances, holidays
   - Apply updates to local database (server wins)

2. **Conflict Resolution**
   - Server always wins for balances and approvals
   - Client submissions preserved for leave requests

### Push Phase

1. **Process Sync Queue**
   - FIFO processing (priority first)
   - Batch processing (50 items at a time)
   - Idempotent API requests

2. **Retry Logic**
   - Exponential backoff (1s, 2s, 4s, 8s, 16s)
   - Max 5 retries
   - Dead-letter queue for failures

3. **Success Handling**
   - Mark records as synced
   - Update `server_id` and `server_updated_at`
   - Remove from sync queue

---

## Security

### Database Encryption

- **SQLCipher**: AES-256 encryption at rest
- **Key Storage**: OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- **Fallback**: Encrypted file storage if keychain unavailable
- **Key Rotation**: Support for key versioning and rotation

### Session Management

- **Device-Bound**: Sessions tied to device ID
- **Token Hashing**: Tokens hashed (SHA-256) before storage
- **No Password Storage**: Passwords never stored offline
- **Expiration Enforcement**: Automatic logout on expiry
- **Activity Tracking**: Last activity timestamp

### Network Security

- **No Renderer Access**: Renderer process cannot make network requests
- **Controlled API Access**: Only main process can call APIs
- **Bearer Token Auth**: Secure token-based authentication
- **Path Validation**: API path allowlist enforcement

---

## Offline Permissions

### Role-Based Access Control

| Role | Employees | Leave Requests | Leave Balances | Audit Logs |
|------|-----------|----------------|----------------|------------|
| **Staff** | Own only | Create own, view own | Own only | No access |
| **Supervisor** | View all | View all | View all | No access |
| **HR Officer** | View all | View all, draft (no approve offline) | View all | View all |
| **Director** | View all | View all | View all | View all |
| **System Admin** | View all | View all (no admin actions offline) | View all | View all |

### Enforcement

- Permissions checked in repository layer
- UI disabled for unauthorized actions
- Server-side validation on sync

---

## Data Flow Examples

### Example 1: Submit Leave Request (Offline)

```
1. User fills leave form in renderer
2. Renderer calls: window.electronAPI.repository.leaveRequests.create(data)
3. Preload forwards: ipcRenderer.invoke('repo:leaveRequests:create', data)
4. Main process IPC handler receives request
5. Repository creates record in SQLite (sync_status = 'pending')
6. Record added to sync_queue
7. Audit log entry created (sync_status = 'pending')
8. Response returned to renderer
9. UI shows "Pending Sync" indicator
```

### Example 2: Sync (When Online)

```
1. User clicks "Sync Now" button
2. Renderer calls: window.electronAPI.repository.triggerSync()
3. Main process sync engine starts:
   a. Pull Phase:
      - Fetch employees updated since last_sync_at
      - Fetch leave balances updated since last_sync_at
      - Apply server updates (server wins)
   b. Push Phase:
      - Process sync_queue FIFO
      - Send leave requests to server
      - Send audit logs to server
      - Mark synced records
4. Update last_sync_at
5. Return sync status to renderer
6. UI updates: "Synced" indicator, pending count
```

### Example 3: View Leave Balance (Offline)

```
1. User navigates to leave balance page
2. Renderer calls: window.electronAPI.repository.leaveBalances.findByStaffId(staffId)
3. Main process queries SQLite database
4. Returns cached balance data
5. UI displays balance (may show "Last synced: 2 hours ago")
```

---

## File Structure

```
electron/
├── main.js                          # Main process entry point
├── preload.js                       # Preload script (IPC bridge)
├── database-encrypted.js            # Encrypted SQLite initialization
├── sync-engine.js                   # Sync engine (pull/push)
├── offline-session.js               # Session management
├── offline-permissions.js           # Role-based permissions
├── ipc-repository-handlers.js       # Repository IPC handlers
├── ipc-handlers.js                  # API IPC handlers (existing)
├── repositories/
│   ├── base-repository.ts          # Base repository class
│   ├── employee-repository.ts      # Employee repository
│   ├── leave-request-repository.ts # Leave request repository
│   ├── leave-balance-repository.ts # Leave balance repository
│   └── audit-log-repository.ts    # Audit log repository
└── migrations/
    ├── 001_initial_schema.sql      # Initial sync tables
    └── 002_complete_offline_schema.sql # Complete offline schema
```

---

## API Contracts

### Repository IPC Methods

All methods return: `{ success: boolean, data?: any, error?: string }`

#### Employees
- `repo:employees:findAll(filters)` - Get all employees
- `repo:employees:findByStaffId(staffId)` - Get employee by staff ID

#### Leave Requests
- `repo:leaveRequests:findAll(filters)` - Get all leave requests
- `repo:leaveRequests:create(data)` - Create leave request (offline)

#### Leave Balances
- `repo:leaveBalances:findByStaffId(staffId)` - Get leave balance

#### Sync
- `repo:sync:status` - Get sync status
- `repo:sync:trigger` - Trigger manual sync
- `repo:sync:pendingCount` - Get pending sync count

---

## Error Handling

### Network Errors
- Automatic retry with exponential backoff
- Dead-letter queue for persistent failures
- User notification of sync errors

### Database Errors
- Transaction rollback on failure
- Error logging for debugging
- Graceful degradation (show cached data)

### Session Expiration
- Automatic logout on expiry
- Session cleanup on startup
- Activity-based expiration extension

---

## Compliance Features

### Audit Logging
- Every action logged locally
- Immutable audit trail
- Sync to server (no modification)
- Timestamped, user-attributed

### Data Protection
- Encrypted database at rest
- Secure key storage
- No password storage offline
- Field-level redaction support

### Zero Data Loss
- WAL mode for durability
- Automatic checkpoints
- Transaction support
- Sync queue persistence

---

## Testing Considerations

### Unit Tests
- Repository layer (mock database)
- Sync engine (mock API)
- Permission checks
- Session management

### Integration Tests
- Full sync cycle
- Conflict resolution
- Error recovery
- Offline/online transitions

### Manual Testing
- Offline leave submission
- Sync after coming online
- Session expiration
- Permission enforcement

---

## Deployment

### Prerequisites
- Electron >= 28 (native fetch support)
- SQLCipher (optional, falls back to SQLite)
- Node.js >= 18

### Build
```bash
npm run build:electron
npm run electron:build
```

### Distribution
- Windows: NSIS installer
- macOS: DMG
- Linux: AppImage, DEB

---

## Maintenance

### Database Migrations
- Add new migration files: `NNN_description.sql`
- Migrations run automatically on startup
- Version tracked in `schema_migrations` table

### Key Rotation
- Use `rotateEncryptionKey()` function
- Requires re-encryption of entire database
- Plan for downtime during rotation

### Sync Monitoring
- Check `sync_metadata` table for last sync time
- Monitor `sync_queue` for pending items
- Review `sync_dead_letter_queue` for failures

---

## Enhanced Features (Implemented)

1. ✅ **Background Sync**: Automatic sync when online (`electron/background-sync.js`)
   - Monitors network status
   - Automatic sync at intervals (5 minutes when online)
   - Battery-aware sync (reduces frequency on battery)
   - Quiet hours support (no sync during specified hours)
   - Smart scheduling (avoids high activity periods)

2. ✅ **Conflict Resolution**: Automatic conflict detection and resolution (`electron/conflict-resolver.js`)
   - Detects conflicts between local and server data
   - Auto-resolves based on strategy (server wins for balances/approvals)
   - Manual resolution support for complex conflicts
   - Conflict tracking and reporting

3. ✅ **Offline Approvals**: Limited approval workflow offline (`electron/offline-approvals.js`)
   - Supervisors/managers can approve offline
   - Approvals queued and synced when online
   - Server validation on sync
   - Conflict detection (cannot approve if modified on server)

4. ✅ **Data Compression**: Compress sync payloads (`electron/sync-compression.js`)
   - Gzip compression for JSON payloads
   - Automatic compression for payloads > 1KB
   - Compression statistics and monitoring
   - Configurable compression level

5. ✅ **Incremental Sync**: Only sync changed fields (`electron/incremental-sync.js`)
   - Field-level change tracking
   - Delta sync (only changed fields)
   - Conflict detection at field level
   - Reduced bandwidth usage

---

## Support

For issues or questions:
- Review logs in `app.getPath('userData')/logs`
- Check database in `app.getPath('userData')/hr-portal-encrypted.db`
- Review sync status via `repo:sync:status` IPC call

---

**Last Updated**: 2024
**Version**: 1.0.0
**Status**: Production-Ready

