# Electron Chunk Loading Fix

## Problem

JavaScript chunks were failing to load with errors like:
```
Failed to load resource: net::ERR_FILE_NOT_FOUND
file:///C:/_next/static/chunks/433-818a255f1180ee3f.js
```

## Root Cause

When Next.js builds static files, it generates absolute paths (starting with `/`) for JavaScript chunks. When Electron loads these files using the `file://` protocol, these absolute paths resolve incorrectly, causing chunk loading failures.

## Solution

Updated `scripts/fix-electron-paths.js` to:

1. **Fix paths in HTML files** - Converts `/` paths to `./` relative paths
2. **Fix paths in JavaScript files** - Processes all `.js` files in `_next/static/` directory
3. **Fix webpack publicPath** - Updates `__webpack_require__.p` references
4. **Fix dynamic imports** - Handles chunk loading patterns
5. **Fix JSON manifest files** - Processes build manifest files

## Changes Made

### Path Fixing Script (`scripts/fix-electron-paths.js`)

**Added:**
- Recursive directory processing for JavaScript files
- Webpack publicPath fixing (`__webpack_require__.p`)
- Dynamic import path fixing
- JSON file processing

**Patterns Fixed:**
- `"/_next/static/..."` → `"./_next/static/..."`
- `__webpack_require__.p + "/_next/static/..."` → `__webpack_require__.p + "./_next/static/..."`
- `__webpack_require__.p = "/_next/static/..."` → `__webpack_require__.p = "./_next/static/..."`

## Build Process

The path fixing now happens automatically during the build:

1. Next.js builds static files to `out/` folder
2. Path fixing script processes:
   - `out/index.html` (HTML paths)
   - `out/_next/static/**/*.js` (JavaScript chunks)
   - `out/_next/static/**/*.json` (Manifest files)
3. All absolute paths converted to relative paths
4. Files ready for Electron `file://` protocol

## Verification

After building, check:
- ✅ No chunk loading errors in console
- ✅ All JavaScript files load correctly
- ✅ App functions normally
- ✅ No `ERR_FILE_NOT_FOUND` errors

## Testing

1. Build the Electron app:
   ```bash
   npm run electron:build:win
   ```

2. Install and run the .exe

3. Check browser console (DevTools) - should see no chunk loading errors

4. Verify all pages load correctly

## Expected Behavior

- ✅ All JavaScript chunks load successfully
- ✅ No `ERR_FILE_NOT_FOUND` errors
- ✅ App works offline
- ✅ All features function correctly

---

**Fix Applied:** Path fixing script now processes all JavaScript files recursively, fixing webpack chunk loading paths for Electron's `file://` protocol.

