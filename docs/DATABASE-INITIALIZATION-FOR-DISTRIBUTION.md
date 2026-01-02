# Database Initialization for Distribution

## Overview

When distributing the `.exe` file to HR staff, the local SQLite database is automatically initialized and populated on first run. This document explains the complete process.

---

## How Database Initialization Works

### 1. **Automatic Database Creation** ✅

When the Electron app first launches:

1. **Location**: Database is created in the user's AppData directory:
   - **Windows**: `C:\Users\<Username>\AppData\Roaming\<AppName>\database.sqlite`
   - **macOS**: `~/Library/Application Support/<AppName>/database.sqlite`
   - **Linux**: `~/.config/<AppName>/database.sqlite`

2. **Initialization Process**:
   ```
   App Starts → app.whenReady() → db.initDatabase() → Tables Created
   ```

3. **Tables Created**:
   - `sync_queue` - Stores pending changes for sync
   - `sync_metadata` - Stores sync timestamps
   - `StaffMember` - Staff data
   - `LeaveRequest` - Leave requests
   - `LeaveBalance` - Leave balances
   - `LeavePolicy` - Leave policies
   - `Holiday` - Holidays
   - `LeaveRequestTemplate` - Leave templates

### 2. **First Run Detection** ✅

The app automatically detects if this is the first run by checking if the database is empty:

```typescript
// Checks if StaffMember and LeaveRequest tables are empty
const isFirstRun = staffCount === 0 && leavesCount === 0
```

### 3. **Initial Data Population** ✅

**On First Run (when online):**

1. App detects first run
2. Automatically fetches ALL data from server:
   - Staff members
   - Leave requests
   - Leave balances
   - Leave policies
   - Holidays
   - Leave templates
3. Stores all data in local SQLite database
4. Sets `last_sync_time` to current timestamp

**Result**: Database is fully populated and ready for offline use!

---

## Distribution Scenarios

### Scenario 1: First Install (Online) ✅

**What Happens:**
1. User installs `.exe` and runs it
2. Database is created automatically
3. User logs in (must be online for authentication)
4. App detects first run
5. **Automatically pulls ALL data from server**
6. Stores data in local database
7. User can now work offline

**Timeline:**
- Database creation: ~1 second
- Initial data sync: ~5-30 seconds (depending on data size)
- User can start using app immediately after login

### Scenario 2: First Install (Offline) ⚠️

**What Happens:**
1. User installs `.exe` and runs it
2. Database is created automatically
3. User cannot log in (requires online connection)
4. Database remains empty
5. **User must go online and log in to populate database**

**Important**: Users must be online at least once to populate the database!

### Scenario 3: Subsequent Runs (Online) ✅

**What Happens:**
1. App starts
2. Database already exists
3. App checks for updates since last sync
4. Pulls only changed data (incremental sync)
5. Updates local database
6. User can work offline

### Scenario 4: Subsequent Runs (Offline) ✅

**What Happens:**
1. App starts
2. Database already exists and has data
3. App reads from local database
4. User can work normally offline
5. Changes are queued for sync when back online

---

## Code Flow

### Database Initialization (electron/main.js)

```javascript
app.whenReady().then(() => {
  // Initialize database
  db.initDatabase(); // Creates database.sqlite and all tables
  // ...
});
```

### First Run Detection (lib/data-store.ts)

```typescript
const isFirstRun = async (): Promise<boolean> => {
  // Check if database is empty
  const staffCount = await getAllRecords('StaffMember', 1)
  const leavesCount = await getAllRecords('LeaveRequest', 1)
  return staffCount === 0 && leavesCount === 0
}
```

### Initial Data Sync (lib/data-store.ts)

```typescript
const performInitialSync = async () => {
  if (firstRun && isOnline) {
    // Fetch ALL data from API
    const [staff, leaves, balances, policies, holidays, templates] = 
      await Promise.all([...])
    
    // Store in local database
    await storeInLocalDB('StaffMember', staff)
    await storeInLocalDB('LeaveRequest', leaves)
    // ... etc
  }
}
```

---

## Important Notes for Distribution

### ✅ **What Works Automatically:**

1. **Database Creation**: Happens automatically on first run
2. **Table Creation**: All tables created automatically
3. **First Run Detection**: App detects empty database
4. **Data Population**: Automatically pulls all data when online
5. **Offline Support**: Works immediately after first sync

### ⚠️ **Requirements:**

1. **First Login Must Be Online**: Users must be online to:
   - Authenticate (login requires server)
   - Populate database (first sync requires server)

2. **Internet Connection**: Required for:
   - Initial database population
   - Authentication
   - Syncing changes

3. **User Permissions**: App needs write access to:
   - User's AppData directory (for database)
   - User's AppData directory (for logs)

### 📋 **Distribution Checklist:**

- [ ] Ensure `.exe` includes all dependencies
- [ ] Test first run on clean machine
- [ ] Verify database creation in AppData
- [ ] Test first run with internet connection
- [ ] Test first run without internet connection
- [ ] Verify data sync on first login
- [ ] Test offline functionality after first sync
- [ ] Document user requirements (internet for first login)

---

## Troubleshooting

### Issue: Database Not Created

**Symptoms**: App crashes or shows errors

**Solution**:
- Check user has write permissions to AppData
- Check antivirus isn't blocking database creation
- Check disk space available

### Issue: Database Empty After First Run

**Symptoms**: App works but shows no data offline

**Possible Causes**:
1. User was offline during first login
2. API connection failed during sync
3. Authentication failed

**Solution**:
- User must go online and log in again
- App will detect empty database and sync again
- Check network connection
- Check API URL is correct

### Issue: Sync Not Working

**Symptoms**: Changes not syncing to server

**Solution**:
- Check internet connection
- Check API URL is accessible
- Check authentication token is valid
- Check sync queue in database

---

## Database Location

### Windows
```
C:\Users\<Username>\AppData\Roaming\HR Leave Portal\database.sqlite
```

### macOS
```
~/Library/Application Support/HR Leave Portal/database.sqlite
```

### Linux
```
~/.config/HR Leave Portal/database.sqlite
```

**Note**: Database location is managed by Electron's `app.getPath('userData')` API.

---

## Summary

✅ **Database initialization is fully automatic** - No manual setup required!

✅ **First run detection works** - App knows when database is empty

✅ **Data population is automatic** - Pulls all data when online on first run

✅ **Offline support works immediately** - After first sync, app works offline

⚠️ **Requirement**: Users must be **online for first login** to populate database

---

## For HR Staff (User Instructions)

### First Time Setup:

1. **Install the application** (double-click `.exe`)
2. **Ensure you have internet connection**
3. **Launch the application**
4. **Log in with your credentials**
5. **Wait for initial sync** (5-30 seconds)
6. **You're ready!** App now works offline

### After First Setup:

- App works offline automatically
- Changes sync when you go online
- No additional setup needed

---

## Technical Details

### Database File Size

- **Empty database**: ~20 KB
- **With 100 staff members**: ~500 KB
- **With 1000 staff members**: ~5 MB
- **With full data**: ~10-50 MB (depending on data)

### Sync Performance

- **First sync (all data)**: 5-30 seconds
- **Incremental sync**: 1-5 seconds
- **Sync queue processing**: Real-time when online

### Storage Requirements

- **Minimum**: 100 MB free space
- **Recommended**: 500 MB free space
- **Database grows**: As data is added

---

## Support

If users experience issues with database initialization:

1. Check internet connection
2. Verify user has write permissions
3. Check antivirus settings
4. Verify API URL is accessible
5. Check application logs in AppData directory

