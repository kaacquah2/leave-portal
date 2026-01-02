# Electron Auth Architecture Analysis

## ✅ Architecture Verdict: **WILL WORK** with Required Implementation

The proposed architecture is **sound and correct**, but requires several implementation changes to work perfectly. This document outlines what needs to be done.

---

## 🎯 Core Architecture Principles (Verified)

### ✅ 1. Web (Same-Origin, Cookie-Based) - **ALREADY WORKS**

**Current State:**
- ✅ Login route sets httpOnly cookie (`app/api/auth/login/route.ts:284`)
- ✅ `getTokenFromRequest` checks cookies (`lib/auth.ts:103-127`)
- ✅ Web client uses `credentials: 'include'` (`lib/api-config.ts:163`)
- ✅ No CORS issues for same-origin requests

**Status:** ✅ **No changes needed** - this part is already correct.

---

### ⚠️ 2. Backend Token Resolution - **NEEDS FIX**

**Current Implementation:**
```typescript
// lib/auth.ts:103-127
export function getTokenFromRequest(request: Request | NextRequest): string | null {
  // ❌ CURRENT: Checks Bearer first, then cookies
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  // Then checks cookies...
}
```

**Required Change:**
```typescript
// ✅ SHOULD BE: Cookies first (web-first), then Bearer (Electron/mobile)
export function getTokenFromRequest(request: Request | NextRequest): string | null {
  // 1. Check cookies first (web)
  if ('cookies' in request && request.cookies) {
    const tokenCookie = request.cookies.get('token')
    if (tokenCookie?.value) {
      return tokenCookie.value
    }
  }
  
  // 2. Fallback to Bearer token (Electron/mobile)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // 3. Fallback: parse cookies from header string
  const cookies = request.headers.get('cookie')
  if (cookies) {
    const tokenMatch = cookies.match(/token=([^;]+)/)
    if (tokenMatch) {
      return tokenMatch[1]
    }
  }
  
  return null
}
```

**Impact:** ✅ **Low risk** - Simple order swap, maintains backward compatibility.

---

### ⚠️ 3. Electron Main Process API Layer - **NEEDS IMPLEMENTATION**

**Current State:**
- ❌ No API request handlers in Electron main process
- ❌ Renderer makes direct `fetch` calls (causes CORS)
- ❌ No token storage in Electron main process
- ✅ IPC infrastructure exists (`electron/preload.js`)

**Required Implementation:**

#### 3.1 Token Storage (Electron Main Process)

```typescript
// electron/auth-storage.js (NEW FILE)
const { safeStorage } = require('electron');

const TOKEN_KEY = 'auth_token';

function getToken() {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      // Use secure storage if available (macOS Keychain, Windows Credential Manager, Linux Secret Service)
      return safeStorage.decryptString(/* stored encrypted token */);
    } else {
      // Fallback to plain storage (less secure but works)
      // Store in app.getPath('userData') + '/token.json'
    }
  } catch (error) {
    console.error('[Auth] Error getting token:', error);
    return null;
  }
}

function setToken(token) {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(token);
      // Store encrypted token
    } else {
      // Fallback storage
    }
  } catch (error) {
    console.error('[Auth] Error storing token:', error);
  }
}

function clearToken() {
  // Remove stored token
}
```

#### 3.2 API Request Handler (Electron Main Process)

```typescript
// electron/main.js - Add to setupIpcHandlers()
// Use native fetch (available in Electron v28+)
// No import needed - better TLS integration, fewer dependencies

const API_BASE_URL = process.env.ELECTRON_API_URL || 
                    'https://hr-leave-portal.vercel.app';

async function apiRequest(path, options = {}) {
  const token = getToken(); // From secure storage
  
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  
  // Add Bearer token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    // Use native fetch (no import needed in Electron v28+)
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// IPC Handlers
ipcMain.handle('api:request', async (event, path, options) => {
  return await apiRequest(path, options);
});

ipcMain.handle('api:login', async (event, email, password) => {
  const result = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  
  // If login successful, extract and store token
  if (result.ok && result.data.token) {
    setToken(result.data.token);
  }
  
  return result;
});

ipcMain.handle('api:logout', async (event) => {
  await apiRequest('/api/auth/logout', { method: 'POST' });
  clearToken();
  return { success: true };
});

ipcMain.handle('api:getMe', async (event) => {
  return await apiRequest('/api/auth/me');
});
```

#### 3.3 Preload Script Updates

```typescript
// electron/preload.js - Add to contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing code ...
  
  // API methods
  api: {
    request: (path, options) => ipcRenderer.invoke('api:request', path, options),
    login: (email, password) => ipcRenderer.invoke('api:login', email, password),
    logout: () => ipcRenderer.invoke('api:logout'),
    getMe: () => ipcRenderer.invoke('api:getMe'),
  },
});
```

**Impact:** ⚠️ **Medium complexity** - Requires new code but follows Electron best practices.

