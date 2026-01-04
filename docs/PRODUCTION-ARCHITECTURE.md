# Production Architecture Documentation

## Ministry of Foreign Affairs (MoFA), Ghana - HR Leave Portal

**Production-Grade Electron Desktop Application**

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Bootstrap System](#bootstrap-system)
3. [Authentication & Token Expiry](#authentication--token-expiry)
4. [Auto-Updates](#auto-updates)
5. [Disaster Recovery](#disaster-recovery)
6. [IT-Managed Deployment](#it-managed-deployment)
7. [Security Features](#security-features)
8. [Audit & Compliance](#audit--compliance)

---

## Architecture Overview

### Core Principles

1. **Offline-First**: All operations work offline; sync is optional enhancement
2. **No Direct Network Access**: Renderer process NEVER calls fetch/axios directly
3. **Server-Authoritative**: Server wins for balances, approvals, employee data
4. **Client-Submitted**: Client wins for leave request submissions
5. **Full Audit Trail**: Every action logged locally and synced
6. **Encrypted Storage**: SQLCipher encryption for database at rest
7. **Zero Data Loss**: Automatic backups and recovery mechanisms

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    RENDERER PROCESS (React)                   │
│  - UI Components                                              │
> **⚠️ Note:** This document references Electron architecture. The application has been migrated to Tauri. For current architecture, see `docs/TAURI-MIGRATION-GUIDE.md`.

│  - User Interactions                                           │
│  - NO direct network access                                   │
└───────────────────────┬───────────────────────────────────────┘
                        │ Tauri Commands (invoke)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    TAURI CORE (Rust)                       │
│  - Exposes secure commands                                  │
│  - desktopAPI.repository.* (via Tauri commands)            │
└───────────────────────┬───────────────────────────────────────┘
                        │ Native Rust Functions
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    TAURI MAIN PROCESS                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Bootstrap Service                                    │  │
│  │  - First-run initialization                          │  │
│  │  - Database setup                                    │  │
│  │  - Seed data                                         │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐  │
│  │  Disaster Recovery Service                            │  │
│  │  - Corruption detection                              │  │
│  │  - Automatic recovery                                │  │
│  │  - Encrypted backups                                 │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐  │
│  │  Token Expiry Enforcer                                │  │
│  │  - Session monitoring                                 │  │
│  │  - Automatic lockout                                  │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐  │
│  │  Auto-Updater                                         │  │
│  │  - Silent update checks                              │  │
│  │  - Background downloads                               │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐  │
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

## Bootstrap System

### Overview

The bootstrap system handles automatic first-run initialization. It is **idempotent**, **requires no user interaction**, and **requires no admin rights**.

### Bootstrap Process

1. **Detection**: Checks for `.bootstrap-complete` flag file
2. **Database Initialization**: Creates encrypted SQLite database (if needed)
3. **Schema Migrations**: Runs all pending migrations
4. **Seed Data**: Seeds static reference data:
   - Leave types (Annual, Sick, Unpaid, etc.)
   - Holidays (Ghana public holidays for current year)
   - Policy versions
5. **Sync Metadata**: Initializes sync configuration
6. **Integrity Check**: Verifies database integrity
7. **Completion**: Marks bootstrap as complete

### Bootstrap Files

- **Flag File**: `{userData}/.bootstrap-complete` - Marks completion
- **Log File**: `{userData}/bootstrap.log` - Audit trail of bootstrap steps

### Recovery

If bootstrap fails:
- Flag file is NOT created
- Bootstrap will retry on next launch
- All bootstrap steps are logged for debugging

### Implementation

**File**: `electron/bootstrap.js`

**Key Functions**:
- `runBootstrap()` - Main bootstrap process
- `isBootstrapComplete()` - Check completion status
- `seedLeaveTypes()` - Seed leave type reference data
- `seedHolidays()` - Seed holiday calendar
- `seedPolicyVersions()` - Seed policy metadata

---

## Authentication & Token Expiry

### Overview

Strict token-based authentication with automatic lockout on expiry. **No passwords stored locally** - only encrypted tokens.

### Token Expiry Rules

1. **First Login**: Requires internet connection
2. **Token Storage**: Encrypted, device-bound, hashed (not plain)
3. **Offline Access**: Allowed ONLY if token is still valid
4. **Expiry Enforcement**: Automatic lockout when token expires
5. **Re-authentication**: Requires internet connection

### Token Expiry Behavior

- **Monitoring**: Checks every 30 seconds
- **Proactive Lock**: Locks 60 seconds before expiry
- **Immediate Lock**: Locks immediately on expiry detection
- **User Notification**: Clear message shown to user
- **Audit Logging**: All lockout events logged

### Implementation

**File**: `electron/token-expiry-enforcer.js`

**Key Functions**:
- `startExpiryMonitoring()` - Start monitoring service
- `checkExpiry()` - Check token validity
- `lockApp()` - Lock application
- `unlockApp()` - Unlock after re-authentication
- `validateTokenForOperation()` - Validate before operations

### Session Management

**File**: `electron/offline-session.js`

- Device-bound sessions (cannot be transferred)
- Token hashing (SHA-256)
- Expiration tracking
- Activity monitoring

---

## Auto-Updates

### Overview

Secure auto-update functionality using `electron-updater`. Updates are **silent**, **background**, and **non-blocking**.

### Update Process

1. **Check**: Silent check on app launch (30 seconds delay)
2. **Download**: Background download if update available
3. **Notify**: User notified when download complete
4. **Install**: User prompted to restart (optional)
5. **Verify**: Update integrity verified before installation

### Update Schedule

- **On Launch**: Check 30 seconds after app ready
- **Periodic**: Check every 4 hours
- **Manual**: User can trigger check via UI

### Security Features

- **Integrity Verification**: Update signatures verified
- **Downgrade Prevention**: Cannot install older versions
- **Trusted Source**: Only updates from configured server
- **Audit Logging**: All update events logged

### Configuration

**Environment Variable**: `UPDATE_SERVER_URL`

If not set, auto-updates are disabled (development mode).

### Implementation

**File**: `electron/auto-updater.js`

**Key Functions**:
- `checkForUpdates()` - Check for available updates
- `downloadUpdate()` - Download update package
- `installUpdateAndRestart()` - Install and restart
- `startAutoUpdateChecking()` - Start periodic checks

---

## Disaster Recovery

### Overview

Enterprise-grade data protection with automatic corruption detection and recovery.

### Backup Strategy

1. **Periodic Backups**: Every 24 hours
2. **Pre-Update Backups**: Before app updates
3. **Pre-Migration Backups**: Before schema migrations
4. **Pre-Shutdown Backups**: Before app shutdown (optional)
5. **Retention**: Last 5 backups kept (rolling)

### Backup Features

- **Encryption**: Backups encrypted with AES-256-GCM
- **Key Storage**: OS keychain (fallback to encrypted file)
- **Metadata**: Backup metadata stored separately
- **Compression**: Efficient storage

### Corruption Detection

- **Startup Check**: Integrity check on every launch
- **Automatic Detection**: SQLite integrity check
- **Recovery**: Automatic recovery from latest valid backup

### Recovery Process

1. **Detection**: Corruption detected on startup
2. **Backup Selection**: Latest valid backup selected
3. **Restore**: Backup restored (with pre-restore backup created)
4. **Verification**: Integrity verified after restore
5. **Logging**: All recovery actions logged

### Implementation

**File**: `electron/disaster-recovery.js`

**Key Functions**:
- `createBackup()` - Create encrypted backup
- `restoreBackup()` - Restore from backup
- `detectCorruption()` - Check database integrity
- `automaticRecovery()` - Automatic recovery process
- `checkAndRecoverOnStartup()` - Startup check and recovery

### Backup Location

**Directory**: `{userData}/backups/`

**Files**:
- `backup-{timestamp}.db.encrypted` - Encrypted backup
- `backup-{timestamp}.meta.json` - Backup metadata

---

## IT-Managed Deployment

### Overview

Prepared for government IT deployment via SCCM, Intune, or manual installation.

### Installer Features

- **Silent Installation**: `/S` flag for silent install
- **Per-User Installation**: No admin rights required at runtime
- **Deterministic Paths**: Consistent installation paths
- **Auto-Update Compatible**: Works with auto-update system
- **Registry Entries**: Proper Windows registry entries
- **Uninstaller**: Clean uninstallation support

### Installation Paths

**Default**: `%LOCALAPPDATA%\Programs\HR Leave Portal`

**User Data**: `%APPDATA%\HR Leave Portal`

### Silent Installation

**Command**: `setup.exe /S`

**Custom Path**: `setup.exe /S /D=C:\CustomPath`

### Silent Uninstallation

**Command**: `uninstall.exe /S`

### Configuration

**File**: `electron/installer-script.nsh`

**Package.json**: Enhanced NSIS configuration

### Requirements

- **No Admin Rights**: Per-user installation
- **SCCM Compatible**: Silent installation support
- **Intune Compatible**: Per-user deployment
- **Auto-Update**: Compatible with auto-update system

---

## Security Features

### Database Encryption

- **SQLCipher**: AES-256 encryption at rest
- **Key Storage**: OS keychain (Windows Credential Manager)
- **Fallback**: Encrypted file storage if keychain unavailable
- **Key Rotation**: Support for key versioning

### Session Security

- **Device-Bound**: Sessions tied to device ID
- **Token Hashing**: Tokens hashed (SHA-256) before storage
- **No Password Storage**: Passwords never stored offline
- **Expiration Enforcement**: Automatic logout on expiry

### Network Security

- **No Renderer Access**: Renderer process cannot make network requests
- **Controlled API Access**: Only main process can call APIs
- **Bearer Token Auth**: Secure token-based authentication
- **Path Validation**: API path allowlist enforcement

### Backup Security

- **Encrypted Backups**: AES-256-GCM encryption
- **Key Protection**: Backup keys stored securely
- **Access Control**: Backup files have restricted permissions (0o600)

---

## Audit & Compliance

### Audit Logging

Every action is logged with:
- **User ID**: User performing action
- **Role**: User role
- **Action**: Action type
- **Entity**: Related entity (if applicable)
- **Timestamp**: ISO 8601 timestamp
- **Details**: JSON details

### Compliance Features

- **Immutable Logs**: Audit logs cannot be modified
- **Sync Required**: Audit logs must sync to server
- **Ghana Data Protection Act**: Compliant with data protection requirements
- **PSC Workflow Standards**: Complies with Public Service Commission standards

### Audit Events

Key audit events:
- `token_expired_lockout` - Token expiry lockout
- `backup_created` - Backup creation
- `backup_restored` - Backup restoration
- `corruption_detected` - Database corruption
- `auto_recovery_started` - Automatic recovery
- `update_check_started` - Update check
- `update_downloaded` - Update downloaded

---

## File Structure

```
electron/
├── main.js                          # Main process entry point
├── preload.js                       # Preload script (IPC bridge)
├── bootstrap.js                     # First-run bootstrap service
├── token-expiry-enforcer.js         # Token expiry enforcement
├── auto-updater.js                  # Auto-update service
├── disaster-recovery.js             # Disaster recovery service
├── database-encrypted.js            # Encrypted SQLite initialization
├── sync-engine.js                   # Sync engine (pull/push)
├── offline-session.js               # Session management
├── offline-permissions.js           # Role-based permissions
├── ipc-repository-handlers.js       # Repository IPC handlers
├── ipc-handlers.js                  # API IPC handlers
├── repositories/
│   ├── base-repository.ts          # Base repository class
│   ├── employee-repository.ts      # Employee repository
│   ├── leave-request-repository.ts # Leave request repository
│   ├── leave-balance-repository.ts # Leave balance repository
│   └── audit-log-repository.ts    # Audit log repository
├── migrations/
│   ├── 001_initial_schema.sql      # Initial sync tables
│   ├── 002_complete_offline_schema.sql # Complete offline schema
│   └── 003_seed_static_data.sql    # Seed static data
└── installer-script.nsh             # NSIS installer script
```

---

## Initialization Flow

### Startup Sequence

1. **Error Reporter**: Initialize error reporting
2. **Database**: Initialize encrypted database
3. **Disaster Recovery**: Check integrity and recover if needed
4. **Bootstrap**: Run first-run bootstrap (if needed)
5. **Session Cleanup**: Clean up expired sessions
6. **Token Monitoring**: Start token expiry monitoring
7. **Periodic Backups**: Start periodic backup schedule
8. **IPC Handlers**: Setup IPC handlers
9. **Repository Handlers**: Setup repository IPC handlers
10. **Background Sync**: Start background sync
11. **Conflict Resolution**: Auto-resolve conflicts
12. **Auto-Updates**: Start auto-update checking (production only)
13. **Protocol**: Setup custom protocol
14. **Window Manager**: Initialize window manager
15. **Windows**: Create splash screen and main window

### Shutdown Sequence

1. **Background Sync**: Stop background sync
2. **Token Monitoring**: Stop token expiry monitoring
3. **Periodic Backups**: Stop periodic backups
4. **Auto-Updates**: Stop auto-update checking
5. **Pre-Shutdown Backup**: Create backup (if enabled)
6. **Database**: Close encrypted database
7. **Cleanup**: Cleanup resources
8. **Quit**: Quit application

---

## Configuration

### Environment Variables

- `ELECTRON_API_URL` - API base URL (highest priority)
- `NEXT_PUBLIC_API_URL` - API base URL (fallback)
- `ELECTRON_DEFAULT_API_URL` - Default API URL
- `UPDATE_SERVER_URL` - Update server URL (for auto-updates)
- `ELECTRON_IS_DEV` - Development mode flag

### Configuration Files

- **Bootstrap Flag**: `{userData}/.bootstrap-complete`
- **Bootstrap Log**: `{userData}/bootstrap.log`
- **Database Key**: `{userData}/db-key.encrypted`
- **Backup Key**: `{userData}/backup-key.encrypted`
- **Backups**: `{userData}/backups/`

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

### Backup Management

- Check `{userData}/backups/` directory
- Review backup metadata files
- Manual restore: Use `restoreBackup()` function

### Update Management

- Configure `UPDATE_SERVER_URL` environment variable
- Updates checked automatically
- Manual check: Use `checkForUpdates()` function

---

## Support

For issues or questions:
- Review logs in `{userData}/logs`
- Check database in `{userData}/hr-portal-encrypted.db`
- Review bootstrap log: `{userData}/bootstrap.log`
- Check backup directory: `{userData}/backups/`
- Review sync status via `repo:sync:status` IPC call

---

**Last Updated**: 2024
**Version**: 1.0.0
**Status**: Production-Ready

