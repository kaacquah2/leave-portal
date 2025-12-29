# Electron .exe Offline Requirements

## ⚠️ Current Situation

When you build the `.exe` with the Vercel URL, here's what happens:

### **Initial Load: REQUIRES INTERNET** ❌

The Electron app currently loads the page from the Vercel URL:
```javascript
// electron/main.js line 99-122
const DEFAULT_VERCEL_URL = 'https://hr-leave-portal.vercel.app';
startUrl = remoteApiUrl; // Loads from Vercel
mainWindow.loadURL(startUrl); // Requires internet!
```

**This means:**
- ✅ **After initial load**: App can work offline (uses SQLite, queues changes)
- ❌ **On app startup**: REQUIRES internet to load the page from Vercel
- ❌ **If page refreshes**: REQUIRES internet again
- ❌ **If user closes/reopens app**: REQUIRES internet to start

### **What Works Offline (After Initial Load)**
- ✅ Creating/editing leave requests (saved to SQLite)
- ✅ Viewing local data
- ✅ All UI interactions
- ✅ Changes queued for sync
- ✅ Automatic sync when internet returns

### **What Requires Internet**
- ❌ **Initial page load** (HTML/JS/CSS from Vercel)
- ❌ **Authentication** (needs API to verify login)
- ❌ **API calls** (but these are queued when offline)

---

## ✅ Solution: Bundle App as Static Files

To make the app work **completely offline**, you need to:

### **Option 1: Build Next.js as Static Export** (Recommended)

1. **Modify `next.config.js`** to support static export:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Static export
  distDir: 'out', // Output directory
  images: {
    unoptimized: true, // Required for static export
  },
  // ... rest of config
}
```

2. **Build static files**:
```bash
npm run build
# This creates an 'out' folder with static HTML/JS/CSS
```

3. **Modify `electron/main.js`** to load from local files:
```javascript
// In production, load from bundled files instead of Vercel
const path = require('path');
const isDev = require('electron-is-dev');

let startUrl;
if (isDev) {
  startUrl = 'http://localhost:3000';
} else {
  // Load from bundled static files
  startUrl = `file://${path.join(__dirname, '../out/index.html')}`;
}
```

4. **Update build script** to copy static files:
```javascript
// scripts/build-electron.js
// After building Next.js, copy 'out' folder to Electron's resources
```

### **Option 2: Use Electron's Built-in Next.js Integration**

Use a package like `nextron` or `electron-next` to bundle Next.js properly.

---

## 🔧 Quick Fix: Hybrid Approach

For now, you can make it work better offline by:

### **1. Cache the Vercel Page**

Add service worker caching to cache the initial page:

```javascript
// public/sw.js (already exists)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

### **2. Load from Cache if Offline**

Modify `electron/main.js` to check cache first:

```javascript
// Check if we have cached version
const cachedUrl = 'file://' + path.join(app.getPath('userData'), 'cached-app/index.html');
if (fs.existsSync(cachedUrl)) {
  startUrl = cachedUrl; // Use cached version
} else {
  startUrl = DEFAULT_VERCEL_URL; // Load from Vercel
}
```

### **3. Download and Cache on First Run**

On first launch with internet:
1. Download the page from Vercel
2. Save to local cache
3. Use cached version on subsequent launches

---

## 📋 Recommended Implementation Steps

### **Step 1: Static Export Setup**

1. Update `next.config.js`:
```javascript
const nextConfig = {
  output: process.env.ELECTRON ? 'export' : undefined,
  // ... rest
}
```

2. Build command:
```bash
ELECTRON=1 npm run build
```

### **Step 2: Electron Load Local Files**

Modify `electron/main.js`:
```javascript
const path = require('path');
const fs = require('fs');

function getStartUrl() {
  if (isDev) {
    return 'http://localhost:3000';
  }
  
  // Check for bundled static files
  const staticPath = path.join(__dirname, '../out/index.html');
  if (fs.existsSync(staticPath)) {
    return `file://${staticPath}`;
  }
  
  // Fallback to Vercel (requires internet)
  return DEFAULT_VERCEL_URL;
}

const startUrl = getStartUrl();
```

### **Step 3: Update Build Script**

Modify `scripts/build-electron.js` to:
1. Build Next.js with `output: 'export'`
2. Copy `out` folder to Electron resources
3. Ensure `index.html` is accessible

---

## 🎯 Current Workaround

**Until you implement static export, the app will:**
- ✅ Work offline **after** initial load
- ❌ Require internet **on startup**
- ✅ Queue all changes for sync
- ✅ Sync automatically when online

**For users:**
- They need internet **once** to load the app
- After that, they can work offline
- Changes sync when internet returns

---

## 📝 Summary

| Scenario | Internet Required? | Status |
|----------|-------------------|--------|
| **Initial app launch** | ✅ Yes | Loads from Vercel |
| **After page loads** | ❌ No | Works offline with SQLite |
| **Creating/editing data** | ❌ No | Saved locally, queued for sync |
| **Viewing data** | ❌ No | Reads from local SQLite |
| **Syncing changes** | ✅ Yes | When internet returns |
| **App restart** | ✅ Yes | Needs to load page again |

**To make it fully offline:**
- Bundle Next.js as static files
- Load from `file://` instead of Vercel URL
- Only use Vercel URL for API calls

---

## 🚀 Next Steps

1. **Short-term**: Document that internet is needed for initial load
2. **Medium-term**: Implement static export + local file loading
3. **Long-term**: Full offline-first with cached authentication

Would you like me to implement the static export solution?

