# 🪟 Building Windows .exe for Ministry Distribution

## Quick Start - Build Windows Installer

### Step 1: Create Windows Icon

```bash
# Create icon (if not done already)
node scripts/create-windows-icon.js

# Then convert PNG to ICO using online tool:
# https://convertio.co/png-ico/
# Upload: public/icon-256x256.png
# Download and save as: public/icon.ico
```

### Step 2: Set API URL (Your Vercel/Server URL)

**PowerShell:**
```powershell
$env:ELECTRON_API_URL="https://your-app.vercel.app"
```

**Command Prompt:**
```cmd
set ELECTRON_API_URL=https://your-app.vercel.app
```

### Step 3: Build Windows Installer

```bash
npm run electron:build:win
```

**Output**: `dist/HR Leave Portal Setup 0.1.0.exe`

---

## 📦 What You Get

- **Installer File**: `dist/HR Leave Portal Setup 0.1.0.exe` (~100-150MB)
- **Users can**: Double-click to install, creates shortcuts, adds to Start Menu

---

## 🎯 Distribution

1. **Share the .exe file** with ministry staff
2. **They install** by double-clicking
3. **They launch** from Start Menu or Desktop shortcut
4. **App connects** to your API server (Vercel)

---

## ✅ That's It!

The `.exe` file in `dist/` is ready to distribute to the ministry!

See `DESKTOP-APP-BUILD-GUIDE.md` for detailed instructions.

