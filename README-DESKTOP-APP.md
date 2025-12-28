# 🖥️ Desktop App - Quick Start

## Building Windows .exe for Ministry Distribution

Your HR Leave Portal is ready to be built as a Windows desktop application!

---

## ⚡ Quick Build (3 Steps)

### 1. Create Windows Icon

Convert PNG to ICO:
- Visit: https://convertio.co/png-ico/
- Upload: `public/icon-256x256.png`
- Download and save as: `public/icon.ico`

### 2. Set Your API URL

**PowerShell:**
```powershell
$env:ELECTRON_API_URL="https://your-app.vercel.app"
```

**Command Prompt:**
```cmd
set ELECTRON_API_URL=https://your-app.vercel.app
```

### 3. Build

```bash
npm run electron:build:win
```

**Done!** Your installer is in: `dist/HR Leave Portal Setup 1.0.0.exe`

---

## 📦 Distribution

1. **Share** the `.exe` file with ministry staff
2. **They install** by double-clicking
3. **They use** the app - it connects to your server automatically

---

## ✅ What's Included

- ✅ All web app features
- ✅ Professional Windows installer
- ✅ Desktop shortcut
- ✅ Start Menu entry
- ✅ Easy uninstall

---

## 📚 Full Documentation

- **Detailed Guide**: `DESKTOP-APP-BUILD-GUIDE.md`
- **Quick Reference**: `BUILD-WINDOWS-EXE.md`
- **Summary**: `DESKTOP-APP-SUMMARY.md`

---

## 🎉 Ready!

Your desktop app is configured. Just build and distribute! 🚀

