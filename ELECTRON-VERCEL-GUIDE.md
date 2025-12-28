# Electron App with Vercel Deployment Guide

This guide explains how to build and distribute your Electron desktop app that connects to your Vercel-hosted HR Leave Portal.

---

## 🎯 Overview

Since your app is now hosted on Vercel, the Electron app can simply load the web app from your Vercel URL instead of bundling everything locally. This approach:

- ✅ **Simpler**: No need to bundle the entire Next.js app
- ✅ **Always Up-to-Date**: Users get the latest version automatically
- ✅ **Smaller**: Electron app is just a wrapper (~50MB vs 200MB+)
- ✅ **Easier Updates**: Update the web app, users get it immediately

---

## 📋 Prerequisites

1. ✅ Your app is deployed on Vercel
2. ✅ You have the Vercel URL: `https://hr-leave-portal.vercel.app`
3. ✅ Electron dependencies installed (`electron`, `electron-builder`)

---

## 🚀 Quick Start

### Step 1: Get Your Vercel URL

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your project
3. Copy the deployment URL (e.g., `https://hr-leave-portal.vercel.app`)

### Step 2: Build Electron App for Windows

**PowerShell:**
```powershell
$env:ELECTRON_API_URL="https://hr-leave-portal.vercel.app"
npm run electron:build:vercel:win
```

**Command Prompt:**
```cmd
set ELECTRON_API_URL=https://hr-leave-portal.vercel.app
npm run electron:build:vercel:win
```

**Bash/Linux/Mac:**
```bash
ELECTRON_API_URL=https://hr-leave-portal.vercel.app npm run electron:build:vercel:win
```

### Step 3: Find Your Installer

The installer will be in the `dist/` folder:
- **Windows**: `dist/HR Leave Portal Setup X.X.X.exe`
- **macOS**: `dist/HR Leave Portal-X.X.X.dmg`
- **Linux**: `dist/HR Leave Portal-X.X.X.AppImage`

---

## 🔧 Detailed Build Instructions

### Option 1: Build Scripts (Recommended)

We've added convenient scripts that skip the Next.js build (since we're loading from Vercel):

**Windows:**
```bash
ELECTRON_API_URL=https://hr-leave-portal.vercel.app npm run electron:build:vercel:win
```

**macOS:**
```bash
ELECTRON_API_URL=https://hr-leave-portal.vercel.app npm run electron:build:vercel:mac
```

**Linux:**
```bash
ELECTRON_API_URL=https://hr-leave-portal.vercel.app npm run electron:build:vercel:linux
```

### Option 2: Original Build Scripts

If you prefer the original scripts (they still work):

**Windows:**
```bash
ELECTRON_API_URL=https://hr-leave-portal.vercel.app npm run electron:build:win
```

**macOS:**
```bash
ELECTRON_API_URL=https://hr-leave-portal.vercel.app npm run electron:build:mac
```

**Linux:**
```bash
ELECTRON_API_URL=https://hr-leave-portal.vercel.app npm run electron:build:linux
```

---

## 📦 Distribution

### Sharing with Team Members

1. **Build the installer** (see above)
2. **Upload to shared location:**
   - Google Drive
   - OneDrive
   - Internal file server
   - GitHub Releases
3. **Share the installer file** with your team
4. **Users install and run** - no configuration needed!

### Installation Process

1. User downloads the installer
2. User runs the installer
3. User launches "HR Leave Portal" from Start Menu/Applications
4. App opens and connects to your Vercel deployment automatically
5. User logs in with their credentials

---

## 🎨 Customization

### Change App Icon

1. Create icons:
   - **Windows**: `public/icon.ico` (256x256)
   - **macOS**: `public/icon.icns` (512x512)
   - **Linux**: `public/icon.png` (512x512)

2. Rebuild the app

### Change Window Size

Edit `electron/main.js`:
```javascript
mainWindow = new BrowserWindow({
  width: 1400,  // Change this
  height: 900,  // Change this
  // ...
});
```

### Change App Name

