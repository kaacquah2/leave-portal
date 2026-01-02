# Electron Build - Offline Functionality

## Overview

This document explains how offline functionality is included in the Electron build process and provides **government-grade, audit-ready** documentation for IT Directorate, Auditors, and Senior Architects.

**Key Assurance**: Offline functionality is **bundled at build time** - it is part of the `.exe` file, not downloaded at runtime. This ensures complete offline capability without internet dependency after initial installation.

## Build Process

The build process for the Electron app includes the following steps:

1. **Compile TypeScript Repositories**: TypeScript repository files in `electron/repositories/` are compiled to JavaScript in `electron/repositories-compiled/`
2. **Include Electron Files**: All Electron files including offline functionality are bundled
3. **Unpack Native Modules**: Native modules like `better-sqlite3` are unpacked from ASAR
4. **Include Migrations**: Database migration files are included and unpacked

## Files Included in Build

### Electron Core Files
- `electron/main.js` - Main process entry point
- `electron/preload.js` - Preload script
- All Electron utility files (database, sync, offline, etc.)

### Offline Functionality
- `electron/database-encrypted.js` - Encrypted SQLite database
- `electron/sync-engine.js` - Background sync engine
- `electron/background-sync.js` - Automatic sync when online
- `electron/offline-session.js` - Offline session management
- `electron/offline-approvals.js` - Offline approval handling (read-only validation only)
- `electron/conflict-resolver.js` - Conflict resolution
- `electron/bootstrap.js` - First-run initialization
- `electron/disaster-recovery.js` - Backup and recovery
- `electron/token-expiry-enforcer.js` - Token expiry monitoring and lockout
- `electron/repositories-compiled/**/*.js` - Compiled TypeScript repositories
- `electron/migrations/**/*.sql` - Database migration files

### Native Modules (Unpacked from ASAR)
- `node_modules/better-sqlite3/**/*` - SQLite database driver
- `node_modules/uuid/**/*` - UUID generation

## Build Configuration

### package.json
The build configuration includes:
- `files`: Lists all files to include in the build
- `asarUnpack`: Files that must be unpacked from ASAR (native modules, migrations, compiled repos)

### TypeScript Compilation
- `tsconfig.electron.json`: Configuration for compiling TypeScript repositories
- Output directory: `electron/repositories-compiled/`

## Building the App

To build the Electron app with offline functionality:

```bash
npm run electron:build:win
```

This will:
1. Compile TypeScript repositories
2. Build the Electron app
3. Include all offline functionality
4. Create the installer in `dist/` folder

## Verification

After building, verify that offline functionality is included:

1. Check `dist/win-unpacked/resources/app.asar.unpacked/electron/` for:
   - `repositories-compiled/` folder with `.js` files
   - `migrations/` folder with `.sql` files
   - `node_modules/better-sqlite3/` folder

2. Check `dist/win-unpacked/resources/app.asar` contains:
   - All Electron JavaScript files
   - All offline functionality modules

## Troubleshooting

### Repositories Not Found
If you see "Compiled repositories not found" in the console:
- Ensure `npm run build:electron:repos` runs before building
- Check that `electron/repositories-compiled/` exists after compilation
- Verify files are included in `asarUnpack` in `package.json`

### Database Not Working
If the database doesn't work:
- Ensure `better-sqlite3` is in `asarUnpack`
- Check that migrations are included and unpacked
- Verify database files can be created in the app data directory

### Sync Not Working
If sync doesn't work:
- Ensure `sync-engine.js` and `background-sync.js` are included
- Check that API URL is correctly embedded in preload script (injected at build time)
- Verify network detection is working

---

## First-Run Initialization (Automatic)

### Overview

On first application launch, the app **automatically** initializes the local database without any user action or IT intervention required.

### Initialization Process

**When HR staff double-clicks the `.exe` for the first time:**

