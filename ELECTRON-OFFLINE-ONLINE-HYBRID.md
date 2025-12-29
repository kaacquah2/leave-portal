# Electron App: Works With AND Without Internet ✅

## Overview

The Electron `.exe` file now works **both with and without internet**! This is achieved through a hybrid approach that:

1. **Loads from local static files** (works offline)
2. **Falls back to Vercel URL** (if local files not found or for updates)
3. **API calls always go to Vercel** (when online, queued when offline)

---

## How It Works

### **App Startup Flow**

```
1. App starts
   ↓
2. Check for local static files (bundled in .exe)
   ↓
3. If found → Load from local files (file://) ✅ Works OFFLINE
   ↓
4. If not found → Load from Vercel URL (https://) ⚠️ Requires internet
   ↓
5. If Vercel fails → Try local files again (fallback)
```

### **API Calls**

- **When Online**: API calls go directly to Vercel (`https://hr-leave-portal.vercel.app/api/...`)
- **When Offline**: 
  - Changes saved to local SQLite database
  - Queued in `sync_queue` table
  - Automatically synced when internet returns

---

## Build Process

### **Step 1: Static Export**

When you run `npm run electron:build:win`:

1. Next.js builds static files to `out/` folder
2. All HTML, CSS, JavaScript bundled as static files
3. API routes excluded (handled by remote Vercel server)

### **Step 2: Electron Bundle**

1. Electron-builder packages the app
2. Includes `out/**/*` folder in the `.exe`
3. Static files bundled in `resources/app.asar/out/` or `resources/out/`

### **Step 3: Runtime**

1. Electron checks for local static files first
2. If found → loads from `file://` (works offline!)
3. If not found → loads from Vercel URL
4. API URL embedded in preload script for API calls

---

## File Locations

### **In Development**
- Static files: `out/index.html` (after build)
- Loads from: `http://localhost:3000`

### **In Production (Built .exe)**
- Static files bundled in:
  - `resources/app.asar/out/index.html` (packed)
  - `resources/app/out/index.html` (unpacked)
- Loads from: `file://` protocol (local files)

---

## Features

### ✅ **Works Offline**
- App UI loads from local static files
- No internet required to start the app
- All UI interactions work normally
- Data saved to local SQLite

### ✅ **Works Online**
- App can load from Vercel (if local files fail)
- API calls go to Vercel server
- Real-time data sync
- Automatic updates when online

### ✅ **Hybrid Mode**
- Prefers local files (faster, works offline)
- Falls back to Vercel if needed
- Best of both worlds!

---

## User Experience

### **Scenario 1: First Launch (With Internet)**
1. App loads from local static files ✅
2. User logs in (API call to Vercel) ✅
3. Data loads from API ✅
4. Works normally ✅

### **Scenario 2: Offline Launch**
1. App loads from local static files ✅
2. User can view cached data ✅
3. User can create/edit data (saved locally) ✅
4. Changes queued for sync ✅
5. When internet returns → auto-sync ✅

### **Scenario 3: Online Launch**
1. App loads from local static files ✅
2. API calls go to Vercel ✅
3. Real-time data ✅
4. Automatic sync ✅

---

## Technical Details

### **Electron Main Process** (`electron/main.js`)

```javascript
// Checks multiple locations for static files:
1. __dirname/../out/index.html (development)
2. resources/app.asar/out/index.html (packed)
3. resources/app/out/index.html (unpacked)

// If found → file:// protocol (offline)
// If not found → https:// Vercel URL (online)
```

### **Build Configuration** (`package.json`)

```json
{
  "build": {
    "files": [
      "out/**/*",  // ← Static files included!
      "electron/**/*",
      "package.json"
    ]
  }
}
```

### **Next.js Config** (`next.config.mjs`)

```javascript
output: process.env.ELECTRON ? 'export' : undefined
// Creates static files when ELECTRON=1
```

---

## Benefits

1. **✅ Works Offline**: No internet needed to start app
2. **✅ Faster Startup**: Local files load instantly
3. **✅ Reliable**: Always works, even if Vercel is down
4. **✅ Automatic Sync**: Changes sync when online
5. **✅ Best UX**: Seamless online/offline experience

---

## Testing

### **Test Offline Mode**

1. Build the app: `npm run electron:build:win`
2. Install the `.exe`
3. Disconnect internet
4. Launch app → Should load from local files ✅
5. Create/edit data → Saved to SQLite ✅
6. Reconnect internet → Auto-sync ✅

### **Test Online Mode**

1. Build the app: `npm run electron:build:win`
2. Install the `.exe`
3. Connect to internet
4. Launch app → Loads from local files ✅
5. API calls work → Data syncs ✅

---

## Troubleshooting

### **App doesn't load offline**

**Check:**
1. Verify `out/` folder exists after build
2. Check `package.json` includes `out/**/*` in files
3. Verify electron-builder packaged the files

**Solution:**
- Rebuild: `npm run electron:build:win`
- Check `dist/win-unpacked/resources/` for `out` folder

### **API calls fail offline**

**Expected behavior:**
- API calls fail when offline (normal)
- Changes saved to local SQLite
- Queued for sync when online

**Solution:**
- This is correct! Changes will sync automatically when online

---

## Summary

| Feature | Offline | Online |
|---------|---------|--------|
| **App Startup** | ✅ Works (local files) | ✅ Works (local files) |
| **UI Loading** | ✅ Works (local files) | ✅ Works (local files) |
| **View Data** | ✅ Works (SQLite) | ✅ Works (API + SQLite) |
| **Create/Edit** | ✅ Works (SQLite) | ✅ Works (API + SQLite) |
| **API Calls** | ⏸️ Queued | ✅ Works |
| **Data Sync** | ⏸️ Pending | ✅ Automatic |

**Result: The app works perfectly with OR without internet!** 🎉

