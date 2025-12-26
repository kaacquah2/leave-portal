# Electron Setup Instructions
## Running Your HR Leave Portal as a Desktop App

This guide explains how to use the Electron setup for your HR Leave Portal.

---

## 📦 Installation

### Step 1: Install Dependencies

```bash
npm install --save-dev electron electron-builder concurrently wait-on
npm install --save electron-is-dev
```

**Note**: If you encounter network issues, try:
```bash
npm install --save-dev electron electron-builder concurrently wait-on --registry https://registry.npmjs.org/
```

### Step 2: Verify Installation

Check that Electron is installed:
```bash
npx electron --version
```

---

## 🚀 Running Electron App

### Development Mode

**Option 1: Run Electron with Next.js dev server (Recommended)**

```bash
npm run electron:dev
```

This will:
1. Start the Next.js development server
2. Wait for it to be ready
3. Launch Electron window

**Option 2: Manual (Two Terminals)**

Terminal 1:
```bash
npm run dev
```

Terminal 2 (wait for server to start):
```bash
npm run electron
```

### Production Build

**Build for Current Platform:**
```bash
npm run electron:build
```

**Build for Specific Platform:**
```bash
# Windows
npm run electron:build:win

# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux
```

Built files will be in the `dist/` folder.

---

## 📁 Project Structure

```
leave-portal/
├── electron/
│   ├── main.js          # Main Electron process
│   └── preload.js       # Preload script (security bridge)
├── app/                 # Next.js app
├── public/              # Static assets
│   └── icon.png         # App icon (create if needed)
└── package.json         # Electron config
```

---

## 🎨 App Icons

You need to create app icons for different platforms:

### Required Icons:
- **Windows**: `public/icon.ico` (256x256)
- **macOS**: `public/icon.icns` (512x512)
- **Linux**: `public/icon.png` (512x512)

### Generate Icons:

**Option 1: Online Tool**
- Visit: https://www.electron.build/icons
- Upload your logo
- Download all formats

**Option 2: Using electron-icon-maker**
```bash
npm install -g electron-icon-maker
electron-icon-maker --input=./public/mofa-logo.png --output=./public
```

**Option 3: Manual**
- Use image editing software
- Export in required formats
- Place in `public/` folder

---

## ⚙️ Configuration

### Electron Builder Config

The build configuration is in `package.json` under the `"build"` key:

```json
{
  "build": {
    "appId": "com.mofa.hr-leave-portal",
    "productName": "HR Leave Portal",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": ["nsis"],
      "icon": "public/icon.ico"
    },
    "mac": {
      "target": ["dmg"],
      "icon": "public/icon.icns"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "public/icon.png"
    }
  }
}
```

### Customize Window

Edit `electron/main.js` to customize:
- Window size (width, height)
- Minimum size (minWidth, minHeight)
- Window title
- Icon
- Menu bar

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'electron'"
**Solution**: Install Electron:
```bash
npm install --save-dev electron
```

### Issue: "Window not opening"
**Solution**: 
1. Check that `package.json` has `"main": "electron/main.js"`
2. Verify `electron/main.js` exists
3. Check console for errors

### Issue: "App shows blank screen"
**Solution**:
1. Make sure Next.js dev server is running (`npm run dev`)
2. Check the URL in `electron/main.js` matches your dev server
3. Open DevTools in Electron (Cmd+Option+I / Ctrl+Shift+I)

### Issue: "Build fails"
**Solution**:
1. Ensure Next.js build succeeds: `npm run build`
2. Check that icon files exist
3. Verify electron-builder config in `package.json`

### Issue: "Network error during install"
**Solution**:
- Check internet connection
- Try different npm registry
- Use `npm cache clean --force` then retry

---

## 🔒 Security Notes

The Electron setup includes security best practices:

- ✅ **Context Isolation**: Enabled (prevents direct Node.js access)
- ✅ **Node Integration**: Disabled (more secure)
- ✅ **Preload Script**: Used for safe API exposure
- ✅ **External Links**: Open in default browser
- ✅ **Navigation Protection**: Prevents external navigation

---

## 📱 Features

### Current Features:
- ✅ Desktop window
- ✅ Menu bar (File, Edit, View, Window, Help)
- ✅ DevTools in development
- ✅ External links open in browser
- ✅ Window controls (minimize, maximize, close)

### Future Enhancements:
- System tray integration
- Auto-updater
- Native notifications
- File system access
- Keyboard shortcuts

---

## 🚀 Next Steps

1. **Install dependencies** (when network is available)
2. **Create app icons** (see above)
3. **Test in development**: `npm run electron:dev`
4. **Build for production**: `npm run electron:build`
5. **Distribute** the installer from `dist/` folder

---

## 📦 Sharing with Team Members

**Important:** When sharing the .exe with team members, you need to point it to a remote API server.

**Quick Answer:** See [ELECTRON-QUICK-ANSWER.md](./ELECTRON-QUICK-ANSWER.md)

**Full Guide:** See [ELECTRON-DISTRIBUTION-GUIDE.md](./ELECTRON-DISTRIBUTION-GUIDE.md)

**Summary:**
- Deploy your Next.js app to a server (Vercel, Railway, etc.)
- Build Electron with API URL: `ELECTRON_API_URL=https://your-server.com npm run electron:build:win`
- Share the .exe - team members just install and run!
- No local dev server needed - connects to your hosted API automatically

---

## 📚 Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Builder Documentation](https://www.electron.build/)
- [Electron Security Guide](https://www.electronjs.org/docs/latest/tutorial/security)

---

**Last Updated**: 2024
**Status**: ✅ Electron setup complete - Ready for dependency installation