1. **Database Creation** (Automatic, ~1 second):
   - App creates encrypted SQLite database in user's AppData directory:
     - **Windows**: `C:\Users\<Username>\AppData\Roaming\HR Leave Portal\hr-portal-encrypted.db`
     - **macOS**: `~/Library/Application Support/HR Leave Portal/hr-portal-encrypted.db`
     - **Linux**: `~/.config/HR Leave Portal/hr-portal-encrypted.db`

2. **Migrations Execution** (Automatic):
   - All migration files in `electron/migrations/` are executed in order:
     - `001_initial_schema.sql` - Creates base schema
     - `002_complete_offline_schema.sql` - Creates offline tables (sync_queue, sync_metadata, etc.)
     - `003_seed_static_data.sql` - Seeds static data (leave types, holidays, etc.)
   - Migrations are tracked in `schema_migrations` table to prevent re-execution
   - **No manual intervention required**

3. **Static Data Seeding** (Automatic):
   - Bootstrap service seeds leave types, holidays, and policies
   - Uses `INSERT OR IGNORE` to prevent duplicates
   - Safe to run multiple times

4. **Sync Metadata Initialization** (Automatic):
   - Creates `sync_metadata` table
   - Initializes `last_sync_time` to null
   - Prepares sync queue for pending operations

### First Login (Internet Required)

**On first login (must be online for authentication):**

1. User authenticates with server (internet required)
2. Token is issued and stored encrypted locally
3. App detects first run (empty database)
4. **Automatic full data sync**:
   - Fetches ALL data from server:
     - Staff members
     - Leave requests
     - Leave balances
     - Leave policies
     - Holidays
     - Leave templates
   - Stores all data in local SQLite database
   - Sets `last_sync_time` to current timestamp
5. User can now work offline

### What HR Staff Experience

**Answer: NO manual setup required**

When HR staff receives the `.exe`:

1. ✅ Double-click `.exe` → App launches
2. ✅ On first login (internet required):
   - Database auto-created
   - Migrations auto-executed
   - Token issued
   - Initial sync happens automatically
3. ✅ After that:
   - App works offline
   - No configuration needed
   - No database install required
   - No Node.js required
   - No IT intervention needed

**Timeline:**
- Database creation: ~1 second
- Initial data sync: ~5-30 seconds (depending on data size)
- User can start using app immediately after login

### Interrupted Setup Handling

If setup is interrupted:
- Database is created atomically (all-or-nothing)
- Migrations are idempotent (safe to re-run)
- On next launch, app detects partial state and completes initialization
- No data corruption risk

---

## Offline Permission Rules

### Overview

**CRITICAL GOVERNMENT-SAFE RULE**: Offline access is **restricted by role and action type** to prevent data integrity violations and audit trail gaps.

### Who Can Act Offline

#### ✅ **Employees (Staff Members)**
- **Allowed Offline:**
  - View own profile
  - Submit leave requests (queued for sync)
  - View own leave balances
  - View own leave history
- **Restricted Offline:**
  - Cannot view other employees' data
  - Cannot modify submitted requests (after submission)

#### ✅ **Supervisors / Unit Heads / Division Heads / Directors**
- **Allowed Offline:**
  - View all employee data (read-only)
  - View all leave requests (read-only)
  - View all leave balances (read-only)
- **Restricted Offline:**
  - ❌ **CANNOT approve leave requests** (requires online connection)
  - ❌ **CANNOT reject leave requests** (requires online connection)
  - ❌ **CANNOT modify leave requests** (requires online connection)

#### ✅ **HR Officers**
- **Allowed Offline:**
  - View all employee data
  - View all leave requests
  - Draft leave requests (queued for sync)
- **Restricted Offline:**
  - ❌ **CANNOT approve leave requests** (requires online connection)
  - ❌ **CANNOT process leave requests** (requires online connection)

### Offline Approval Restrictions

**SPECIFICATION COMPLIANCE**: 

> **"Offline approvals are restricted to read-only validation and queue preparation. Final approval actions require an active internet connection."**

