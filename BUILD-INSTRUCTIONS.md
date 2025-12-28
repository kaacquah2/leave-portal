# Build Instructions for Desktop App
## Using Your Vercel Deployment

**Vercel URL**: [https://hr-leave-portal.vercel.app](https://hr-leave-portal.vercel.app)

---

## 🚀 Quick Build

### Windows PowerShell
```powershell
$env:ELECTRON_API_URL="https://hr-leave-portal.vercel.app"
npm run electron:build:win
```

### Windows Command Prompt
```cmd
set ELECTRON_API_URL=https://hr-leave-portal.vercel.app
npm run electron:build:win
```

### Linux/Mac
```bash
export ELECTRON_API_URL=https://hr-leave-portal.vercel.app
npm run electron:build:win
```

---

## 📦 Output

After building, you'll find the installer in:
- **Windows**: `dist/HR Leave Portal Setup 0.1.0.exe`

---

## ✅ What This Does

1. Sets the API URL to your Vercel deployment
2. Builds the Next.js app
3. Packages it into an Electron desktop app
4. Creates a Windows installer (.exe)

---

## 🎯 Result

The desktop app will:
- ✅ Connect to your Vercel API at `https://hr-leave-portal.vercel.app`
- ✅ Have all features available
- ✅ Work for all users (HR, Managers, Employees)
- ✅ Be ready for distribution

---

**Ready to build!** 🎉

