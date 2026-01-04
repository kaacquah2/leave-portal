# Build Verification - Tauri Desktop Application

> **Note:** This document has been updated for Tauri. For historical Electron build information, see `docs/archive/electron/`.

## Current Build System

The application now uses **Tauri** for desktop builds. All Electron code has been migrated.

## Tauri Build Process

### 1. Next.js Static Export
- Builds static files to `out/` directory
- Triggered by `TAURI=1` environment variable
- Command: `npm run build:tauri`

### 2. Tauri Build
- Packages static files with Tauri Rust backend
- Creates native desktop application
- Command: `npm run tauri:build`

## Files Included in Tauri Build

### Tauri Core Files ✅
- `src-tauri/src/main.rs` - Main Rust entry point
- `src-tauri/src/database.rs` - Database module (rusqlite)
- `src-tauri/src/commands/` - All Tauri commands
  - `api.rs` - API commands
  - `repository.rs` - Repository commands
  - `filesystem.rs` - File system commands

### Static Files ✅
- `out/**/*` - Next.js static export
- All HTML, CSS, JavaScript bundles
- Static assets (images, fonts, etc.)

### Database
- Database initialized at runtime using rusqlite
- Migrations run automatically on first launch
- Database file: `hr-portal-encrypted.db` in app data directory

### Compiled Repositories ✅
- `electron/repositories-compiled/base-repository.js`
- `electron/repositories-compiled/employee-repository.js`
- `electron/repositories-compiled/leave-request-repository.js`
- `electron/repositories-compiled/leave-balance-repository.js`
- `electron/repositories-compiled/audit-log-repository.js`

## Build Configuration

### Files Included (`package.json`)
```json
"files": [
  "out/**/*",
  "electron/**/*",
  "electron/repositories-compiled/**/*",
  "package.json",
  "node_modules/electron-is-dev/**/*",
  "node_modules/better-sqlite3/**/*",
  "node_modules/uuid/**/*",
  "!.next/**/*",
  "!.electron-builderignore",
  "!electron/repositories/**/*.ts"
]
```

### ASAR Unpacked Files
These files are unpacked from ASAR (required for native modules and runtime access):
- `out/**/*` - Next.js static export
- `electron/migrations/**/*` - Database migrations (needed at runtime)
- `electron/repositories-compiled/**/*` - Compiled repositories (needed at runtime)
- `node_modules/better-sqlite3/**/*` - Native SQLite module (contains binaries)
- `node_modules/uuid/**/*` - UUID module
- `electron/splash.html` - Splash screen HTML

## Verification

Run the verification script to check all files:
```bash
node scripts/verify-build-files.js
```

## Build Process

1. **Compile TypeScript Repositories**
   ```bash
   npm run build:electron:repos
   ```
   Or automatically during build

2. **Build Electron App**
   ```bash
   npm run electron:build:win
   ```

3. **Verify Build**
   - Check `dist/win-unpacked/resources/app.asar.unpacked/` for unpacked files
   - Check `dist/win-unpacked/resources/app.asar` contains all Electron files

## Expected Build Output

After successful build:
- ✅ Installer: `dist/HR Leave Portal Setup 0.1.0.exe`
- ✅ Unpacked app: `dist/win-unpacked/`
- ✅ All offline functionality included
- ✅ Native modules unpacked
- ✅ Migrations accessible
- ✅ Repositories compiled and included

