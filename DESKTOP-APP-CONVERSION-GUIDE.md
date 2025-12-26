# Desktop App Conversion Guide
## Converting Next.js Web App to Desktop Application

This guide covers all options for converting your HR Leave Portal into a desktop application.

---

## 🖥️ Desktop App Options Overview

### Option 1: Electron (Most Popular) ⭐ Recommended
- Wraps your web app in a desktop container
- Used by VS Code, Slack, Discord, WhatsApp Desktop
- **Pros**: Mature, large ecosystem, cross-platform
- **Cons**: Larger app size (~100MB+), higher memory usage

### Option 2: Tauri (Lightweight Alternative)
- Rust-based, much smaller apps
- **Pros**: Small bundle size (~5MB), better security, fast
- **Cons**: Newer, smaller ecosystem, requires Rust

### Option 3: PWA as Desktop App
- Install web app as desktop app
- **Pros**: Easiest, no code changes, works immediately
- **Cons**: Limited desktop features, still runs in browser

### Option 4: Native Desktop Frameworks
- Tauri, Electron Forge, etc.
- **Pros**: Full native control
- **Cons**: More complex, platform-specific code

---

## 🚀 Option 1: Electron (Recommended)

### Requirements

**Software:**
- Node.js 18+ or 20+
- npm or yarn
- Git

**Platform Support:**
- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Linux (Ubuntu, Debian, etc.)

### Step 1: Install Electron

```bash
# In your project root
npm install --save-dev electron electron-builder
npm install --save electron-is-dev
```

### Step 2: Create Electron Main Process

Create `electron/main.js`:

```javascript
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icon.png'), // Your app icon
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../out/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Create preload script
// electron/preload.js
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  versions: process.versions,
});
```

### Step 3: Create Preload Script

Create `electron/preload.js`:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process
// to use the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: process.versions,
  
  // Example: Send message to main process
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  
  // Example: Listen for messages from main process
  onMessage: (callback) => ipcRenderer.on('message', callback),
});
```

### Step 4: Update package.json

Add Electron scripts and configuration:

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron": "electron .",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
    "electron:build": "next build && electron-builder",
    "electron:build:win": "next build && electron-builder --win",
    "electron:build:mac": "next build && electron-builder --mac",
    "electron:build:linux": "next build && electron-builder --linux"
  },
  "build": {
    "appId": "com.mofa.hr-leave-portal",
    "productName": "HR Leave Portal",
    "directories": {
      "output": "dist"
    },
    "files": [
      "out/**/*",
      "electron/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "win": {
      "target": ["nsis"],
      "icon": "public/icon.ico"
    },
    "mac": {
      "target": ["dmg"],
      "icon": "public/icon.icns",
      "category": "public.app-category.business"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "public/icon.png",
      "category": "Office"
    }
  }
}
```

### Step 5: Install Additional Dependencies

```bash
npm install --save-dev concurrently wait-on
```

### Step 6: Update next.config.mjs for Electron

```javascript
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config ...
  
  // For Electron, use static export
  output: process.env.ELECTRON ? 'export' : undefined,
  
  // ... rest of config ...
}

export default nextConfig
```

### Step 7: Create App Icons

You need icons in different formats:
- **Windows**: `icon.ico` (256x256)
- **macOS**: `icon.icns` (512x512)
- **Linux**: `icon.png` (512x512)

Place in `public/` folder.

**Generate icons:**
- Use online tools: https://www.electron.build/icons
- Or use: `electron-icon-maker` package

### Step 8: Run Electron App

**Development:**
```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start Electron
npm run electron
```

**Or use concurrently:**
```bash
npm run electron:dev
```

**Build for Production:**
```bash
# Build for current platform
npm run electron:build

# Build for specific platform
npm run electron:build:win   # Windows
npm run electron:build:mac    # macOS
npm run electron:build:linux  # Linux
```

---

## ⚡ Option 2: Tauri (Lightweight)

### Requirements

**Software:**
- Node.js 18+
- Rust (for Tauri)
- System dependencies (varies by OS)

