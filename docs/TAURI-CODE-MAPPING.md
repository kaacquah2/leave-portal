# Electron → Tauri Code Mapping Reference

Quick reference for converting Electron code to Tauri equivalents.

---

## IPC Communication

### Electron

```javascript
// preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  getData: () => ipcRenderer.invoke('get-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
});

// main.js
ipcMain.handle('get-data', () => {
  return { data: 'some data' };
});

ipcMain.handle('save-data', (event, data) => {
  // Save data
  return { success: true };
});
```

### Tauri

```rust
// src-tauri/src/main.rs
#[tauri::command]
fn get_data() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({ "data": "some data" }))
}

#[tauri::command]
fn save_data(data: serde_json::Value) -> Result<serde_json::Value, String> {
    // Save data
    Ok(serde_json::json!({ "success": true }))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_data, save_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```typescript
// Frontend
import { invoke } from '@tauri-apps/api/tauri';

const data = await invoke<{ data: string }>('get_data');
const result = await invoke<{ success: boolean }>('save_data', { data: {...} });
```

---

## File System Operations

### Electron

```javascript
// main.js
const fs = require('fs');
const path = require('path');

ipcMain.handle('read-file', (event, filePath) => {
  const data = fs.readFileSync(filePath, 'utf8');
  return data;
});

ipcMain.handle('write-file', (event, filePath, data) => {
  fs.writeFileSync(filePath, data);
  return { success: true };
});
```

### Tauri

```rust
// src-tauri/src/main.rs
use std::fs;
use tauri::api::path::app_data_dir;

#[tauri::command]
fn read_file(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(file_path: String, contents: String) -> Result<(), String> {
    fs::write(&file_path, contents)
        .map_err(|e| e.to_string())
}
```

```typescript
// Frontend
import { invoke } from '@tauri-apps/api/tauri';

const content = await invoke<string>('read_file', { filePath: '/path/to/file' });
await invoke('write_file', { filePath: '/path/to/file', contents: 'data' });
```

---

## Database Operations

### Electron (sql.js)

```javascript
// database.js
const Database = require('./sqlite-adapter');

ipcMain.handle('db-query', async (event, query, params) => {
  const db = await Database.getDatabase();
  const result = db.exec(query);
  return result;
});
```

### Tauri (rusqlite)

```rust
// src-tauri/src/database.rs
use rusqlite::{Connection, Result};

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new() -> Result<Self> {
        let conn = Connection::open("hr-portal.db")?;
        // Initialize schema
        conn.execute(
            "CREATE TABLE IF NOT EXISTS employees (id TEXT PRIMARY KEY, name TEXT)",
            [],
        )?;
        Ok(Database { conn })
    }
    
    pub fn query(&self, sql: &str) -> Result<Vec<serde_json::Value>> {
        let mut stmt = self.conn.prepare(sql)?;
        let rows = stmt.query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
            }))
        })?;
        
        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }
        Ok(results)
    }
}

// src-tauri/src/main.rs
use std::sync::Mutex;

#[tauri::command]
fn db_query(
    sql: String,
    db: tauri::State<'_, Mutex<Database>>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.query(&sql).map_err(|e| e.to_string())
}
```

---

## HTTP Requests

### Electron

```javascript
// ipc-handlers.js
ipcMain.handle('api-request', async (event, url, options) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: JSON.stringify(options.body),
  });
  return {
    ok: response.ok,
    status: response.status,
    data: await response.json(),
  };
});
```

### Tauri

```rust
// src-tauri/src/main.rs
use reqwest::Client;

