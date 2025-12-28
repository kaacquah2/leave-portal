# Electron App Stuck on Loading - Fix Guide

## Problem
After installing the `.exe`, the app only shows "Loading..." and doesn't proceed.

## Root Cause
The Electron app is loading from `https://hr-leave-portal.vercel.app`, but:
1. The page might be taking time to load
2. The API URL might not be properly embedded
3. There might be network/CORS issues
4. The page might be waiting for something that never completes

## Solutions Applied

### 1. ✅ Embed API URL in Preload Script
- Modified `scripts/build-electron.js` to embed the API URL directly in the preload script
- This ensures the API URL is available at runtime

### 2. ✅ Improved Error Handling
- Added timeout handling in `electron/main.js`
- Added better error messages if page fails to load
- Added 30-second timeout warning

### 3. ✅ Improved Loading States
- Enhanced loading indicator in `app/page.tsx`
- Added better timeout handling for remote URLs
- Added connection status messages

## Next Steps

### Option 1: Rebuild with Embedded API URL (Recommended)

```powershell
# Rebuild the app with the API URL embedded
$env:ELECTRON_API_URL="https://hr-leave-portal.vercel.app"
npm run electron:build:win
```

This will:
- Embed the API URL in the preload script
- Ensure the app knows where to connect
- Improve loading reliability

### Option 2: Check Vercel Deployment

1. **Verify Vercel is deployed**:
   - Go to https://hr-leave-portal.vercel.app
   - Check if the page loads in a browser
   - If it doesn't load, the deployment might have issues

2. **Check Console Logs**:
   - In the Electron app, press `Ctrl+Shift+I` to open DevTools
   - Check the Console tab for errors
   - Check the Network tab for failed requests

### Option 3: Test with DevTools

1. **Enable DevTools in Production**:
   - Temporarily modify `electron/main.js` to always show DevTools:
   ```javascript
   // In createWindow function, change:
   if (isDev) {
     mainWindow.webContents.openDevTools();
   }
   // To:
   mainWindow.webContents.openDevTools(); // Always show for debugging
   ```

2. **Rebuild and check**:
   - Look for JavaScript errors
   - Check network requests
   - See what's blocking the load

### Option 4: Use Local Files Instead

If the remote URL continues to have issues, you can build with local files:

```powershell
# Build without ELECTRON_API_URL (uses local files)
npm run electron:build:win
```

**Note**: This requires the API to be accessible, which won't work with static files. You'd need to bundle a server.

## Quick Diagnostic

Run this in the installed app's console (Ctrl+Shift+I):

```javascript
// Check if API URL is set
console.log('API URL:', window.__ELECTRON_API_URL__ || window.electronAPI?.apiUrl);

// Check current URL
console.log('Current URL:', window.location.href);

// Check if page is loaded
console.log('Document ready:', document.readyState);

// Try a simple API call
fetch('/api/monitoring/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

## Expected Behavior

After the fixes:
1. App should show "Loading HR Leave Portal..." with spinner
2. Should connect to Vercel URL
3. Should load the login page or portal (if already logged in)
4. Should not get stuck on loading

## If Still Stuck

1. **Check Vercel Status**: Ensure https://hr-leave-portal.vercel.app is accessible
2. **Check Network**: Ensure internet connection is working
3. **Check Firewall**: Ensure firewall isn't blocking the connection
4. **Check Console**: Open DevTools and check for errors
5. **Try Browser**: Open https://hr-leave-portal.vercel.app in a browser to verify it works

---

**After applying fixes, rebuild the app and test again.**