---

### ⚠️ 4. Login Route - **NEEDS UPDATE**

**Current State:**
```typescript
// app/api/auth/login/route.ts:271
// Token is set in httpOnly cookie, not returned in response
```

**Required Change:**
Login route should return token in response body **only for Bearer token clients** (Electron/mobile), while still setting cookie for web.

```typescript
// app/api/auth/login/route.ts
const response = NextResponse.json({
  success: true,
  user: { /* ... */ },
  // ✅ Return token if client requests it via header
  ...(request.headers.get('x-request-token') === 'true' ? { token } : {}),
});

// Still set cookie for web clients
response.cookies.set('token', token, { /* ... */ });
```

**Alternative (Better):** Check if `Authorization` header is present in request - if so, client is using Bearer tokens and needs token in response.

**Impact:** ✅ **Low risk** - Conditional token return, doesn't break existing web flow.

---

### ⚠️ 5. Client-Side API Routing - **NEEDS IMPLEMENTATION**

**Current State:**
- `lib/api-config.ts` uses `fetch` directly for all clients
- Electron renderer tries to use cookies (won't work)

**Required Change:**
Detect Electron and route through IPC instead of direct fetch.

```typescript
// lib/api-config.ts
export async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  // ✅ Check if we're in Electron
  if (isElectron() && (window as any).electronAPI?.api) {
    // Use Electron IPC
    const result = await (window as any).electronAPI.api.request(endpoint, {
      method: options.method || 'GET',
      body: options.body,
      headers: options.headers,
    });
    
    // Convert to Response-like object
    return new Response(JSON.stringify(result.data), {
      status: result.status,
      ok: result.ok,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // ✅ Web: Use direct fetch with cookies
  return fetch(/* ... existing code ... */);
}
```

**Impact:** ⚠️ **Medium complexity** - Requires conditional routing logic.

---

## 🔍 Potential Issues & Solutions

### Issue 1: Token Storage Persistence
**Problem:** Electron `safeStorage` may not be available on all platforms.

**Solution:** Implement fallback to encrypted file storage using Node.js crypto.

### Issue 2: Session Management
**Problem:** Bearer tokens need to work with existing Prisma session system.

**Solution:** ✅ **Already works** - `getUserFromToken` checks sessions (`lib/auth.ts:81-101`). Bearer tokens are validated against sessions just like cookie tokens.

### Issue 3: Login Flow Detection
**Problem:** How to know if client needs token in response?

**Solution:** 
- Option A: Check for `Authorization` header in login request (if present, client uses Bearer)
- Option B: Check for `x-request-token: true` header
- Option C: Always return token, web clients ignore it (safest)

**Recommendation:** Option C - always return token, web clients can ignore it.

### Issue 4: CORS Headers
**Problem:** Electron main process requests don't need CORS, but current code adds CORS headers.

**Solution:** ✅ **Already handled** - `addCorsHeaders` in `lib/cors.ts` is safe to call for all requests (no-op for same-origin).

---

## ✅ Implementation Checklist

### Backend Changes
- [ ] Swap token resolution order (cookies first, then Bearer) in `lib/auth.ts`
- [ ] Update login route to return token in response body
- [ ] Verify session management works with Bearer tokens (should already work)

### Electron Main Process
- [ ] Create `electron/auth-storage.js` for secure token storage
- [ ] Add API request handler using `node-fetch` or Electron `net` module
- [ ] Add IPC handlers: `api:request`, `api:login`, `api:logout`, `api:getMe`
- [ ] Update `electron/main.js` to initialize auth storage

### Electron Preload
- [ ] Add `api` methods to `contextBridge` in `electron/preload.js`

### Client-Side
- [ ] Update `lib/api-config.ts` to detect Electron and route through IPC
- [ ] Update `lib/auth-client.ts` to use Electron API when available
- [ ] Test web flow still works (should be unchanged)

### Testing
- [ ] Test web login (cookie-based)
- [ ] Test Electron login (Bearer token)
- [ ] Test Electron API calls (no CORS errors)
- [ ] Test offline mode (should still work)
- [ ] Test session expiration (both web and Electron)

---

## 🎯 Final Verdict

**Will this work perfectly?** ✅ **YES**, with the implementation changes above.

**Will it cause errors?** ❌ **NO**, if implemented correctly.

**Key Points:**
1. ✅ Architecture is sound and follows Electron best practices
2. ✅ No CORS issues (main process doesn't enforce CORS)
3. ✅ Security maintained (httpOnly cookies for web, secure storage for Electron)
4. ✅ Backward compatible (web flow unchanged)
5. ⚠️ Requires implementation work (estimated: 4-6 hours)

**Risk Level:** 🟢 **LOW** - Changes are well-defined and follow established patterns.

---

## 📚 References

- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage)
- [Node.js fetch (for main process)](https://nodejs.org/api/globals.html#fetch)

