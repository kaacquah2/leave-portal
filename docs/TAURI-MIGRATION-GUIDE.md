# Electron → Tauri Migration Guide

## Overview

This guide provides a comprehensive roadmap for migrating the HR Leave Portal from Electron to Tauri. Tauri offers significant advantages including smaller bundle sizes, better security, and improved performance.

---

## Architecture Comparison

### Current Architecture (Electron)

```
┌─────────────────────────────────────┐
│     Next.js (React/TypeScript)      │
│         Web Application              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Electron Main Process (Node.js)   │
│  - main.js                          │
│  - IPC Handlers                     │
│  - Database (SQLite via sql.js)     │
│  - File System Access               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Electron Renderer (Chromium)      │
│  - preload.js (contextBridge)       │
│  - window.electronAPI                │
│  - IPC Communication                │
└─────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Desktop Application             │
│   Bundle Size: ~150-200 MB           │
└─────────────────────────────────────┘
```

### Target Architecture (Tauri)

```
┌─────────────────────────────────────┐
│   Next.js Static Export (out/)       │
│         Static HTML/CSS/JS           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Tauri Core (Rust)              │
│  - src-tauri/src/main.rs            │
│  - Tauri Commands (Rust functions)  │
│  - Database (Rusqlite)              │
│  - File System (Rust std::fs)       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   OS Native WebView                 │
│  - Windows: Edge WebView2            │
│  - macOS: WKWebView                  │
│  - Linux: WebKitGTK                  │
└─────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Desktop Application             │
│   Bundle Size: ~5-15 MB              │
└─────────────────────────────────────┘
```

---

## Key Differences

| Feature | Electron | Tauri |
|---------|----------|-------|
| **Main Process** | Node.js (JavaScript) | Rust |
| **Preload Script** | `preload.js` (contextBridge) | Tauri Commands (Rust) |
| **IPC** | `ipcRenderer.invoke()` | `invoke('command-name')` |
| **Bundle Size** | ~150-200 MB | ~5-15 MB |
| **Memory Usage** | High (Chromium) | Low (OS WebView) |
| **Security** | Context isolation | Built-in security |
| **Database** | sql.js (JavaScript) | rusqlite (Rust) |
| **File System** | Node.js `fs` | Rust `std::fs` |
| **Auto-update** | electron-updater | Tauri Updater |

---

## Migration Steps

### Phase 1: Setup Tauri Project

#### 1.1 Install Tauri CLI

```bash
npm install -D @tauri-apps/cli
# or
cargo install tauri-cli
```

#### 1.2 Initialize Tauri

```bash
npm run tauri init
```

This will:
- Create `src-tauri/` directory
- Generate `Cargo.toml` (Rust dependencies)
- Create `src-tauri/src/main.rs` (main entry point)
- Create `src-tauri/tauri.conf.json` (configuration)

#### 1.3 Update package.json

Add Tauri scripts:

```json
{
  "scripts": {
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

---

### Phase 2: Configure Next.js for Static Export

#### 2.1 Update next.config.mjs

```javascript
const nextConfig = {
  // Static export for Tauri (same as Electron)
  output: process.env.TAURI === '1' ? 'export' : undefined,
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  // ... rest of config
}
```

#### 2.2 Update Build Scripts

```json
{
  "scripts": {
    "build": "node scripts/assert-static-safe.js && prisma generate && next build --webpack",
    "build:tauri": "cross-env TAURI=1 npm run build",
    "tauri:dev": "cross-env TAURI=1 npm run dev & tauri dev",
    "tauri:build": "npm run build:tauri && tauri build"
  }
}
```

---

### Phase 3: Migrate IPC Communication

#### 3.1 Electron IPC → Tauri Commands

**Electron (preload.js):**
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
});
```

**Tauri (src-tauri/src/main.rs):**
```rust
use tauri::Manager;

#[tauri::command]
fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn send_message(message: String) -> Result<String, String> {
    Ok(format!("Received: {}", message))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_version, send_message])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Frontend (TypeScript):**
```typescript
import { invoke } from '@tauri-apps/api/tauri';

// Replace window.electronAPI.getVersion()
const version = await invoke<string>('get_version');

// Replace window.electronAPI.sendMessage()
const response = await invoke<string>('send_message', { message: 'Hello' });
```

#### 3.2 Create Tauri API Wrapper

Create `lib/tauri-api.ts`:

```typescript
import { invoke } from '@tauri-apps/api/tauri';

/**
 * Tauri API wrapper (replacement for window.electronAPI)
 */
