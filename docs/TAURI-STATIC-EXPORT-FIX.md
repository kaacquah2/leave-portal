# Tauri Static Export Fix

## Problem
- `next build` succeeded but `out/index.html` doesn't exist
- Static export didn't complete during build
- API routes were preventing static export

## Solution Applied

### 1. Next.js Configuration (`next.config.mjs`)
- ✅ Set `output: 'export'` when `TAURI=1` (already present)
- ✅ Added `experimental.appDir: true` for App Router support
- ✅ Removed webpack config that tried to exclude API routes (Next.js handles this automatically)
- ✅ API routes in `app/api` are automatically ignored during static export when `output: 'export'` is set

### 2. Build Script (`package.json`)
- ✅ Current script: `build:tauri` runs `next build --webpack` which should automatically export when `output: 'export'` is set
- ✅ Verification script checks for `out/index.html` after build
- ⚠️ **Note**: In Next.js 13+, `next export` is deprecated. Export happens automatically during `next build` when `output: 'export'` is set.

### 3. API Configuration (`lib/api-config.ts`)
- ✅ Updated to use remote API URL in Tauri builds
- ✅ Falls back to environment variable `NEXT_PUBLIC_API_URL`
- ✅ Supports Tauri-injected API URL via `window.__TAURI_API_URL__`
- ✅ In Tauri static builds, all API calls go to remote server (not `/api/*`)

## How It Works

### Build Process
1. `TAURI=1` environment variable is set
2. `next.config.mjs` detects `TAURI=1` and sets `output: 'export'`
3. `next build --webpack` runs:
   - Builds the application
   - **Automatically exports static files to `out/` directory** (this is the key!)
   - API routes in `app/api` are automatically ignored
4. `verify-export.js` checks that `out/index.html` exists

### Runtime (Tauri)
- Frontend is served from static files in `out/` directory
- All API calls go to remote server (configured via `NEXT_PUBLIC_API_URL` or Tauri backend)
- No local API routes are available (they're not in the static export)

## Verification

After running `npm run build:tauri`, verify:

```bash
# Check that out directory exists
ls out/

# Check that index.html exists
ls out/index.html

# Check that _next directory exists (contains JS/CSS bundles)
ls out/_next/
```

## Troubleshooting

### If `out/index.html` still doesn't exist:

1. **Check for dynamic routes**: All routes must be static. Check build output for routes marked with `ƒ` (dynamic):
   ```bash
   npm run build:tauri 2>&1 | grep "ƒ"
   ```
   All routes should show `○` (static), not `ƒ` (dynamic).

2. **Check for API route imports**: Ensure no client code imports from `app/api`:
   ```bash
   grep -r "from.*app/api" app/
   ```

3. **Verify Next.js version**: Should be 13+ (you have 16.1.0 ✅)

4. **Check build logs**: Look for errors during the export phase:
   ```bash
   npm run build:tauri 2>&1 | grep -i "export\|error"
   ```

## Environment Variables

For Tauri builds, set the remote API URL:

```bash
# In .env or build script
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

Or configure in Tauri backend to inject via `window.__TAURI_API_URL__`.

## Key Points

1. ✅ `next build` with `output: 'export'` automatically exports (no separate `next export` needed in Next.js 13+)
2. ✅ API routes are automatically ignored during static export
3. ✅ All API calls in Tauri must go to remote server
4. ✅ Frontend is fully static and served from `out/` directory

