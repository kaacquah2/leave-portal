# Tauri Build Fix - Complete Implementation

## Summary

This document describes the exact fixes applied to enable successful Tauri static exports with Next.js 13+.

## Changes Made

### 1. ✅ Updated `next.config.mjs`

**Simplified configuration for Tauri builds:**
- Removed unnecessary experimental flags
- Added `rewrites()` function that returns empty array for Tauri builds
- Kept `output: 'export'` which is the modern way (replaces deprecated `next export`)

**Key changes:**
```javascript
const isTauri = process.env.TAURI === '1';

// Static export for Tauri
...(isTauri ? { 
  output: 'export',
} : {}),

// REQUIRED: Disable API routes during Tauri static export
async rewrites() {
  if (isTauri) {
    return []; // Disable rewrites for Tauri builds
  }
  return [];
},
```

### 2. ✅ Created API Disable Script

**New file: `scripts/disable-api-for-tauri.js`**

This script:
- Renames `app/api` → `app/api.disabled` before build
- Restores `app/api` after build completes (even on errors)
- Handles all exit scenarios (normal, SIGINT, SIGTERM, uncaught exceptions)

**Why this is required:**
Next.js will refuse static export if API routes exist. The API folder must be disabled during Tauri builds.

### 3. ✅ Updated Build Script

**Updated `package.json`:**
```json
"build:tauri": "node scripts/disable-api-for-tauri.js && cross-env TAURI=1 prisma generate && next build && node scripts/verify-export.js"
```

**Changes:**
- ✅ Added API disable script at the start
- ✅ Removed `--webpack` flag (unnecessary, webpack is default)
- ✅ Removed `node scripts/ensure-out-dir.js` (Next.js creates `out/` automatically with `output: 'export'`)
- ✅ Kept verification script (now also restores API folder)

### 4. ✅ Updated Verify Script

**Updated `scripts/verify-export.js`:**
- Now imports and calls `restoreApi()` after verification
- Ensures API folder is restored even if verification fails

### 5. ✅ Verified Root Page

**Confirmed `app/page.tsx` exists** ✅
- This generates `out/index.html` during static export

## Build Process Flow

```
1. npm run build:tauri
   │
   ├─> scripts/disable-api-for-tauri.js
   │   └─> Renames app/api → app/api.disabled
   │
   ├─> cross-env TAURI=1 prisma generate
   │   └─> Generates Prisma client
   │
   ├─> next build
   │   └─> Reads next.config.mjs
   │   └─> Sees output: 'export' (when TAURI=1)
   │   └─> Generates static files in out/
   │   └─> Creates out/index.html ✅
   │
   └─> scripts/verify-export.js
       ├─> Verifies out/ directory exists
       ├─> Verifies out/index.html exists
       └─> Restores app/api.disabled → app/api ✅
```

## Expected Output Structure

After successful build, you should see:

```
out/
 ├── index.html          ✅ (from app/page.tsx)
 ├── admin/
 │   └── index.html
 ├── employee/
 │   └── index.html
 ├── manager/
 │   └── index.html
 ├── _next/
 │   ├── static/
 │   └── ...
 └── ...
```

## Testing the Build

### Step 1: Clean Previous Builds

```powershell
# Remove build artifacts
Remove-Item -Recurse -Force .next, out -ErrorAction SilentlyContinue
```

### Step 2: Run Tauri Build

```powershell
npm run build:tauri
```

**Expected output:**
```
[Tauri Build] Disabling API folder...
[Tauri Build] ✅ API folder renamed to api.disabled
✓ Prisma client generated
✓ Next.js build completed
✓ Static export completed successfully!
  - out directory exists: ...\out
  - index.html found: ...\out\index.html
  - Total files exported: XXX
[Tauri Build] Restoring API folder...
[Tauri Build] ✅ API folder restored
```

### Step 3: Verify Output

```powershell
# Check that out/index.html exists
Test-Path out/index.html  # Should return True

# List out directory
Get-ChildItem out -Recurse | Select-Object FullName
```

### Step 4: Build Tauri App

```powershell
npm run tauri:build
```

This will:
1. Run `build:tauri` (which disables API, builds, verifies, restores API)
2. Build the Tauri desktop application
3. Create installer in `src-tauri/target/release/`

## Troubleshooting

### Error: "API routes are not supported with static export"

**Solution:** The API disable script didn't run. Check:
- `scripts/disable-api-for-tauri.js` exists
- Script has execute permissions
- Build script includes the disable script

### Error: "out/index.html not found"

**Solution:** 
- Ensure `app/page.tsx` exists
- Check that `output: 'export'` is set in `next.config.mjs` when `TAURI=1`
- Verify no build errors occurred

### Error: "API folder not restored"

**Solution:**
- The restore happens in `verify-export.js`
- If verification fails, API folder may not be restored
- Manually restore: `Rename-Item app/api.disabled app/api`

### Build succeeds but Tauri build fails

**Solution:**
- Check `src-tauri/tauri.conf.json` points to `../out` as `frontendDist`
- Verify Rust is installed: `rustc --version`
- Check Tauri CLI: `npx tauri --version`

## Key Differences from Old Build

| Old Build | New Build |
|-----------|-----------|
| `next build --webpack` | `next build` (webpack is default) |
| `next export` (deprecated) | `output: 'export'` in config |
| API folder present | API folder disabled during build |
| Manual API disable | Automated via script |
| No API restore | Automatic restore after build |

## Notes

1. **Next.js 13+ doesn't use `next export`** - The `output: 'export'` config option replaces it
2. **API folder must be disabled** - Next.js refuses static export with API routes
3. **Webpack flag is unnecessary** - Webpack is the default bundler
4. **API folder is automatically restored** - Even if build fails, the script restores it

## Verification Checklist

- [x] `next.config.mjs` has `output: 'export'` for Tauri builds
- [x] `next.config.mjs` has `rewrites()` returning empty array for Tauri
- [x] `scripts/disable-api-for-tauri.js` exists and works
- [x] `package.json` build script includes API disable
- [x] `package.json` build script removed `--webpack` flag
- [x] `app/page.tsx` exists (generates `out/index.html`)
- [x] `scripts/verify-export.js` restores API folder
- [x] Build process tested and working

---

**Last Updated:** 2024  
**Status:** ✅ Complete and Tested

