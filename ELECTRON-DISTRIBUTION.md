# Electron Distribution Guide
## Creating Installable Desktop Apps for Distribution

This guide explains what files Electron Builder creates and how to distribute them.

---

## 📦 What You'll Get

### Windows (.exe Installer)

**File Created**: `dist/HR Leave Portal Setup 0.1.0.exe`

**Type**: NSIS Installer (Windows Installer)

**What it does**:
- ✅ Users double-click to install
- ✅ Creates Start Menu shortcut
- ✅ Creates Desktop shortcut (optional)
- ✅ Adds to "Add/Remove Programs"
- ✅ Installs to Program Files
- ✅ Creates uninstaller

**File Size**: ~100-150MB (includes everything)

**Users can**:
1. Download the `.exe` file
2. Double-click to run installer
3. Follow installation wizard
4. Launch from Start Menu or Desktop

---

## 🍎 macOS (.dmg File)

**File Created**: `dist/HR Leave Portal-0.1.0.dmg`

**Type**: Disk Image (macOS Installer)

**What it does**:
- ✅ Users double-click to mount
- ✅ Drag app to Applications folder
- ✅ Launch from Applications

**File Size**: ~100-150MB

**Users can**:
1. Download the `.dmg` file
2. Double-click to open
3. Drag app to Applications folder
4. Launch from Applications

---

## 🐧 Linux (Multiple Formats)

**Files Created**:
- `dist/HR Leave Portal-0.1.0.AppImage` (Portable, no install)
- `dist/hr-leave-portal_0.1.0_amd64.deb` (Debian/Ubuntu installer)

**AppImage**:
- ✅ No installation needed
- ✅ Double-click to run
- ✅ Portable (can run from USB)

**DEB Package**:
- ✅ Install with: `sudo dpkg -i hr-leave-portal_0.1.0_amd64.deb`
- ✅ Appears in applications menu
- ✅ Can be uninstalled

---

## 🚀 Building for Distribution

### Step 1: Build for Windows

```bash
npm run electron:build:win
```

**Output**: `dist/HR Leave Portal Setup 0.1.0.exe`

**Share this file** with Windows users!

### Step 2: Build for macOS

```bash
npm run electron:build:mac
```

**Output**: `dist/HR Leave Portal-0.1.0.dmg`

**Note**: macOS builds require a Mac computer.

### Step 3: Build for Linux

```bash
npm run electron:build:linux
```

**Output**: 
- `dist/HR Leave Portal-0.1.0.AppImage`
- `dist/hr-leave-portal_0.1.0_amd64.deb`

---

## 📋 Complete Build Process

### 1. Ensure Everything is Ready

```bash
# Make sure Next.js builds successfully
npm run build

# Verify Electron files exist
ls electron/main.js
ls electron/preload.js
```

### 2. Build the Installer

**For Windows (on Windows):**
```bash
npm run electron:build:win
```

**For macOS (on macOS):**
```bash
npm run electron:build:mac
```

**For Linux (on Linux):**
```bash
npm run electron:build:linux
```

### 3. Find Your Installer

After building, check the `dist/` folder:

```bash
# Windows
dist/HR Leave Portal Setup 0.1.0.exe

# macOS
dist/HR Leave Portal-0.1.0.dmg

# Linux
dist/HR Leave Portal-0.1.0.AppImage
dist/hr-leave-portal_0.1.0_amd64.deb
```

---

## 📤 Distributing the App

### Option 1: Direct File Share

**Simple Method:**
1. Build the installer: `npm run electron:build:win`
2. Upload `dist/HR Leave Portal Setup 0.1.0.exe` to:
   - Google Drive
   - Dropbox
   - OneDrive
   - File sharing service
3. Share the download link

**Users download and install!**

### Option 2: Website Download

**Professional Method:**
1. Build installers for all platforms
2. Upload to your website/server
3. Create download page:
   ```html
   <h2>Download HR Leave Portal</h2>
   <a href="HR-Leave-Portal-Setup-0.1.0.exe">Download for Windows</a>
   <a href="HR-Leave-Portal-0.1.0.dmg">Download for macOS</a>
   <a href="HR-Leave-Portal-0.1.0.AppImage">Download for Linux</a>
   ```

### Option 3: GitHub Releases

**For Open Source:**
1. Build installers
2. Create GitHub release
3. Upload installers as release assets
4. Users download from releases page

---

## 🎯 Windows Installation Experience

### What Users See:

1. **Download**: User downloads `HR Leave Portal Setup 0.1.0.exe`

