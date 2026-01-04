# How Pages Are Built and Packaged into the .exe File

This document explains how the web application pages are built, packaged, and loaded in the Electron desktop application.

## Overview

The HR Leave Portal is a **Next.js web application** that gets packaged into an Electron desktop app. The pages are **part of your codebase** and are **built during the build process** before being packaged into the `.exe` file.

---

## Build Process Flow

### Step 1: Source Code (Your Codebase)

All pages and components are in your codebase:
- **Pages:** `app/page.tsx`, `app/hr/page.tsx`, `app/manager/page.tsx`, etc.
- **Components:** `components/landing.tsx`, `components/login-form.tsx`, `components/portal.tsx`, etc.
- **Styles:** Tailwind CSS, component styles
- **Assets:** Images, fonts, icons in `public/` folder

### Step 2: Next.js Build

When you run the build command:
```bash
npm run electron:build:win
```

The build script (`scripts/build-electron.js`) does the following:

1. **Compiles TypeScript repositories:**
   ```bash
   npx tsc -p tsconfig.electron.json
   ```
   - Compiles TypeScript files in `electron/repositories/` to JavaScript
   - Output: `electron/repositories-compiled/`

2. **Builds Next.js application:**
   ```bash
   cross-env ELECTRON=1 npm run build
   ```
   - This runs: `prisma generate && next build --webpack`
   - Next.js compiles React components, optimizes code, bundles assets
   - **Note:** Current configuration (`next.config.mjs`) has `output: undefined`
   - This means Next.js generates optimized bundles but may not create static HTML files
   - The build output goes to `.next/` directory (Next.js internal build cache)

3. **Static Export (if configured):**
   - If `output: 'export'` is set, Next.js generates static files in `out/` directory
   - The `out/` directory would contain:
     - `index.html` - Main entry point
     - `_next/` - Compiled JavaScript bundles, CSS files
     - Static assets (images, fonts, etc.)
     - All pages as static HTML files
   - **Current Status:** Static export is used for Tauri desktop builds

### Step 3: Tauri Packaging

The `tauri build` command packages everything into a native desktop application:

**Configuration in `src-tauri/tauri.conf.json`:**
```json
{
  "build": {
    "beforeBuildCommand": "npm run build:tauri",
    "distDir": "../out",
    "devPath": "http://localhost:3000"
  }
}
```

**What happens:**
1. **Static Files:** Next.js static export in `out/` directory
   - Contains all HTML, CSS, JavaScript bundles
   - Served by Tauri's webview
   
2. **Rust Backend:** Tauri Rust code compiled to native binary
   - Location: `src-tauri/target/release/` (or `debug/` for dev)
   - Contains: Database operations, file system access, API communication
   
3. **Final Structure:**
   ```
   HR Leave Portal.exe (or .app, .AppImage)
   ├── Binary executable (Rust + Tauri)
   └── Resources/
       └── out/                        (Static web files)
           ├── index.html
               ├── _next/
               │   ├── static/
               │   │   ├── chunks/    (JavaScript bundles)
               │   │   ├── css/       (CSS files)
               │   │   └── media/     (Images, fonts)
               │   └── ...
               └── ...
   ```

---

## How Pages Are Loaded at Runtime

### Development Mode

In development (`npm run electron:dev`):
- Electron loads from: `http://localhost:3000`
- Next.js dev server runs and serves pages dynamically
- Hot reload works for development

### Production Mode

In production (built `.exe` file), the app can load in two ways:

#### Option 1: Local Static Files (Offline Mode)

1. **Custom Protocol Handler:**
   - Electron registers a custom `app://` protocol
   - Code: `electron/protocol-handler.js`
   - Maps `app://` URLs to local file system paths

2. **Window Manager Finds Files:**
   - Code: `electron/window-manager.js` → `findLocalStaticFiles()`
   - Searches for `out/index.html` in these locations:
     ```javascript
     [
       path.join(process.resourcesPath, 'app', 'out'),
       path.join(process.resourcesPath, 'out'),
       path.join(app.getAppPath(), 'out'),
       path.join(__dirname, '..', 'out'),
     ]
     ```

3. **Loads via Custom Protocol:**
   - URL: `app:///index.html`
   - Protocol handler resolves to: `resources/app.asar.unpacked/out/index.html`
   - Electron's BrowserWindow loads the HTML file

4. **Page Navigation:**
   - Next.js handles client-side routing
   - All pages are already bundled in `_next/static/`
   - Navigation happens via JavaScript (no server needed)

#### Option 2: Remote URL (Current Configuration)

Based on `next.config.mjs` comments and `window-manager.js`:
- App may load from remote URL: `https://hr-leave-portal.vercel.app`
- API calls go to the same remote server
- UI is served from Vercel, not local files
- **Note:** This requires internet connection to display UI

