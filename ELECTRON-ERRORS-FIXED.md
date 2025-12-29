# Electron App Errors - Fixed

## Issues Reported

1. **Vercel Web Analytics Script Error**
   - Error: `Failed to load resource: net::ERR_FILE_NOT_FOUND` for `/_vercel/insights/script.js`
   - Error: `[Vercel Web Analytics] Failed to load script from /_vercel/insights/script.js`

2. **Logo Not Displaying**
   - Error: `mofa-logo.png:1 Failed to load resource: net::ERR_FILE_NOT_FOUND`
   - Logo not showing in the .exe file

3. **Authentication 401 Error**
   - Error: `hr-leave-portal.vercel.app/api/auth/me:1 Failed to load resource: the server responded with a status of 401`
   - This is expected behavior when user is not logged in, but should be handled gracefully

---

## Fixes Applied

### 1. ✅ Vercel Analytics - Conditional Loading

**Problem**: Vercel Analytics tries to load scripts from `/_vercel/insights/script.js`, which doesn't exist in Electron builds and causes errors.

**Solution**: Created a conditional wrapper component that only loads Analytics when NOT running in Electron.

**Files Changed**:
- `app/layout.tsx` - Updated to use `ConditionalAnalytics` component
- `components/conditional-analytics.tsx` - New component that detects Electron and conditionally renders Analytics

**How it works**:
- The component checks if `window.electronAPI` or `window.__ELECTRON_API_URL__` exists
- If in Electron, Analytics is not rendered (prevents script loading errors)
- If in web browser, Analytics loads normally

### 2. ✅ Logo Path Fixes

**Problem**: Logo file (`mofa-logo.png`) not loading in Electron app when using `file://` protocol.

**Solution**: 
- Updated path fixing script to handle image paths
- Added verification step in build process to ensure logo is copied

**Files Changed**:
- `scripts/fix-electron-paths.js` - Added image path fixing for public folder assets
- `scripts/build-electron.js` - Added logo file verification step

**How it works**:
- Next.js static export automatically copies files from `public/` to `out/`
- The path fixing script converts absolute paths (starting with `/`) to relative paths (starting with `./`)
- This ensures images work correctly with the `file://` protocol in Electron

### 3. ✅ Build Verification

**Added**: Logo file verification in build process to catch missing assets early.

**How it works**:
- After Next.js build, the script checks if `mofa-logo.png` exists in `out/` directory
- If missing, shows a warning message
- Helps identify build issues before packaging

---

## Testing

### To Verify Fixes:

1. **Rebuild the Electron app**:
   ```bash
   npm run electron:build:win
   ```

2. **Check build output**:
   - Look for "✅ Logo file (mofa-logo.png) found in build output" message
   - Verify no Analytics script errors in console

3. **Test the .exe**:
   - Install and run the built .exe file
   - Check browser console (DevTools) for errors
   - Verify logo displays correctly
   - Verify no Analytics script loading errors

---

## Expected Behavior After Fixes

### ✅ What Should Work:

1. **No Analytics Errors**: 
   - No `/_vercel/insights/script.js` errors in console
   - Analytics only loads in web browser, not in Electron

2. **Logo Displays**:
   - Logo should appear in:
     - Login form
     - Header
     - Landing page
     - Reset password page

3. **Authentication**:
   - 401 errors are expected when not logged in
   - App should show landing page or login form
   - No console errors for expected 401 responses

---

## Notes

### Authentication 401 Error

The 401 error for `/api/auth/me` is **expected behavior** when:
- User is not logged in
- Session has expired
- No authentication token exists

The app should handle this gracefully by:
- Showing the landing page
- Displaying login form
- Not showing error messages to the user

If you see `[App] No authentication found, showing landing page` in the console, this is the correct behavior.

### Logo File Location

The logo file should be at:
- **Source**: `public/mofa-logo.png`
- **Build output**: `out/mofa-logo.png`
- **Electron package**: Included in `out/**/*` which is unpacked from ASAR

If the logo still doesn't display:
1. Verify `public/mofa-logo.png` exists
2. Rebuild the app: `npm run electron:build:win`
3. Check build output for logo verification message
4. Verify `out/mofa-logo.png` exists after build

---

## Summary

✅ **Vercel Analytics**: Fixed - Only loads in web browser, not in Electron
✅ **Logo Display**: Fixed - Paths corrected for Electron file:// protocol
✅ **Build Verification**: Added - Checks for logo file during build

All reported errors should now be resolved. Rebuild the Electron app to apply the fixes.

