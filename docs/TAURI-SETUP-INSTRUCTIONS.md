# Tauri Setup Instructions

## Prerequisites

Before you can build and run the Tauri application, you need to install Rust.

### Install Rust (Required)

**Windows:**

1. Download and run the Rust installer:
   - Visit: https://rustup.rs/
   - Or download directly: https://win.rustup.rs/x86_64
   - Run the installer and follow the prompts

2. After installation, restart your terminal/PowerShell

3. Verify installation:
   ```powershell
   rustc --version
   cargo --version
   ```

**Alternative (via PowerShell):**
```powershell
# Download and run rustup-init
Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile "$env:TEMP\rustup-init.exe"
& "$env:TEMP\rustup-init.exe"
```

### System Dependencies

**Windows:**
- WebView2 (usually pre-installed on Windows 10/11)
- If missing, download from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/

**macOS:**
```bash
xcode-select --install
```

**Linux:**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

## Project Setup

The Tauri project structure has been created in `src-tauri/`. The following files are already configured:

- ✅ `src-tauri/Cargo.toml` - Rust dependencies
- ✅ `src-tauri/tauri.conf.json` - Tauri configuration
- ✅ `src-tauri/src/main.rs` - Main Rust entry point
- ✅ `src-tauri/build.rs` - Build script
- ✅ `lib/tauri-api.ts` - TypeScript API wrapper
- ✅ `lib/desktop-api.ts` - Unified desktop API

## Next Steps

### 1. Install Rust (if not already installed)

Follow the instructions above to install Rust.

### 2. Verify Setup

```powershell
# Check Rust
rustc --version

# Check Tauri CLI
npx tauri --version
```

### 3. Create Icons Directory

Create the icons directory for Tauri:

```powershell
New-Item -ItemType Directory -Force -Path "src-tauri\icons"
```

Copy your app icons to:
- `src-tauri/icons/32x32.png`
- `src-tauri/icons/128x128.png`
- `src-tauri/icons/128x128@2x.png`
- `src-tauri/icons/icon.icns` (macOS)
- `src-tauri/icons/icon.ico` (Windows)

You can use the existing icons from `public/` directory.

### 4. Test Development Build

Once Rust is installed:

```powershell
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start Tauri dev (in another terminal)
npm run tauri:dev
```

### 5. Build for Production

```powershell
# Build Next.js static export
npm run build:tauri

# Build Tauri app
npm run tauri:build
```

## Troubleshooting

### Rust Installation Issues

If Rust installation fails:
1. Check your internet connection
2. Try running the installer as administrator
3. Check Windows Defender/firewall settings

### Tauri Build Issues

If `tauri dev` or `tauri build` fails:
1. Ensure Rust is installed: `rustc --version`
2. Ensure Cargo is installed: `cargo --version`
3. Check that all dependencies in `Cargo.toml` are valid
4. Try cleaning the build: `cd src-tauri && cargo clean`

### WebView2 Issues (Windows)

If you get WebView2 errors:
1. Ensure Windows 10/11 is up to date
2. Download WebView2 Runtime: https://developer.microsoft.com/en-us/microsoft-edge/webview2/

## Development Workflow

1. **Development:**
   - Run `npm run dev` in one terminal
   - Run `npm run tauri:dev` in another terminal
   - Tauri will automatically reload when you make changes

2. **Testing:**
   - Use the unified `desktopAPI` from `lib/desktop-api.ts`
   - It works with both Electron and Tauri

3. **Building:**
   - Run `npm run build:tauri` to create static export
   - Run `npm run tauri:build` to create desktop app

## Current Status

✅ Phase 1 Complete:
- Tauri project structure created
- Configuration files set up
- TypeScript API wrappers created
- Build scripts configured

⏳ Next Phase:
- Install Rust (required)
- Create icons directory
- Test development build
- Start migrating IPC commands

## Resources

- [Rust Installation](https://rustup.rs/)
- [Tauri Documentation](https://tauri.app/)
- [Tauri API Reference](https://tauri.app/api/)