export const tauriAPI = {
  // Platform info
  platform: async () => await invoke<string>('get_platform'),
  
  // Version
  getVersion: async () => await invoke<string>('get_version'),
  
  // Messages
  sendMessage: async (message: string) => 
    await invoke<string>('send_message', { message }),
  
  // API requests (migrate from ipc-handlers.js)
  apiRequest: async (path: string, options?: any) =>
    await invoke<any>('api_request', { path, options }),
  
  // Login
  login: async (email: string, password: string) =>
    await invoke<any>('api_login', { email, password }),
  
  // Logout
  logout: async () => await invoke<void>('api_logout'),
  
  // Get current user
  getMe: async () => await invoke<any>('api_get_me'),
  
  // Repository operations (migrate from ipc-repository-handlers.js)
  repository: {
    employees: {
      findAll: async (filters?: any) =>
        await invoke<any>('repo_employees_find_all', { filters }),
    },
    leaveRequests: {
      create: async (data: any) =>
        await invoke<any>('repo_leave_requests_create', { data }),
    },
    // ... more repository methods
  },
};
```

---

### Phase 4: Migrate Database Operations

#### 4.1 Electron (sql.js) → Tauri (rusqlite)

**Electron (database-encrypted.js):**
```javascript
const Database = require('./sqlite-adapter');
const db = await Database.initSQL();
```

**Tauri (src-tauri/src/database.rs):**
```rust
use rusqlite::{Connection, Result};
use std::path::PathBuf;
use tauri::api::path::app_data_dir;
use tauri::Config;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(config: &Config) -> Result<Self> {
        let app_data = app_data_dir(config)
            .ok_or_else(|| rusqlite::Error::InvalidPath)?;
        std::fs::create_dir_all(&app_data)?;
        
        let db_path = app_data.join("hr-portal-encrypted.db");
        let conn = Connection::open(&db_path)?;
        
        // Initialize schema
        conn.execute(
            "CREATE TABLE IF NOT EXISTS employees (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL
            )",
            [],
        )?;
        
        Ok(Database { conn })
    }
    
    pub fn get_connection(&self) -> &Connection {
        &self.conn
    }
}
```

#### 4.2 Create Tauri Commands for Database

**src-tauri/src/commands/database.rs:**
```rust
use crate::database::Database;
use rusqlite::Result;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Employee {
    id: String,
    name: String,
    email: String,
}

#[tauri::command]
pub fn get_employees(state: tauri::State<Database>) -> Result<Vec<Employee>, String> {
    let conn = state.get_connection();
    let mut stmt = conn.prepare("SELECT id, name, email FROM employees")
        .map_err(|e| e.to_string())?;
    
    let employees = stmt.query_map([], |row| {
        Ok(Employee {
            id: row.get(0)?,
            name: row.get(1)?,
            email: row.get(2)?,
        })
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    
    Ok(employees)
}
```

---

### Phase 5: Migrate File System Operations

#### 5.1 Electron → Tauri File System

**Electron:**
```javascript
const fs = require('fs');
const path = require('path');
const filePath = path.join(app.getPath('documents'), 'file.txt');
fs.writeFileSync(filePath, data);
```

**Tauri:**
```rust
use tauri::api::path::{app_data_dir, documents_dir};
use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn save_document(file_name: String, file_data: Vec<u8>) -> Result<String, String> {
    let documents = documents_dir()
        .ok_or_else(|| "Could not get documents directory".to_string())?;
    let file_path = documents.join("HR Leave Portal").join(&file_name);
    
    std::fs::create_dir_all(file_path.parent().unwrap())
        .map_err(|e| e.to_string())?;
    
    fs::write(&file_path, file_data)
        .map_err(|e| e.to_string())?;
    
    Ok(file_path.to_string_lossy().to_string())
}
```

---

### Phase 6: Migrate Authentication & API Calls

#### 6.1 Migrate IPC Handlers to Tauri Commands

**Electron (ipc-handlers.js):**
```javascript
ipcMain.handle('api:request', async (event, path, options) => {
  const token = authStorage.getToken();
  const url = `${this.apiBaseUrl}${path}`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
    body: JSON.stringify(options.body),
  });
  return { ok: response.ok, data: await response.json() };
});
```

**Tauri (src-tauri/src/commands/api.rs):**
```rust
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Serialize, Deserialize)]
struct ApiRequest {
    path: String,
    method: Option<String>,
    body: Option<serde_json::Value>,
    headers: Option<std::collections::HashMap<String, String>>,
}

