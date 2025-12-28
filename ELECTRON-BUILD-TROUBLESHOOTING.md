# Electron Build Troubleshooting Guide

## Common Build Issues and Solutions

---

## 🚨 Issue 1: Path with Spaces Error

**Error:**
```
⨯ Attempting to build a module with a space in the path
```

**Problem:** Your project is in a folder with spaces: `C:\Users\OSCARPACK\Downloads\Telegram Desktop\...`

**Solutions:**

### Option A: Move Project (Recommended)
Move your project to a path without spaces:

```powershell
# Create a new folder without spaces
New-Item -ItemType Directory -Path "C:\Projects\hr-leave-portal" -Force

# Move the project
Move-Item "C:\Users\OSCARPACK\Downloads\Telegram Desktop\hr-staff-leave-portal\leave-portal" "C:\Projects\hr-leave-portal"

# Navigate to new location
cd C:\Projects\hr-leave-portal
```

### Option B: Use Short Path (Windows)
Use the 8.3 short path format:

```powershell
# Get short path
cmd /c dir /x "C:\Users\OSCARPACK\Downloads\Telegram Desktop"

# Use the short path (e.g., TELEGR~1)
cd C:\Users\OSCARPACK\Downloads\TELEGR~1\hr-staff-leave-portal\leave-portal
```

### Option C: Build from Different Location
Create a symlink to a path without spaces:

```powershell
# Create symlink
New-Item -ItemType SymbolicLink -Path "C:\Projects\leave-portal" -Target "C:\Users\OSCARPACK\Downloads\Telegram Desktop\hr-staff-leave-portal\leave-portal"

# Build from symlink
cd C:\Projects\leave-portal
```

---

## 🚨 Issue 2: Missing Visual Studio Build Tools

**Error:**
```
gyp ERR! find VS You need to install the latest version of Visual Studio
gyp ERR! find VS including the "Desktop development with C++" workload.
```

**Problem:** Native modules (like `bufferutil`) need to be compiled, requiring Visual Studio Build Tools.

**Solutions:**

### Option A: Skip Native Rebuilds (Recommended for Vercel)
Since we're loading from Vercel, we don't need native modules. The build scripts are already configured to skip them:

```powershell
$env:ELECTRON_API_URL="https://hr-leave-portal.vercel.app"
npm run electron:build:vercel:win
```

### Option B: Install Visual Studio Build Tools
If you need native modules:

1. Download [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
2. Install with "Desktop development with C++" workload
3. Restart your terminal
4. Try building again

### Option C: Use Prebuilt Binaries
Install `windows-build-tools` (deprecated but sometimes works):

```powershell
npm install --global windows-build-tools
```

---

## 🚨 Issue 3: Build Fails with Native Module Errors

**Error:**
```
⨯ node-gyp failed to rebuild 'bufferutil'
```

**Solution:** Since we're using Vercel, we don't need these modules. The updated build config excludes them. Make sure you're using the `electron:build:vercel` scripts:

```powershell
# Correct - uses vercel script
$env:ELECTRON_API_URL="https://hr-leave-portal.vercel.app"
npm run electron:build:vercel:win

# Wrong - tries to rebuild native modules
npm run electron:build:win
```

---

## 🚨 Issue 4: Missing Dependencies

**Error:**
```
Cannot find module 'electron'
```

**Solution:** Install Electron dependencies:

```powershell
npm install --save-dev electron electron-builder concurrently wait-on cross-env
npm install --save electron-is-dev
```

---

## 🚨 Issue 5: Icon Files Missing

**Error:**
```
Icon file not found: public/icon.ico
```

**Solutions:**

### Option A: Create Icons
1. Use an online tool: https://www.electron.build/icons
2. Upload your logo (e.g., `mofa-logo.png`)
3. Download all formats
4. Place in `public/` folder:
   - `public/icon.ico` (Windows)
   - `public/icon.icns` (macOS)
   - `public/icon.png` (Linux)

### Option B: Remove Icon Config (Temporary)
Edit `package.json` and remove icon references:

```json
"win": {
  "target": ["nsis"]
  // Remove: "icon": "public/icon.ico"
}
```

---

## ✅ Quick Fix Checklist

Before building, ensure:

- [ ] Project is in a path **without spaces** (or use short path)
- [ ] Using `electron:build:vercel` scripts (not regular build scripts)
- [ ] `ELECTRON_API_URL` environment variable is set
- [ ] Electron dependencies are installed
- [ ] Icon files exist (or icon config is removed)

---

## 🚀 Correct Build Command

**PowerShell:**
```powershell
# Set Vercel URL (remove trailing slash)
$env:ELECTRON_API_URL="https://hr-leave-portal.vercel.app"

# Build for Windows
npm run electron:build:vercel:win
```

**Command Prompt:**
```cmd
set ELECTRON_API_URL=https://hr-leave-portal.vercel.app
npm run electron:build:vercel:win
```

**Important:** 
- ✅ Remove trailing slash from URL
- ✅ Use `electron:build:vercel` scripts
- ✅ Build from path without spaces

---

## 📝 Build Configuration

The build is now configured to:
- ✅ Skip native module rebuilds (`npmRebuild: false`)
- ✅ Exclude unnecessary files (node_modules, source files)
- ✅ Only include Electron files needed for the wrapper
- ✅ Work without Visual Studio Build Tools

---

## 🐛 Still Having Issues?

1. **Check Electron version:**
   ```powershell
   npx electron --version
   ```

2. **Clear cache and rebuild:**
   ```powershell
   npm cache clean --force
   Remove-Item -Recurse -Force node_modules
   npm install
   ```

3. **Try building from a clean location:**
   ```powershell
   # Create new folder
   cd C:\Projects
   git clone <your-repo-url> hr-leave-portal
   cd hr-leave-portal
   npm install
   $env:ELECTRON_API_URL="https://hr-leave-portal.vercel.app"
   npm run electron:build:vercel:win
   ```

---

**Last Updated**: 2024  
**Status**: ✅ Build configuration optimized for Vercel deployment