### Step 1: Install Tauri CLI

```bash
npm install --save-dev @tauri-apps/cli
npm install --save @tauri-apps/api
```

### Step 2: Initialize Tauri

```bash
npx tauri init
```

This will:
- Create `src-tauri/` directory
- Set up Rust project
- Create configuration files

### Step 3: Configure Tauri

Edit `src-tauri/tauri.conf.json`:

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:3000",
    "distDir": "../out"
  },
  "package": {
    "productName": "HR Leave Portal",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "open": true
      }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.mofa.hrportal",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ]
    },
    "security": {
      "csp": null
    },
    "windows": [
      {
        "fullscreen": false,
        "resizable": true,
        "title": "HR Leave Portal",
        "width": 1200,
        "height": 800
      }
    ]
  }
}
```

### Step 4: Update package.json

```json
{
  "scripts": {
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

### Step 5: Run Tauri App

**Development:**
```bash
npm run tauri:dev
```

**Build:**
```bash
npm run tauri:build
```

**Pros:**
- ✅ Much smaller app size (~5-10MB vs 100MB+)
- ✅ Better security (Rust backend)
- ✅ Faster startup
- ✅ Native performance

**Cons:**
- ❌ Requires Rust installation
- ❌ Smaller ecosystem
- ❌ More complex setup

---

## 🌐 Option 3: PWA as Desktop App (Easiest)

### This is Already Possible!

Your web app can be installed as a desktop app using PWA features.

### Step 1: Implement PWA (See PWA-QUICK-START.md)

Already covered in `PWA-QUICK-START.md` - just follow those steps!

### Step 2: Install as Desktop App

**Windows (Chrome/Edge):**
1. Open app in browser
2. Click install icon in address bar
3. Or: Menu → "Install HR Leave Portal"

**macOS (Safari/Chrome):**
1. Open app in browser
2. Safari: File → "Add to Dock"
3. Chrome: Menu → "Install HR Leave Portal"

**Linux (Chrome/Edge):**
1. Open app in browser
2. Click install icon
3. App appears in applications menu

**Pros:**
- ✅ Zero code changes needed
- ✅ Works immediately
- ✅ Automatic updates
- ✅ No installation files

**Cons:**
- ❌ Limited desktop features
- ❌ Still runs in browser
- ❌ Requires internet (unless offline-capable)

---

## 📦 Option 4: Next.js Standalone + Electron

For a self-contained desktop app with local database:

### Architecture:

```
┌─────────────────────────────────┐
│   Electron Window               │
│   ┌───────────────────────────┐ │
│   │   Next.js App (Built)     │ │
│   │   - Static HTML/JS        │ │
│   │   - API Routes (Node.js)  │ │
│   └───────────────────────────┘ │
└─────────────────────────────────┘
           │
           │ Database Connection
           │
┌──────────▼──────────┐
│   Local PostgreSQL  │
│   (Embedded)         │
└──────────────────────┘
```

### Implementation:

1. **Use Next.js Standalone Output:**
   ```javascript
   // next.config.mjs
   output: 'standalone',
   ```

2. **Bundle PostgreSQL:**
   - Use embedded PostgreSQL (like Postgres.app)
   - Or SQLite for simpler setup
   - Or keep using Neon (cloud)

3. **Package Everything:**
   - Electron bundles Next.js standalone
   - Includes Node.js runtime
   - Includes database (if local)

---

## 🎯 Recommended Approach

### For Quick Desktop Access:
✅ **Use PWA** - Install web app as desktop app (see PWA-QUICK-START.md)

### For Full Desktop App:
✅ **Use Electron** - Most mature, best ecosystem

### For Lightweight Desktop App:
✅ **Use Tauri** - If you want smaller file size

---

## 📋 Complete Electron Setup Checklist

### ✅ Setup Steps:
- [ ] Install Electron dependencies
- [ ] Create `electron/main.js`
- [ ] Create `electron/preload.js`
- [ ] Update `package.json` with Electron scripts
- [ ] Update `next.config.mjs` for static export
- [ ] Create app icons (`.ico`, `.icns`, `.png`)
- [ ] Test in development mode
- [ ] Build for production
- [ ] Test on target platforms

### ✅ Development:
- [ ] `npm run electron:dev` works
- [ ] Hot reload works
- [ ] DevTools accessible
- [ ] App window opens correctly

### ✅ Production Build:
- [ ] `npm run electron:build` creates installer
- [ ] Installer works on target OS
- [ ] App launches correctly
- [ ] All features work offline (if needed)

---

## 🛠️ Advanced Electron Features

### 1. System Tray Integration

```javascript
// electron/main.js
const { Tray, Menu } = require('electron');

let tray = null;

function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow.show() },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setToolTip('HR Leave Portal');
  tray.setContextMenu(contextMenu);
}
```

### 2. Auto-Updater

```bash
npm install electron-updater
```

```javascript
// electron/main.js
const { autoUpdater } = require('electron-updater');

autoUpdater.checkForUpdatesAndNotify();
```

### 3. Native Notifications

```javascript
// In renderer (your React app)
const { Notification } = require('electron').remote;

new Notification({
  title: 'Leave Request',
  body: 'Your leave has been approved',
}).show();
```

### 4. File System Access

```javascript
// electron/preload.js
const { ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (data, filename) => 
    ipcRenderer.invoke('save-file', data, filename),
  openFile: () => 
    ipcRenderer.invoke('open-file'),
});
```

---

## 📊 Comparison Table

| Feature | Electron | Tauri | PWA |
|---------|----------|-------|-----|
| **App Size** | ~100MB+ | ~5-10MB | ~1MB |
| **Memory Usage** | Higher | Lower | Browser-based |
| **Setup Complexity** | Medium | High | Low |
| **Desktop Features** | Full | Full | Limited |
| **Offline Support** | Yes | Yes | With service worker |
| **Auto Updates** | Manual/Updater | Manual/Updater | Automatic |
| **Cross-Platform** | ✅ All | ✅ All | ✅ All |
| **Native APIs** | ✅ Full | ✅ Full | ❌ Limited |
| **Development Time** | 1-2 weeks | 2-3 weeks | 1 day |

---

## 🚀 Quick Start: Electron Setup

### 1. Install Dependencies

```bash
npm install --save-dev electron electron-builder concurrently wait-on
npm install --save electron-is-dev
```

### 2. Create Electron Files

Create `electron/main.js` and `electron/preload.js` (see examples above)

### 3. Update package.json

Add Electron scripts (see example above)

### 4. Test

```bash
# Start Next.js
npm run dev

# In another terminal, start Electron
npm run electron
```

### 5. Build

```bash
npm run electron:build
```

---

## 🐛 Common Issues

### Issue: "Cannot find module 'electron'"
**Solution**: Make sure Electron is installed:
```bash
npm install --save-dev electron
```

### Issue: "Window not opening"
**Solution**: Check `main.js` path in `package.json`:
```json
"main": "electron/main.js"
```

### Issue: "Build fails"
**Solution**: 
- Ensure Next.js build succeeds first: `npm run build`
- Check icon files exist
- Verify electron-builder config

### Issue: "App too large"
**Solution**: 
- Use Tauri instead
- Or optimize Electron build (exclude unnecessary files)

---

## 📝 Summary

### Best Option for Your Project:

**Quick Win (1 day):**
- ✅ **PWA** - Install web app as desktop app
- See `PWA-QUICK-START.md`

**Full Desktop App (1-2 weeks):**
- ✅ **Electron** - Mature, feature-rich
- Follow setup steps above

**Lightweight Desktop (2-3 weeks):**
- ✅ **Tauri** - Smaller, faster
- Requires Rust knowledge

---

## 🎯 Next Steps

1. **Choose your approach** (PWA, Electron, or Tauri)
2. **Follow setup steps** above
3. **Test on target platforms**
4. **Build and distribute**

---

**Last Updated**: 2024
**Questions?** See Electron docs: https://www.electronjs.org/docs