**To enable local static files:**
- Set `output: 'export'` in `next.config.mjs` when `ELECTRON=1`
- This will generate `out/` directory with static files
- Window manager will then load from local files instead of remote URL

---

## File Structure After Build

### Before Packaging (Development)
```
leave-portal/
├── app/                    (Source pages - TypeScript/React)
├── components/             (Source components)
├── public/                 (Source assets)
├── out/                    (Generated by Next.js build)
│   ├── index.html
│   ├── _next/
│   │   └── static/
│   └── ...
├── electron/               (Electron main process)
└── package.json
```

### After Packaging (In .exe)
```
HR Leave Portal.exe
└── resources/
    ├── app.asar            (Archived - contains most code)
    └── app.asar.unpacked/
        ├── out/            (Unpacked - web files)
        │   ├── index.html
        │   └── _next/
        ├── electron/
        │   ├── main.js
        │   ├── preload.js
        │   └── ...
        └── node_modules/
            ├── sql.js/
            └── ...
```

---

## Key Points

### ✅ Pages Are Part of the Build

- **Source:** Pages are in your codebase (`app/`, `components/`)
- **Build:** Next.js compiles them to static files (`out/`)
- **Package:** electron-builder includes them in the `.exe`
- **Load:** Electron loads them from local files via `app://` protocol

### ✅ No Server Required (After Build)

- Pages are **static HTML/JS/CSS files**
- All JavaScript is bundled and minified
- Next.js client-side routing handles navigation
- **API calls** still go to remote server (Vercel), but **UI is local**

### ✅ Offline-First Architecture

- UI works offline (all files are local)
- Database is local (SQLite via sql.js)
- API calls happen in background when online
- Automatic sync when connection is available

---

## Build Commands Reference

### Development
```bash
npm run electron:dev
```
- Runs Next.js dev server (`localhost:3000`)
- Electron loads from dev server
- Hot reload enabled

### Production Build
```bash
npm run electron:build:win
```
- Builds Next.js static files → `out/`
- Compiles TypeScript repositories
- Packages everything into `.exe` via electron-builder
- Output: `dist/HR Leave Portal Setup 1.0.0.exe`

### What Gets Built

1. **Next.js Static Export:**
   - All React components → JavaScript bundles
   - All pages → Static HTML (with client-side routing)
   - All styles → CSS files
   - All assets → Copied to `out/`

2. **Electron Main Process:**
   - `electron/main.js` → Included as-is
   - `electron/preload.js` → Included as-is
   - All Electron modules → Bundled

3. **Dependencies:**
   - Only required dependencies included
   - `sql.js`, `uuid`, `electron-updater` explicitly included
   - Other dependencies bundled in ASAR

---

## Troubleshooting

### If Pages Don't Load

1. **Check `out/` directory exists:**
   ```bash
   ls out/index.html
   ```
   - Should exist after `npm run build`

2. **Check electron-builder config:**
   - Verify `"out/**/*"` is in `files` array
   - Verify `"out/**/*"` is in `asarUnpack` array

3. **Check protocol handler:**
   - Verify `app://` protocol is registered
   - Check `electron/protocol-handler.js` is working

4. **Check window manager:**
   - Verify `findLocalStaticFiles()` finds `out/index.html`
   - Check logs for file path resolution

### If Build Fails

1. **Next.js build fails:**
   - Check TypeScript errors
   - Check for missing dependencies
   - Verify `next.config.mjs` is correct

2. **electron-builder fails:**
   - Check `out/` directory exists
   - Verify all required files are present
   - Check for path issues (spaces, special characters)

---

## Summary

**Question:** Are pages from the webapp or in codebase?
**Answer:** Pages are **in your codebase** (React/Next.js source files in `app/` and `components/` directories)

**Question:** Part of building up the app process?
**Answer:** Yes! They're built by Next.js → packaged by electron-builder → included in `.exe`

**Question:** How are pages loaded into the .exe file?
**Answer:** 
1. **Source:** Pages are React/Next.js components in your codebase
2. **Build:** Next.js compiles them (currently to `.next/` directory)
3. **Package:** electron-builder includes files in `.exe` (configured to include `out/` if it exists)
4. **Load:** Electron can load either:
   - **From remote URL:** `https://hr-leave-portal.vercel.app` (current config)
   - **From local files:** `app:///index.html` (if static export is enabled)

**Current Configuration:**
- `next.config.mjs` has `output: undefined` (no static export)
- App loads from remote Vercel URL in production
- Infrastructure exists for local files (protocol handler, window manager)
- To enable offline UI: Set `output: 'export'` when `ELECTRON=1`

**Note:** Even when loading from remote URL, the pages are still part of your codebase and get deployed to Vercel. The `.exe` file contains Electron runtime and can load the UI from either local files or remote server.