Edit `package.json`:
```json
{
  "build": {
    "productName": "Your Custom Name",
    // ...
  }
}
```

---

## 🔍 How It Works

### Architecture

```
┌─────────────────┐
│  Electron App   │
│  (Desktop)      │
└────────┬────────┘
         │
         │ Loads from
         ▼
┌─────────────────┐
│  Vercel URL     │
│  (Web App)      │
└────────┬────────┘
         │
         │ API Calls
         ▼
┌─────────────────┐
│  Vercel API     │
│  (Serverless)   │
└─────────────────┘
```

### Flow

1. **User launches Electron app**
2. **Electron loads** `https://hr-leave-portal.vercel.app`
3. **Web app runs** in Electron window (looks like native app)
4. **API calls** go to Vercel automatically
5. **All features work** as if it were a native app

---

## 🐛 Troubleshooting

### Issue: App Shows Blank Screen

**Solution:**
1. Check that your Vercel URL is correct
2. Verify the URL is accessible in a browser
3. Check Electron DevTools (View → Toggle Developer Tools)
4. Look for console errors

### Issue: Can't Log In

**Solution:**
1. Verify cookies work (Vercel uses HTTPS, so cookies should work)
2. Check that `NEXT_PUBLIC_APP_URL` is set in Vercel environment variables
3. Check browser console for authentication errors

### Issue: API Calls Fail

**Solution:**
1. Verify `ELECTRON_API_URL` was set during build
2. Check that the URL doesn't have a trailing slash
3. Verify CORS settings (should work automatically with same origin)

### Issue: Build Fails

**Solution:**
1. Make sure `electron` and `electron-builder` are installed:
   ```bash
   npm install --save-dev electron electron-builder
   ```
2. Check that icon files exist (or remove icon config temporarily)
3. Try building without icons first

---

## 🔐 Security Notes

- ✅ **Context Isolation**: Enabled (secure)
- ✅ **Node Integration**: Disabled (secure)
- ✅ **External Links**: Open in default browser
- ✅ **HTTPS Only**: Vercel uses HTTPS (secure cookies)

---

## 📱 Testing

### Test Before Building

1. **Run in development:**
   ```bash
   npm run electron:dev
   ```
   This loads from `localhost:3000`

2. **Test with Vercel URL:**
   - Edit `electron/main.js` temporarily
   - Change `startUrl` to your Vercel URL
   - Run `npm run electron`
   - Test all features

### Test After Building

1. Build the installer
2. Install on a test machine
3. Verify:
   - ✅ App opens correctly
   - ✅ Can log in
   - ✅ All features work
   - ✅ API calls succeed
   - ✅ No console errors

---

## 🚀 Advanced: Auto-Updates

For future enhancement, you can add auto-updates using `electron-updater`:

1. Install: `npm install electron-updater`
2. Configure in `electron/main.js`
3. Host updates on a server/CDN
4. App checks for updates on launch

---

## 📝 Environment Variables

### Build Time

Set these when building:
- `ELECTRON_API_URL` - Your Vercel URL (required)

### Runtime

The app reads from:
- `window.__ELECTRON_API_URL__` (injected by preload script)
- `window.electronAPI.apiUrl` (injected by preload script)

---

## ✅ Checklist

Before distributing:

- [ ] Vercel deployment is live and working
- [ ] Tested login functionality on Vercel
- [ ] Built Electron app with correct URL
- [ ] Tested installer on clean machine
- [ ] Verified all features work
- [ ] Created app icons (optional but recommended)
- [ ] Updated app name/version if needed

---

## 📚 Related Files

- `electron/main.js` - Main Electron process
- `electron/preload.js` - Security bridge
- `lib/api-config.ts` - API URL configuration
- `package.json` - Build configuration

---

## 🎉 You're Done!

Your Electron app is now ready to distribute. Users can install it and it will automatically connect to your Vercel-hosted app.

**Next Steps:**
1. Build the installer
2. Test it
3. Share with your team
4. Collect feedback
5. Iterate and improve!

---

**Last Updated**: 2024  
**Status**: ✅ Ready for Vercel Integration