#[tauri::command]
async fn api_request(
    request: ApiRequest,
    api_base_url: tauri::State<'_, String>,
    token: tauri::State<'_, Mutex<Option<String>>>,
) -> Result<serde_json::Value, String> {
    let client = Client::new();
    let url = format!("{}{}", api_base_url.inner(), request.path);
    
    let mut req = match request.method.as_deref().unwrap_or("GET") {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        _ => return Err("Unsupported method".to_string()),
    };
    
    // Add authorization header
    if let Ok(token_guard) = token.lock() {
        if let Some(ref auth_token) = *token_guard {
            req = req.header("Authorization", format!("Bearer {}", auth_token));
        }
    }
    
    // Add body if present
    if let Some(body) = request.body {
        req = req.json(&body);
    }
    
    let response = req.send().await
        .map_err(|e| e.to_string())?;
    
    let status = response.status();
    let data: serde_json::Value = response.json().await
        .map_err(|e| e.to_string())?;
    
    Ok(serde_json::json!({
        "ok": status.is_success(),
        "status": status.as_u16(),
        "data": data,
    }))
}
```

---

### Phase 7: Update Frontend Code

#### 7.1 Create Compatibility Layer

Create `lib/desktop-api.ts`:

```typescript
/**
 * Unified desktop API (works with both Electron and Tauri)
 */

// Detect which desktop framework is available
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;

// Import Tauri API if available
let tauriAPI: any = null;
if (isTauri) {
  tauriAPI = await import('./tauri-api').then(m => m.tauriAPI);
}

/**
 * Unified desktop API
 */
export const desktopAPI = {
  // Version
  getVersion: async () => {
    if (isTauri && tauriAPI) {
      return await tauriAPI.getVersion();
    }
    if (isElectron && window.electronAPI) {
      return await window.electronAPI.getVersion();
    }
    throw new Error('No desktop API available');
  },
  
  // API requests
  apiRequest: async (path: string, options?: any) => {
    if (isTauri && tauriAPI) {
      return await tauriAPI.apiRequest(path, options);
    }
    if (isElectron && window.electronAPI) {
      // Use existing Electron IPC
      return await window.electronAPI.apiRequest(path, options);
    }
    // Fallback to fetch for web
    const response = await fetch(path, options);
    return { ok: response.ok, data: await response.json() };
  },
  
  // ... more unified methods
};
```

#### 7.2 Update Components

Replace `window.electronAPI` usage:

```typescript
// Before (Electron)
const version = await window.electronAPI?.getVersion();

// After (Unified)
import { desktopAPI } from '@/lib/desktop-api';
const version = await desktopAPI.getVersion();
```

---

### Phase 8: Migrate Build Configuration

#### 8.1 Update tauri.conf.json

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build:tauri",
    "devPath": "http://localhost:3000",
    "distDir": "../out",
    "withGlobalTauri": false
  },
  "package": {
    "productName": "HR Leave Portal",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "open": true
      },
      "fs": {
        "readFile": true,
        "writeFile": true,
        "scope": ["$DOCUMENT/*", "$APPDATA/*"]
      },
      "path": {
        "all": true
      },
      "dialog": {
        "open": true,
        "save": true
      }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.mofa.hr-leave-portal",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ]
    },
    "security": {
      "csp": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    },
    "windows": [
      {
        "fullscreen": false,
        "resizable": true,
        "title": "HR Leave Portal",
        "width": 1200,
        "height": 800
      }
    ]
  }
}
```

---

### Phase 9: Migration Checklist

#### Core Setup
- [ ] Install Tauri CLI
- [ ] Initialize Tauri project (`src-tauri/`)
- [ ] Configure `tauri.conf.json`
- [ ] Update `package.json` scripts
- [ ] Update `next.config.mjs` for static export

#### IPC Migration
- [ ] Create `src-tauri/src/main.rs` with command handlers
- [ ] Migrate `ipc-handlers.js` → Tauri commands
- [ ] Migrate `ipc-repository-handlers.js` → Tauri commands
- [ ] Create `lib/tauri-api.ts` wrapper
- [ ] Create `lib/desktop-api.ts` compatibility layer
- [ ] Update all `window.electronAPI` usage

#### Database Migration
- [ ] Create `src-tauri/src/database.rs`
- [ ] Migrate SQLite operations from `database-encrypted.js`
- [ ] Migrate repository patterns to Rust
- [ ] Test database encryption (if needed)
- [ ] Migrate migrations system

