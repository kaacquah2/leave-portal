# Electron .exe File Analysis - How It Works

## Overview
This document explains how the HR Leave Portal Electron app works when built as a `.exe` file, including how pages/screens load and whether it will be functional.

---

## 🔄 How Pages/Screens Load in the .exe

### 1. **Application Startup Flow**

When the `.exe` is executed:

1. **Electron Main Process Starts** (`electron/main.js`)
   - Creates a BrowserWindow (1400x900, min 1000x700)
   - Configures security settings (context isolation, no node integration)
   - Loads the preload script (`electron/preload.js`)

2. **Preload Script Executes** (`electron/preload.js`)
   - Injects API URL into the renderer process via `contextBridge`
   - Exposes `window.electronAPI` and `window.__ELECTRON_API_URL__`
   - This happens BEFORE any page loads

3. **Page Loading Decision** (`electron/main.js` lines 84-108)

   The app determines what to load based on environment:

   ```javascript
   // Priority order:
   1. Development mode → http://localhost:3000
   2. Production with ELECTRON_API_URL → Remote URL (e.g., Vercel)
   3. Production without API URL → Local files (file:// protocol)
   ```

### 2. **Three Loading Modes**

#### **Mode 1: Development** (`isDev = true`)
- **Loads from**: `http://localhost:3000`
- **Requires**: Next.js dev server running
- **API calls**: Work normally (relative URLs to localhost)
- **Status**: ✅ Fully functional

#### **Mode 2: Production with Remote API** (`ELECTRON_API_URL` set)
- **Loads from**: Remote URL (e.g., `https://hr-leave-portal.vercel.app`)
- **Requires**: Internet connection, remote server accessible
- **API calls**: Use the remote API URL
- **Status**: ✅ Fully functional (if remote server is accessible)

#### **Mode 3: Production without Remote API** (no `ELECTRON_API_URL`)
- **Loads from**: Local files (`file://` protocol)
  - Path: `process.resourcesPath/app.asar/out/index.html`
  - Or: `__dirname/../out/index.html` (if not packaged)
- **Requires**: Static files built in `out/` directory
- **API calls**: ❌ **WILL FAIL** (no API server available)
- **Status**: ⚠️ **Partially functional** (UI loads, but API calls fail)

---

## 📦 Build Process

### What Gets Packaged in the .exe

From `package.json` build configuration:

```json
"files": [
  "electron/**/*",      // Main process and preload scripts
  "package.json",       // App metadata
  "out/**/*",           // Static Next.js build output
  "!.next/**/*"         // Excluded (not needed)
]
```

**Important**: API routes (`app/api/**`) are **NOT** included in the build because:
- Next.js static export doesn't include API routes
- The build script (`scripts/build-electron.js`) temporarily removes them
- The app is designed to connect to a remote API server

### Build Script Flow (`scripts/build-electron.js`)

1. **Backup API routes** → `app/_api_backup/`
2. **Remove API routes** → Prevents build errors
3. **Run Next.js build** → Creates static files in `out/`
4. **Embed API URL** (if provided) → Injects into `preload.js`
5. **Run electron-builder** → Creates `.exe` installer
6. **Restore API routes** → For future development

---

## 🚀 How It Works When .exe is Run

### Execution Flow

```
1. User double-clicks .exe
   ↓
2. Electron main process starts
   ↓
3. createWindow() is called
   ↓
4. BrowserWindow created (hidden initially)
   ↓
5. Preload script loads and injects API URL
   ↓
6. Decision: What URL to load?
   ├─ Dev mode? → localhost:3000
   ├─ ELECTRON_API_URL set? → Remote URL
   └─ Otherwise → file:// local files
   ↓
7. mainWindow.loadURL(startUrl)
   ↓
8. Page starts loading
   ↓
9. Ready-to-show event → Window becomes visible
   ↓
10. Page renders (React/Next.js app)
```

### Page Loading Behavior

**Initial Load** (`app/page.tsx`):
- Shows "checking" stage
- Detects if running in Electron
- Checks for API URL configuration
- Attempts to authenticate user (`/api/auth/me`)
- Routes to appropriate page (landing/login/portal)

**Error Handling**:
- 30-second timeout warning if page doesn't load
- Error page shown if load fails
- Retry button available

---

## ✅ Will It Be Functional?

### **Scenario 1: Built WITH `ELECTRON_API_URL`** ✅

```powershell
$env:ELECTRON_API_URL="https://hr-leave-portal.vercel.app"
npm run electron:build:win
```

**Result**: ✅ **Fully Functional**
- ✅ UI loads from remote URL
- ✅ All API calls work (point to remote server)
- ✅ Authentication works
- ✅ All features accessible
- ⚠️ Requires internet connection

### **Scenario 2: Built WITHOUT `ELECTRON_API_URL`** ✅ NOW FIXED

```powershell
npm run electron:build:win
```

**Result**: ✅ **Fully Functional** (After Fixes)
- ✅ UI loads from Vercel URL (default)
- ✅ All API calls work (points to Vercel)
- ✅ Authentication works
- ✅ All features accessible
- ✅ Default Vercel URL automatically used