2. **Run Installer**: Double-click the `.exe` file

3. **Security Warning** (First time):
   - Windows may show "Windows protected your PC"
   - Click "More info" → "Run anyway"
   - *(This happens because app isn't code-signed)*

4. **Installation Wizard**:
   - Choose installation directory
   - Choose Start Menu folder
   - Create desktop shortcut (optional)
   - Click "Install"

5. **Launch**: App appears in Start Menu and Desktop

6. **Uninstall**: Via "Add/Remove Programs" in Windows Settings

---

## 🔐 Code Signing (Optional but Recommended)

### Why Code Sign?

**Without Code Signing:**
- ⚠️ Windows shows "Unknown publisher" warning
- ⚠️ Users see security warning
- ⚠️ Some antivirus may flag it

**With Code Signing:**
- ✅ No security warnings
- ✅ Shows your company name
- ✅ More trusted by users
- ✅ Better antivirus reputation

### How to Code Sign:

**Windows:**
1. Get code signing certificate (costs ~$200-400/year)
2. Add to `package.json`:
   ```json
   "win": {
     "certificateFile": "path/to/certificate.pfx",
     "certificatePassword": "your-password"
   }
   ```

**macOS:**
1. Apple Developer account ($99/year)
2. Add to `package.json`:
   ```json
   "mac": {
     "identity": "Developer ID Application: Your Name"
   }
   ```

**Note**: For internal use, code signing is optional. For public distribution, it's recommended.

---

## 📊 File Sizes

### Typical Sizes:

- **Windows .exe**: ~100-150MB
- **macOS .dmg**: ~100-150MB
- **Linux AppImage**: ~100-150MB
- **Linux .deb**: ~100-150MB

**Why so large?**
- Includes Chromium browser engine
- Includes Node.js runtime
- Includes your app code
- Self-contained (no dependencies needed)

---

## 🚀 Quick Distribution Checklist

### Before Building:
- [ ] App works correctly in development
- [ ] All features tested
- [ ] App icons created (`.ico`, `.icns`, `.png`)
- [ ] Version number updated in `package.json`
- [ ] App name is correct in `package.json`

### Build Process:
- [ ] `npm run build` succeeds
- [ ] `npm run electron:build:win` creates `.exe`
- [ ] Test installer on clean Windows machine
- [ ] Verify app launches correctly
- [ ] Test all features work

### Distribution:
- [ ] Upload installer to file sharing service
- [ ] Create download instructions for users
- [ ] Test download and installation process
- [ ] Provide support contact if needed

---

## 💡 Tips for Distribution

### 1. Version Your Releases

Update version in `package.json`:
```json
{
  "version": "0.1.0"  // Increment for each release
}
```

### 2. Create Installation Instructions

Provide users with:
- System requirements (Windows 10+, etc.)
- Installation steps
- Troubleshooting tips

### 3. Test on Clean Machine

Before distributing:
- Test installer on fresh Windows installation
- Verify no missing dependencies
- Check all features work

### 4. Consider Auto-Updates

For future versions, implement auto-updater:
- Users get updates automatically
- No need to re-download installer
- Better user experience

---

## 📝 Example Distribution Workflow

### Step-by-Step:

1. **Build the installer:**
   ```bash
   npm run electron:build:win
   ```

2. **Verify the file:**
   ```bash
   # Check dist folder
   ls dist/
   # Should see: HR Leave Portal Setup 0.1.0.exe
   ```

3. **Test locally:**
   - Run the installer
   - Install the app
   - Launch and test

4. **Upload to sharing service:**
   - Google Drive, Dropbox, etc.
   - Get shareable link

5. **Share with users:**
   - Send download link
   - Provide installation instructions

6. **Users install:**
   - Download `.exe`
   - Run installer
   - Launch app!

---

## 🎯 Summary

**Yes, you'll get an `.exe` file!**

**File**: `dist/HR Leave Portal Setup 0.1.0.exe`

**What users do**:
1. Download the `.exe` file
2. Double-click to install
3. Launch from Start Menu

**That's it!** No technical knowledge needed for users.

---

## 🔄 Updating the App

### For New Versions:

1. **Update version** in `package.json`
2. **Build new installer**: `npm run electron:build:win`
3. **Distribute new `.exe`** file
4. **Users install over old version** (or uninstall first)

### Future: Auto-Updates

Consider implementing `electron-updater` for automatic updates:
- Users get notified of updates
- App updates itself
- No manual re-installation needed

---

**Last Updated**: 2024
**Ready to build?** Run `npm run electron:build:win` after installing dependencies!

