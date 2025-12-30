# 🖥️ Desktop App Build Guide - Windows .exe

## Building the HR Leave Portal as a Windows Desktop Application

This guide will help you create a Windows `.exe` installer that ministry staff can install and use.

---

## ✅ Prerequisites

1. **Node.js** installed (v18 or higher)
2. **Windows 10/11** (for building Windows apps)
3. **All dependencies** installed: `npm install`

---

## 🚀 Quick Build (3 Steps)

### Step 1: Create Windows Icon

The app needs a Windows icon. We've created a PNG, but you need to convert it to `.ico`:

**Option A: Use Online Converter (Easiest)**
1. Go to: https://convertio.co/png-ico/
2. Upload: `public/icon-256x256.png`
3. Convert to ICO format
4. Download and save as `public/icon.ico`

**Option B: Use the PNG (Works but not ideal)**
- Electron will accept PNG, but `.ico` is preferred
- You can temporarily use `public/icon-256x256.png` by renaming it

### Step 2: Configure API URL (Important!)

The desktop app needs to know where your API server is. You have two options:

**Option A: Use Remote API (Recommended for Ministry)**
- Your app is deployed on Vercel or another server
- Set the API URL when building:

```bash
# Set your Vercel/deployed URL
$env:ELECTRON_API_URL="https://hr-leave-portal.vercel.app"
npm run electron:build:win
```

**Option B: Use Local API (For Testing)**
- The app will try to connect to localhost:3000
- You'll need to run the Next.js server locally
- Not recommended for distribution

### Step 3: Build the .exe

```bash
npm run electron:build:win
```

This will:
1. Build your Next.js app
2. Create a Windows installer
3. Output to `dist/` folder

**Output File**: `dist/HR Leave Portal Setup 0.1.0.exe`

---

## 📦 What Gets Created

After building, you'll find in the `dist/` folder:

- **`HR Leave Portal Setup 0.1.0.exe`** - The installer file (share this!)
- **`win-unpacked/`** - Unpacked app files (for testing)

**File Size**: ~100-150MB (includes everything needed)

---

## 🎯 Distribution to Ministry Staff

### For You (Developer):

1. **Build the .exe**:
   ```bash
   npm run electron:build:win
   ```

2. **Test the installer**:
   - Run `dist/HR Leave Portal Setup 0.1.0.exe` on a test machine
   - Verify it installs correctly
   - Test the app functionality

3. **Share the .exe file**:
   - Upload to shared drive, email, or file sharing service
   - Or burn to USB/CD for distribution

### For Ministry Staff (End Users):

1. **Download/Receive** the `.exe` file
2. **Double-click** the installer
3. **Follow the installation wizard**:
   - Choose installation location (default: `C:\Program Files\HR Leave Portal`)
   - Choose whether to create desktop shortcut
   - Click "Install"
4. **Launch the app**:
   - From Start Menu: Search "HR Leave Portal"
   - From Desktop shortcut (if created)
   - From Program Files folder

---

## ⚙️ Build Configuration

The build is configured in `package.json`:

```json
{
  "build": {
    "appId": "com.mofa.hr-leave-portal",
    "productName": "HR Leave Portal",
    "win": {
      "target": ["nsis"],
      "icon": "public/icon.ico",
      "publisherName": "Ministry of Fisheries and Aquaculture"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

**Key Settings:**
- ✅ **NSIS Installer** - Standard Windows installer
- ✅ **Custom Installation Directory** - Users can choose where to install
- ✅ **Desktop Shortcut** - Creates shortcut on desktop
- ✅ **Start Menu Shortcut** - Adds to Start Menu
- ✅ **Publisher Name** - Shows in Windows

---

## 🔧 Advanced Configuration

### Customize App Name

Edit `package.json`:
```json
{
  "productName": "MoFA HR Portal"
}
```

### Customize Window Size

Edit `electron/main.js`:
```javascript
mainWindow = new BrowserWindow({
  width: 1400,  // Change this
  height: 900,  // Change this
  // ...
});
```

### Change Installer Options

Edit `package.json` → `build.nsis`:
```json
{
  "nsis": {
    "oneClick": true,  // One-click install (no wizard)
    "allowToChangeInstallationDirectory": false,  // Force default location
    // ...
  }
}
```

---

## 🐛 Troubleshooting

### Build Fails with "Icon not found"

**Solution**: 
1. Create `public/icon.ico` (see Step 1 above)
2. Or temporarily use PNG: Change `"icon": "public/icon.ico"` to `"icon": "public/icon-256x256.png"`

### App Shows Blank Screen

**Solution**:
1. Check that `ELECTRON_API_URL` is set correctly
2. Verify your API server is accessible
3. Check DevTools (Ctrl+Shift+I) for errors
4. Ensure API routes are working on your server

### Build is Very Large (>200MB)

**Solution**:
- This is normal for Electron apps
- Includes Chromium browser + Node.js + your app
- Can't be reduced much without breaking functionality

### "Windows Protected Your PC" Warning

**Solution**:
- This is normal for unsigned apps
- Users need to click "More info" → "Run anyway"
- To remove warning: Sign the app with a code signing certificate (costs money)

### Installation Fails

**Solution**:
1. Check Windows Defender isn't blocking
2. Run installer as Administrator
3. Check disk space (needs ~200MB free)
4. Verify installer file isn't corrupted

---

## 📋 Build Checklist

Before distributing:

- [ ] Windows icon (`.ico`) created
- [ ] API URL configured correctly
- [ ] Build completed successfully
- [ ] Installer tested on clean Windows machine
- [ ] App launches and connects to API
- [ ] All features work correctly
- [ ] Desktop shortcut created
- [ ] Start Menu entry works
- [ ] Uninstaller works correctly

---

## 🚀 Quick Commands Reference

```bash
# Development (test Electron app)
npm run electron:dev

# Build for Windows
npm run electron:build:win

# Build with remote API URL
$env:ELECTRON_API_URL="https://hr-leave-portal.vercel.app"
npm run electron:build:win

# Build for other platforms (if needed)
npm run electron:build:mac    # macOS
npm run electron:build:linux   # Linux
```

---

## 📝 Important Notes

1. **API Server Required**: The desktop app needs your API server running (Vercel deployment)
2. **Internet Connection**: Users need internet to connect to your API
3. **First Launch**: May take a few seconds to load
4. **Updates**: To update, rebuild and redistribute the new `.exe`
5. **Offline Mode**: Currently not supported (app needs API connection)

---

## 🎉 You're Ready!

Once you've built the `.exe`, you can distribute it to all ministry staff. They can install it like any other Windows program!

**The installer file is in**: `dist/HR Leave Portal Setup 0.1.0.exe`

Share this file with your ministry staff! 📦