**Implementation:**
- `electron/offline-approvals.js` - `canApproveOffline()` always returns `false`
- All approval actions throw error: "Offline approvals are not allowed. Please connect to the internet to approve leave requests."
- UI disables approval buttons when offline
- Server validates all approvals on sync (authoritative)

**Why This Restriction:**
- Prevents conflicting approvals
- Prevents balance corruption
- Ensures complete audit trail
- Maintains server as single source of truth
- Complies with government-safe rules

### Offline Action Queue

**Allowed offline actions are queued:**
- Leave request submissions → Queued in `sync_queue` table
- Draft modifications → Queued in `sync_queue` table
- All queued actions sync automatically when online

**Blocked offline actions:**
- Approvals → Error thrown immediately
- Rejections → Error thrown immediately
- Critical data modifications → Error thrown immediately

---

## Token & Security Boundaries

### Overview

Offline access is **strictly bounded** by authentication token validity. Once the token expires, the app locks and requires internet re-authentication.

### Token Expiry Rules

1. **First Login**: Requires internet connection (no offline login)
2. **Token Storage**: Encrypted, device-bound, hashed (SHA-256)
3. **Offline Access**: Allowed **ONLY** if token is still valid
4. **Expiry Enforcement**: Automatic lockout when token expires
5. **Re-authentication**: Requires internet connection

### Token Expiry Behavior

**Monitoring:**
- Checks token validity every 30 seconds
- Proactive lock: Locks 60 seconds before expiry
- Immediate lock: Locks immediately on expiry detection

**When Token Expires Offline:**
1. App detects expired token
2. **Immediate lockout** - App locks and shows clear message
3. User notification: "Your session has expired. Please connect to the internet to sign in again."
4. All offline access blocked
5. Audit log entry created
6. User must go online and re-authenticate

**Implementation:**
- `electron/token-expiry-enforcer.js` - Monitors and enforces expiry
- `electron/offline-session.js` - Manages session state
- Automatic lockout on expiry (no grace period)

### Security Features

- **No token reuse**: Expired tokens cannot be reused
- **No privilege escalation**: Token expiry prevents privilege abuse
- **Immediate lockout**: No offline access after expiry
- **Device-bound enforcement**: Tokens are device-specific
- **Audit logging**: All lockout events logged

### Offline Access Duration

**Maximum offline access duration = Token validity period**

- Default token validity: 7 days (configurable on server)
- Token refresh: Automatic refresh when online (within 1 hour of expiry)
- Offline access: Valid until token expires (no extension offline)

**Important**: Offline access is **not indefinite**. It is bounded by token expiry for security compliance.

---

## Disaster Recovery Summary

### Overview

Enterprise-grade data protection with automatic corruption detection, encrypted backups, and recovery procedures.

### Backup Strategy

**Automatic Backups:**
1. **Periodic Backups**: Every 24 hours (when online)
2. **Pre-Update Backups**: Before app updates
3. **Pre-Migration Backups**: Before schema migrations
4. **Pre-Restore Backups**: Before restore operations (safety measure)
5. **Retention**: Last 5 backups kept (rolling retention)