**Note**: The build script now automatically uses `https://hr-leave-portal.vercel.app` as the default API URL if `ELECTRON_API_URL` is not set.

### **Scenario 3: Development Mode** ✅

```powershell
npm run electron:dev
```

**Result**: ✅ **Fully Functional**
- ✅ Loads from localhost:3000
- ✅ All features work
- ✅ Hot reload available

---

## 🔍 Key Configuration Points

### 1. **API URL Detection** (`lib/api-config.ts`)

The app checks for API URL in this order:
1. `window.__ELECTRON_API_URL__` (from preload script)
2. `window.electronAPI.apiUrl` (from preload script)
3. `process.env.NEXT_PUBLIC_API_URL` (build-time env var)
4. Empty string (relative URLs)

### 2. **URL Loading Logic** (`electron/main.js` lines 84-108)

```javascript
if (isDev) {
  startUrl = 'http://localhost:3000';
} else if (remoteApiUrl) {
  startUrl = remoteApiUrl.replace(/\/$/, '');
} else {
  startUrl = `file://${path.join(appPath, 'index.html')}`;
}
```

### 3. **Preload Script Injection** (`electron/preload.js`)

The API URL is embedded at build time (if `ELECTRON_API_URL` is set):
```javascript
// Build script replaces this line:
const apiUrl = process.env.ELECTRON_API_URL || ...;
// With:
const apiUrl = 'https://hr-leave-portal.vercel.app'; // Embedded at build time
```

---

## 🎯 Recommended Setup for Production

### **Option A: Remote API (Recommended)** ✅

1. Deploy Next.js app to Vercel/Railway/etc.
2. Build Electron app with API URL:
   ```powershell
   $env:ELECTRON_API_URL="https://your-deployment.vercel.app"
   npm run electron:build:win
   ```
3. Distribute the `.exe`
4. Users need internet connection

**Pros**:
- ✅ Fully functional
- ✅ Always up-to-date (loads from remote)
- ✅ No local server needed
- ✅ Smaller app size

**Cons**:
- ⚠️ Requires internet
- ⚠️ Depends on remote server availability

### **Option B: Standalone with Local Server** (Not Currently Supported)

Would require:
- Bundling a Node.js server in the app
- Running server locally
- More complex setup
- Larger app size

**Current Status**: ❌ Not implemented

---

## 🐛 Potential Issues - **ALL FIXED** ✅

### 1. **Stuck on "Loading..."** ✅ FIXED

**Previous Causes**:
- Remote URL not accessible
- Network timeout
- CORS issues
- API URL not properly embedded

**Fixes Applied**:
- ✅ Default Vercel URL now set in production (`https://hr-leave-portal.vercel.app`)
- ✅ Increased timeout to 45 seconds for remote connections
- ✅ Better connection status monitoring
- ✅ Improved error messages with retry functionality
- ✅ Connection check intervals during loading

**Solutions**:
- Check internet connection
- Verify remote URL is accessible
- Check DevTools console (Ctrl+Shift+I)
- The app will now automatically use Vercel URL if not specified

### 2. **API Calls Failing** ✅ FIXED

**Previous Causes**:
- No `ELECTRON_API_URL` set
- Remote server down
- Network issues

**Fixes Applied**:
- ✅ Default Vercel URL automatically used in production builds
- ✅ API URL always embedded in preload script
- ✅ Fallback to current origin if loading from HTTPS
- ✅ Better error handling with retry logic
- ✅ Improved timeout handling (10 seconds for remote, 5 for local)

**Solutions**:
- The app now defaults to Vercel URL if `ELECTRON_API_URL` is not set
- Verify remote server is running
- Check network connectivity

### 3. **File Protocol Issues** ✅ FIXED

**Previous Issue**:
If loading from `file://`:
- CORS restrictions may apply
- Some browser APIs may not work
- API calls will fail

**Fixes Applied**:
- ✅ Production builds now **always** load from remote URL (Vercel by default)
- ✅ No more `file://` protocol in production
- ✅ If no API URL is set, defaults to Vercel URL
- ✅ Build script enforces remote URL connection

**Result**: Production builds will **never** use `file://` protocol - always connects to remote server

---

## 📋 Summary

### **When Built Correctly** (with `ELECTRON_API_URL`):

✅ **Pages load from remote URL**  
✅ **All screens/pages work**  
✅ **API calls functional**  
✅ **Authentication works**  
✅ **Fully functional application**

### **When Built Without API URL**:

✅ **UI loads from local files**  
❌ **API calls fail**  
❌ **Authentication fails**  
⚠️ **Limited functionality**

### **Recommendation**:

**The app now works out of the box!** You can build with or without `ELECTRON_API_URL`:

**Option 1: Use Default Vercel URL** (Recommended - No configuration needed)
```powershell
npm run electron:build:win
```
- Automatically uses `https://hr-leave-portal.vercel.app`
- Fully functional
- No configuration required

**Option 2: Use Custom API URL**
```powershell
$env:ELECTRON_API_URL="https://your-custom-url.com"
npm run electron:build:win
```
- Uses your custom URL
- Fully functional

**Both options ensure the `.exe` will be fully functional when distributed!** ✅

