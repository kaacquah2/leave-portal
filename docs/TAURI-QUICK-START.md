# Tauri Quick Start Guide

## Prerequisites

1. **Rust** (required for Tauri)
   ```bash
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # Or on Windows (PowerShell)
   # Download and run: https://rustup.rs/
   ```

2. **System Dependencies**
   - **Windows:** WebView2 (usually pre-installed on Windows 10/11)
   - **macOS:** Xcode Command Line Tools
   - **Linux:** `webkit2gtk`, `libayatana-appindicator3-dev`, `librsvg2-dev`

## Installation

```bash
# Install Tauri CLI
npm install -D @tauri-apps/cli @tauri-apps/api

# Or globally
npm install -g @tauri-apps/cli
```

## Initialize Tauri

```bash
# From project root
npm run tauri init
```

This will prompt you for:
- App name: `HR Leave Portal`
- Window title: `HR Leave Portal`
- Dist directory: `../out` (matches Next.js static export)
- Dev path: `http://localhost:3000`
- Before dev command: `npm run dev`
- Before build command: `npm run build:tauri`

## Project Structure After Init

```
leave-portal/
├── src-tauri/              # Tauri Rust project
│   ├── Cargo.toml          # Rust dependencies
│   ├── tauri.conf.json     # Tauri configuration
│   ├── build.rs            # Build script
│   └── src/
│       └── main.rs         # Main entry point
├── package.json
└── ...
```

## Basic Example: Hello World Command

### 1. Add Command to Rust (src-tauri/src/main.rs)

```rust
// Prevents additional console window on Windows
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 2. Call from Frontend (TypeScript)

```typescript
import { invoke } from '@tauri-apps/api/tauri';

// Call the command
const greeting = await invoke<string>('greet', { name: 'World' });
console.log(greeting); // "Hello, World! You've been greeted from Rust!"
```

## Development Workflow

### Start Development Server

```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start Tauri dev (in another terminal)
npm run tauri dev
```

Or use concurrently:

```json
{
  "scripts": {
    "tauri:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && tauri dev\""
  }
}
```

### Build for Production

```bash
# Build Next.js static export
npm run build:tauri

# Build Tauri app
npm run tauri build
```

Output will be in `src-tauri/target/release/` (or `debug/` for dev builds).

## Common Commands Migration

### Get App Version

**Electron:**
```typescript
const version = await window.electronAPI.getVersion();
```

**Tauri:**
```rust
// src-tauri/src/main.rs
#[tauri::command]
fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
```

```typescript
// Frontend
import { invoke } from '@tauri-apps/api/tauri';
const version = await invoke<string>('get_version');
```

### File System Access

**Electron:**
```typescript
// Via IPC
const result = await window.electronAPI.saveFile(data);
```

**Tauri:**
```rust
// src-tauri/src/main.rs
use tauri::api::path::app_data_dir;
use std::fs;

#[tauri::command]
fn save_file(filename: String, contents: Vec<u8>) -> Result<String, String> {
    let app_data = app_data_dir(tauri::generate_context!())
        .ok_or_else(|| "Could not get app data directory".to_string())?;
    
    let file_path = app_data.join(&filename);
    fs::write(&file_path, contents)
        .map_err(|e| e.to_string())?;
    
    Ok(file_path.to_string_lossy().to_string())
}
```

```typescript
// Frontend
import { invoke } from '@tauri-apps/api/tauri';
const path = await invoke<string>('save_file', { 
    filename: 'data.json', 
    contents: new Uint8Array([...]) 
});
```

## Next Steps

1. Follow the [Full Migration Guide](./TAURI-MIGRATION-GUIDE.md)
2. Start migrating one feature at a time
3. Test thoroughly after each migration
4. Keep Electron version working until Tauri is fully tested