**Backup Features:**
- **Encryption**: AES-256-GCM encryption
- **Key Storage**: OS keychain (Windows Credential Manager / macOS Keychain)
- **Metadata**: Backup metadata stored separately (timestamp, reason, version, sizes)
- **Location**: `%APPDATA%\HR Leave Portal\backups\` (encrypted)

### Corruption Detection

**Automatic Detection:**
- **Startup Check**: SQLite integrity check on every launch
- **Automatic Recovery**: If corruption detected, app automatically:
  1. Selects latest valid backup
  2. Creates pre-restore backup (safety)
  3. Restores from backup
  4. Verifies integrity after restore
  5. Logs all recovery actions

**Recovery Process:**
1. Corruption detected → App logs error
2. Latest valid backup selected
3. Pre-restore backup created (safety)
4. Database restored from backup
5. Integrity verified
6. Sync queue preserved (pending operations not lost)
7. User notified of recovery

### Server as Authoritative Source

**Critical Rule**: Server is **single source of truth**

- Local data can be recovered from server
- Corrupted local data can be reset and re-synced
- No data loss if server is intact
- Device loss scenario: User can restore from server on new device

### Device Loss Scenario

**If device is lost or stolen:**
1. User reports to HR
2. HR can revoke device access (server-side)
3. Force password reset (server-side)
4. User installs app on new device
5. Logs in (internet required)
6. Full data sync from server
7. **No data loss** (all data on server)

### Manual Recovery Options

**If automatic recovery fails:**
1. User can manually trigger restore from backup
2. User can reset local database and re-sync from server
3. All recovery actions are logged for audit

**Implementation:**
- `electron/disaster-recovery.js` - Backup and recovery service
- Automatic corruption detection and recovery
- Manual restore functions available via IPC

---

## API URL Configuration

### Overview

The API base URL is **injected at build time** into the preload script. This ensures the production build uses the correct endpoint and cannot be changed without rebuilding.

### Build-Time Injection

**Process:**
1. Build script reads API URL from environment variable or default
2. API URL is embedded in `electron/preload.js` during build
3. Preload script is bundled into the `.exe`
4. **Cannot be changed at runtime** (security feature)

**Configuration:**
- **Default**: `https://hr-leave-portal.vercel.app` (Vercel production)
- **Override**: Set `ELECTRON_API_URL` environment variable before build
- **Build script**: `scripts/build-electron.js` handles injection

**Security:**
- API URL is locked at build time
- No runtime configuration changes
- Prevents endpoint manipulation
- Government IT approved approach

### Verification

After building, verify API URL is embedded:
1. Check build logs for: "Embedding API URL in preload script: [URL]"
2. API URL is hardcoded in preload script (not configurable at runtime)
3. All API calls use this URL (cannot be changed)

---

## Summary for Auditors

### ✅ What Is Correct and Solid

1. **Offline functionality IS bundled at build time**
   - SQLite logic is inside Electron, not fetched remotely
   - Sync engine is local
   - Offline session logic exists
   - Migrations are included in the build
   - **Offline is not a runtime download — it is part of the `.exe`**

2. **Correct handling of native modules**
   - Unpack `better-sqlite3` from ASAR
   - Avoid ASAR execution issues
   - Explicitly verify unpacked locations

3. **Clear verification steps**
   - `dist/win-unpacked/resources/app.asar.unpacked` checks are correct
   - Practical operational documentation

### ✅ Security Boundaries

1. **Offline approvals are disabled**
   - All approvers cannot approve offline
   - Requires active internet connection
   - Server validates all approvals

2. **Token expiry enforcement**
   - Offline access bounded by token validity
   - Automatic lockout on expiry
   - Requires internet for re-authentication

3. **API URL locked at build time**
   - Cannot be changed at runtime
   - Prevents endpoint manipulation

### ✅ Disaster Recovery

1. **Automatic backups**
   - Encrypted, periodic backups
   - Pre-update and pre-migration backups
   - Rolling retention (last 5 backups)

2. **Corruption detection and recovery**
   - Automatic detection on startup
   - Automatic recovery from backups
   - Server remains authoritative

3. **Device loss protection**
   - Server-side revocation
   - Data recovery from server
   - No data loss if server intact

### ✅ First-Run Behavior

1. **Automatic initialization**
   - Database created automatically
   - Migrations executed automatically
   - Static data seeded automatically
   - No user action required
   - No IT intervention needed

---

## Conclusion

This Electron build provides **government-grade, offline-first** functionality with:

- ✅ Complete offline capability (bundled at build time)
- ✅ Automatic first-run initialization (no manual setup)
- ✅ Security-bounded offline access (token expiry enforcement)
- ✅ Restricted offline permissions (approvals require online)
- ✅ Disaster recovery (automatic backups and corruption recovery)
- ✅ Audit-ready documentation

**The `.exe` file is self-contained and requires no runtime dependencies or manual configuration.**