#[tauri::command]
async fn api_request(
    url: String,
    method: Option<String>,
    body: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let client = Client::new();
    let method = method.as_deref().unwrap_or("GET");
    
    let mut request = match method {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        _ => return Err("Unsupported method".to_string()),
    };
    
    if let Some(body) = body {
        request = request.json(&body);
    }
    
    let response = request.send().await
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

## Environment Variables

### Electron

```javascript
// main.js
const apiUrl = process.env.ELECTRON_API_URL || 'https://api.example.com';
```

### Tauri

```rust
// src-tauri/src/main.rs
use std::env;

fn get_api_url() -> String {
    env::var("TAURI_API_URL")
        .unwrap_or_else(|_| "https://api.example.com".to_string())
}
```

Or in `tauri.conf.json`:

```json
{
  "tauri": {
    "build": {
      "env": {
        "TAURI_API_URL": "https://api.example.com"
      }
    }
  }
}
```

---

## App Paths

### Electron

```javascript
// main.js
const { app } = require('electron');

const userData = app.getPath('userData');
const documents = app.getPath('documents');
const temp = app.getPath('temp');
```

### Tauri

```rust
// src-tauri/src/main.rs
use tauri::api::path::{app_data_dir, document_dir, temp_dir};

#[tauri::command]
fn get_app_paths() -> Result<serde_json::Value, String> {
    let config = tauri::generate_context!();
    Ok(serde_json::json!({
        "userData": app_data_dir(&config)
            .map(|p| p.to_string_lossy().to_string()),
        "documents": document_dir()
            .map(|p| p.to_string_lossy().to_string()),
        "temp": temp_dir()
            .map(|p| p.to_string_lossy().to_string()),
    }))
}
```

Or use Tauri's path API directly:

```typescript
import { appDataDir, documentDir, tempDir } from '@tauri-apps/api/path';

const userData = await appDataDir();
const documents = await documentDir();
const temp = await tempDir();
```

---

## Window Management

### Electron

```javascript
// main.js
const { BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.loadURL('http://localhost:3000');
}
```

### Tauri

```json
// tauri.conf.json
{
  "tauri": {
    "windows": [
      {
        "fullscreen": false,
        "resizable": true,
        "title": "HR Leave Portal",
        "width": 1200,
        "height": 800,
        "url": "index.html"
      }
    ]
  }
}
```

Or programmatically:

```rust
// src-tauri/src/main.rs
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let window = tauri::WindowBuilder::new(
                app,
                "main",
                tauri::WindowUrl::App("index.html".into())
            )
            .title("HR Leave Portal")
            .inner_size(1200.0, 800.0)
            .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Dialog Boxes

### Electron

```javascript
// main.js
const { dialog } = require('electron');

ipcMain.handle('show-dialog', async () => {
  const result = await dialog.showMessageBox({
    type: 'info',
    title: 'Hello',
    message: 'This is a message',
  });
  return result;
});
```

### Tauri

```typescript
// Frontend (no IPC needed!)
import { message } from '@tauri-apps/api/dialog';

await message('This is a message', { title: 'Hello', kind: 'info' });
```

Or with Rust:

```rust
// src-tauri/src/main.rs
use tauri::api::dialog::message;

#[tauri::command]
async fn show_dialog() -> Result<(), String> {
    message(None, "This is a message", Some("Hello"));
    Ok(())
}
```

---

## System Information

### Electron

```javascript
// preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: process.versions,
});
```

### Tauri

```rust
// src-tauri/src/main.rs
#[tauri::command]
fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

#[tauri::command]
fn get_versions() -> serde_json::Value {
    serde_json::json!({
        "tauri": env!("CARGO_PKG_VERSION"),
        "rust": env!("RUSTC_VERSION"),
    })
}
```

Or use Tauri's built-in:

```typescript
import { platform, version } from '@tauri-apps/api/os';

const os = await platform();
const appVersion = await version();
```

---

## Auto-Updater

### Electron

```javascript
// auto-updater.js
const { autoUpdater } = require('electron-updater');

autoUpdater.checkForUpdatesAndNotify();
```

### Tauri

```rust
// src-tauri/src/main.rs
use tauri::updater::UpdaterBuilder;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let updater = UpdaterBuilder::new()
                .app(app.handle())
                .build()?;
            
            // Check for updates
            updater.check().await?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Common Patterns

### State Management

**Electron:**
```javascript
// Global state in main process
let appState = {};

ipcMain.handle('get-state', () => appState);
ipcMain.handle('set-state', (event, newState) => {
  appState = { ...appState, ...newState };
});
```

**Tauri:**
```rust
// src-tauri/src/main.rs
use std::sync::Mutex;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Default)]
struct AppState {
    data: String,
}

#[tauri::command]
fn get_state(state: tauri::State<'_, Mutex<AppState>>) -> Result<AppState, String> {
    Ok(state.lock().map_err(|e| e.to_string())?.clone())
}

#[tauri::command]
fn set_state(
    new_state: AppState,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    *state.lock().map_err(|e| e.to_string())? = new_state;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(Mutex::new(AppState::default()))
        .invoke_handler(tauri::generate_handler![get_state, set_state])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Error Handling

### Electron

```javascript
ipcMain.handle('risky-operation', async () => {
  try {
    // Operation
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

### Tauri

```rust
#[tauri::command]
fn risky_operation() -> Result<serde_json::Value, String> {
    // Operation that might fail
    match do_something() {
        Ok(result) => Ok(serde_json::json!({ "success": true, "result": result })),
        Err(e) => Err(e.to_string()),
    }
}
```

```typescript
// Frontend
try {
    const result = await invoke('risky_operation');
} catch (error) {
    console.error('Operation failed:', error);
}
```

---

## Summary Table

| Feature | Electron | Tauri |
|---------|----------|-------|
| IPC | `ipcRenderer.invoke()` | `invoke()` from `@tauri-apps/api` |
| Main Process | Node.js | Rust |
| File System | Node.js `fs` | Rust `std::fs` or Tauri API |
| Database | sql.js | rusqlite |
| HTTP | Node.js `fetch` | `reqwest` crate |
| Paths | `app.getPath()` | `@tauri-apps/api/path` |
| Dialogs | IPC + `dialog` | `@tauri-apps/api/dialog` |
| Auto-Update | `electron-updater` | Built-in updater |
| State | Global variables | `tauri::State` |