#### File System
- [ ] Migrate file operations to Tauri commands
- [ ] Update document save/load functions
- [ ] Test file permissions and scoping

#### Authentication
- [ ] Migrate auth storage to Tauri state
- [ ] Update login/logout commands
- [ ] Migrate token management
- [ ] Test session persistence

#### Background Services
- [ ] Migrate background sync to Rust
- [ ] Migrate conflict resolution
- [ ] Migrate auto-update system
- [ ] Migrate periodic backups

#### UI Updates
- [ ] Remove Electron-specific UI code
- [ ] Update error handling
- [ ] Test offline functionality
- [ ] Update loading states

#### Build & Distribution
- [ ] Test development build (`tauri dev`)
- [ ] Test production build (`tauri build`)
- [ ] Configure code signing (if needed)
- [ ] Test auto-update mechanism
- [ ] Create installer packages

#### Testing
- [ ] Unit tests for Tauri commands
- [ ] Integration tests
- [ ] E2E tests with Tauri
- [ ] Performance testing
- [ ] Security audit

---

## Code Mapping Reference

### IPC Channels → Tauri Commands

| Electron IPC | Tauri Command | Notes |
|--------------|---------------|-------|
| `get-version` | `get_version` | Direct mapping |
| `api:request` | `api_request` | Migrate to Rust |
| `api:login` | `api_login` | Add token state |
| `api:logout` | `api_logout` | Clear token state |
| `repo:employees:findAll` | `repo_employees_find_all` | Database query |
| `repo:leaveRequests:create` | `repo_leave_requests_create` | Database insert |

### File Locations

| Electron | Tauri |
|----------|-------|
| `electron/main.js` | `src-tauri/src/main.rs` |
| `electron/preload.js` | `src-tauri/src/commands/*.rs` |
| `electron/ipc-handlers.js` | `src-tauri/src/commands/api.rs` |
| `electron/database-encrypted.js` | `src-tauri/src/database.rs` |
| `electron/repositories/` | `src-tauri/src/repositories/` |

---

## Benefits of Migration

### Bundle Size
- **Before (Electron):** ~150-200 MB
- **After (Tauri):** ~5-15 MB
- **Reduction:** ~90%

### Memory Usage
- **Before:** ~200-300 MB (Chromium overhead)
- **After:** ~50-100 MB (OS WebView)
- **Reduction:** ~60-70%

### Security
- Built-in security model
- No Node.js in renderer
- Smaller attack surface
- Better CSP enforcement

### Performance
- Faster startup time
- Lower memory footprint
- Native performance for Rust code
- Better battery life (laptops)

---

## Potential Challenges

### 1. Rust Learning Curve
- **Solution:** Start with simple commands, gradually migrate complex logic
- **Resources:** Rust Book, Tauri Documentation

### 2. Database Migration
- **Challenge:** Migrating from sql.js to rusqlite
- **Solution:** Create migration scripts, test thoroughly

### 3. Offline-First Architecture
- **Challenge:** Maintaining offline capabilities
- **Solution:** Use Tauri's file system and database APIs

### 4. Auto-Update System
- **Challenge:** Migrating from electron-updater
- **Solution:** Use Tauri's built-in updater

---

## Migration Timeline Estimate

| Phase | Duration | Complexity |
|-------|----------|------------|
| Setup & Configuration | 1-2 days | Low |
| IPC Migration | 3-5 days | Medium |
| Database Migration | 5-7 days | High |
| File System Migration | 2-3 days | Medium |
| Authentication Migration | 2-3 days | Medium |
| Background Services | 5-7 days | High |
| UI Updates | 2-3 days | Low |
| Testing & Bug Fixes | 5-7 days | Medium |
| **Total** | **25-35 days** | **Medium-High** |

---

## Next Steps

1. **Review this guide** with the team
2. **Set up development environment** (Rust, Tauri CLI)
3. **Create proof-of-concept** (simple IPC command)
4. **Plan migration phases** (prioritize critical features)
5. **Start with Phase 1** (setup and configuration)

---

## Resources

- [Tauri Documentation](https://tauri.app/)
- [Tauri API Reference](https://tauri.app/api/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [Rusqlite Documentation](https://docs.rs/rusqlite/)
- [Tauri Examples](https://github.com/tauri-apps/tauri/tree/dev/examples)

---

## Questions or Issues?

If you encounter issues during migration, refer to:
- Tauri Discord: https://discord.gg/tauri
- Tauri GitHub Issues: https://github.com/tauri-apps/tauri/issues
- This project's documentation in `docs/`

