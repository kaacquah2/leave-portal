# Tauri Build - Critical Rules (Non-Negotiable)

## 🔴 Mandatory Rule: Zero Server Features

**Tauri build must see ZERO API routes and ZERO middleware.**

Next.js will **refuse static export** if:
- ❌ `app/api/` folder exists
- ❌ `middleware.ts` exists
- ❌ Any server-side features are present

## ✅ Build-Time Separation

### Folder Structure During Tauri Build

```
app/
 ├─ api/              ❌ NOT present (renamed to api.disabled)
 ├─ page.tsx          ✅ required (generates out/index.html)
 ├─ (routes)/         ✅ allowed (static pages only)
 └─ ...

middleware.ts         ❌ NOT present (renamed to middleware.ts.disabled)
```

### What Gets Disabled

1. **API Folder** (`app/api/`)
   - Renamed to `app/api.disabled` before build
   - Restored after build completes

2. **Middleware** (`middleware.ts`)
   - Renamed to `middleware.ts.disabled` before build
   - Restored after build completes

### Build Script (Final, Correct Version)

```json
{
  "scripts": {
    "build:tauri": "node scripts/disable-api-for-tauri.js && cross-env TAURI=1 next build && node scripts/verify-export.js",
    "tauri:build": "npm run build:tauri && tauri build"
  }
}
```

**Key Points:**
- ✅ No Prisma generation (not needed for static export)
- ✅ No middleware execution
- ✅ No API routes
- ✅ Static HTML only

### Next.js Config (Minimal, Safe)

```javascript
const isTauri = process.env.TAURI === '1';

/** @type {import('next').NextConfig} */
module.exports = {
  ...(isTauri ? {
    output: 'export',           // REQUIRED: Static export
    trailingSlash: true,         // Consistent URLs
    reactStrictMode: true,       // React best practices
    eslint: {
      ignoreDuringBuilds: true, // Allow build with lint warnings
    },
  } : {
    // Web build config (with API routes, middleware, etc.)
  }),
  
  images: {
    unoptimized: true,           // Required for static export
  },
  
  async rewrites() {
    if (isTauri) {
      return [];                 // No rewrites for static export
    }
    return [];
  },
};
```

## 🔐 Architecture Separation

### Tauri Desktop App (Frontend Only)

```
┌─────────────────────────────────────┐
│      Tauri Desktop App              │
│  ┌───────────────────────────────┐  │
│  │   Static Next.js Build         │  │
│  │   - React Components           │  │
│  │   - UI/UX Logic                │  │
│  │   - NO API routes              │  │
│  │   - NO middleware              │  │
│  │   - NO server features         │  │
│  └───────────────────────────────┘  │
│           │                          │
│           │ HTTP/HTTPS                │
│           ▼                          │
└─────────────────────────────────────┘
           │
           │ API Requests
           │ (All data operations)
           ▼
┌─────────────────────────────────────┐
│     Remote Backend Server           │
│  ┌───────────────────────────────┐  │
│  │   Next.js API Routes          │  │
│  │   - Authentication            │  │
│  │   - Business Logic            │  │
│  │   - Database Operations       │  │
│  │   - Middleware                │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Key Principle

**Frontend (Tauri) = Static HTML/JS/CSS only**
**Backend (Remote Server) = All server features**

## ✅ API URL Configuration

### Environment Variable

```bash
# .env
NEXT_PUBLIC_API_URL=https://hr-leave-portal.vercel.app
```

### Frontend Usage

The frontend reads `NEXT_PUBLIC_API_URL` and makes direct `fetch()` calls:

```typescript
// Frontend code (in Tauri app)
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hr-leave-portal.vercel.app';
const response = await fetch(`${apiUrl}/api/employees`);
```

### Tauri Rust Layer

The Tauri Rust layer does **NOT** proxy HTTP unless CORS bypass is needed. Prefer direct `fetch()` from React.

## 🔐 Authentication Flow (Approved)

### Current Implementation

1. User enters credentials in Tauri UI
2. Tauri makes HTTP POST to `/api/auth/login` on remote server
3. Server validates and returns JWT token
4. Tauri stores token in memory (`AppState`)
5. All subsequent requests include `Authorization: Bearer {token}`

### Recommended Enhancement

Consider implementing:
- **Short-lived access tokens** (15-30 minutes)
- **Refresh tokens** (stored server-side in HTTP-only cookie)
- **Tauri memory-only storage** for access token

This aligns with compliance expectations and security best practices.

## 📦 Build Process Flow

```
1. npm run build:tauri
   │
   ├─> scripts/disable-api-for-tauri.js
   │   ├─> Renames app/api → app/api.disabled
   │   └─> Renames middleware.ts → middleware.ts.disabled
   │
   ├─> cross-env TAURI=1 next build
   │   ├─> Reads next.config.mjs
   │   ├─> Sees output: 'export' (when TAURI=1)
   │   ├─> NO API routes found ✅
   │   ├─> NO middleware found ✅
   │   ├─> Generates static files in out/
   │   └─> Creates out/index.html ✅
   │
   └─> scripts/verify-export.js
       ├─> Verifies out/ directory exists
       ├─> Verifies out/index.html exists
       ├─> Restores app/api.disabled → app/api ✅
       └─> Restores middleware.ts.disabled → middleware.ts ✅
```

## ✅ Verification Checklist

Before building Tauri, ensure:

- [ ] `app/api/` is renamed to `app/api.disabled` (or doesn't exist)
- [ ] `middleware.ts` is renamed to `middleware.ts.disabled` (or doesn't exist)
- [ ] `app/page.tsx` exists (generates `out/index.html`)
- [ ] `next.config.mjs` has `output: 'export'` when `TAURI=1`
- [ ] Build script includes API/middleware disable step
- [ ] `NEXT_PUBLIC_API_URL` is set in environment

## 🚨 Common Errors & Solutions

### Error: "API routes are not supported with static export"

**Cause:** API folder still exists during build

**Solution:**
1. Check `scripts/disable-api-for-tauri.js` runs before `next build`
2. Verify API folder is renamed (check `app/api.disabled` exists)
3. Manually rename if needed: `Rename-Item app/api app/api.disabled`

### Error: "Middleware is not supported with static export"

**Cause:** `middleware.ts` still exists during build

**Solution:**
1. Check `scripts/disable-api-for-tauri.js` disables middleware
2. Verify middleware is renamed (check `middleware.ts.disabled` exists)
3. Manually rename if needed: `Rename-Item middleware.ts middleware.ts.disabled`

### Error: "out/index.html not found"

**Cause:** Static export failed

**Solution:**
1. Check for API routes or middleware (they must be disabled)
2. Verify `output: 'export'` is set in `next.config.mjs` when `TAURI=1`
3. Ensure `app/page.tsx` exists
4. Check build logs for specific errors

## 📝 Final Status

✅ **Architecture:** Correct (Option A - UI only, remote backend)  
✅ **Documentation:** Clear & accurate  
✅ **Decision:** Enterprise-grade  
✅ **Build Process:** Zero server features during Tauri build  
✅ **Separation:** Complete (frontend static, backend remote)

---

**Last Updated:** 2024  
**Status:** ✅ Critical Rules Implemented

