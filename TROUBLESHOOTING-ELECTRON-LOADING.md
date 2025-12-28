# Troubleshooting: Electron App Stuck on Loading

## Quick Fix

The app is stuck because it's trying to load from the remote URL. Here's how to fix it:

### Step 1: Rebuild with Proper API URL Embedding

The build script now embeds the API URL directly in the preload script. Rebuild:

```powershell
$env:ELECTRON_API_URL="https://hr-leave-portal.vercel.app"
npm run electron:build:win
```

### Step 2: Enable DevTools for Debugging

To see what's happening, you can enable DevTools:

**Option A: Modify electron/main.js temporarily**
```javascript
// Change line 69 from:
if (isDev) {
  mainWindow.webContents.openDevTools();
}
// To:
mainWindow.webContents.openDevTools(); // Always show
```

**Option B: Set environment variable**
```powershell
$env:ENABLE_DEVTOOLS="true"
npm run electron:build:win
```

### Step 3: Check What's Happening

After rebuilding and installing:
1. Open the app
2. Press `Ctrl+Shift+I` to open DevTools
3. Check the Console tab for errors
4. Check the Network tab to see if requests are failing
5. Check if the page is actually loading

## Common Issues

### Issue 1: Vercel URL Not Accessible
**Symptom**: Network errors in console
**Solution**: 
- Verify https://hr-leave-portal.vercel.app loads in a browser
- Check internet connection
- Check firewall settings

### Issue 2: CORS Errors
**Symptom**: CORS errors in console
**Solution**: 
- Vercel should handle CORS automatically
- Check Vercel deployment settings
- Verify API routes are deployed

### Issue 3: Page Loads But Stuck
**Symptom**: Page loads but stays on "Loading..."
**Solution**:
- Check Console for JavaScript errors
- Check if `/api/auth/me` is being called
- Check if the API is responding

### Issue 4: API URL Not Set
**Symptom**: API calls fail with "network error"
**Solution**:
- Rebuild with `ELECTRON_API_URL` set
- Check preload script has the URL embedded
- Verify `window.__ELECTRON_API_URL__` is set in console

## Diagnostic Commands

In DevTools Console, run:

```javascript
// 1. Check API URL
console.log('API URL:', window.__ELECTRON_API_URL__ || window.electronAPI?.apiUrl);

// 2. Check current location
console.log('Location:', window.location.href);

// 3. Test API connection
fetch((window.__ELECTRON_API_URL__ || '') + '/api/monitoring/health')
  .then(r => r.json())
  .then(data => console.log('API Response:', data))
  .catch(err => console.error('API Error:', err));

// 4. Check if Electron
console.log('Is Electron:', !!(window.electronAPI || window.__ELECTRON_API_URL__));
```

## Expected Console Output

If everything is working, you should see:
```
[Preload] Electron API URL configured: https://hr-leave-portal.vercel.app
Electron preload script loaded
[Electron] Loading from remote URL: https://hr-leave-portal.vercel.app
```

## If Still Not Working

1. **Check Vercel Deployment**:
   - Go to https://hr-leave-portal.vercel.app in a browser
   - If it doesn't load, the deployment has issues
   - Check Vercel dashboard for deployment status

2. **Try Development Mode**:
   ```powershell
   npm run electron:dev
   ```
   This loads from localhost:3000 and should work if your dev server is running.

3. **Check Build Logs**:
   - Look for "Embedding API URL" message in build output
   - Verify the API URL is being embedded

4. **Contact Support**:
   - Share the console errors
   - Share the network tab screenshots
   - Share the build logs

---

**Most Likely Fix**: Rebuild with the updated build script that embeds the API URL.

