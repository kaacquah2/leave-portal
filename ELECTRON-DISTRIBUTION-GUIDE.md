# Electron Distribution Guide
## How to Share Your .exe with Team Members

---

## ⚠️ Important: Current Limitation

**With the current setup, the .exe file is a static frontend only.**

When you build the Electron app with `output: 'export'`, it creates a **static HTML/JS bundle** that:
- ✅ Works offline for the UI
- ❌ **Cannot run API routes** (needs a server)
- ❌ **Cannot connect to database directly** (needs a server)
- ❌ **Real-time features won't work** (needs a server)

---

## 🎯 Solution: Point Electron App to Remote API Server

For team distribution, you have **two main options**:

### Option 1: Host Your API Server (Recommended) ✅

**Best for:**
- Team members in different locations
- Centralized data management
- Real-time updates across all users
- Easy updates (just update server)

**How it works:**
1. Deploy your Next.js app to a server (Vercel, Railway, etc.)
2. Configure Electron app to point to that server's API
3. Share the .exe - it will connect to your hosted API

**Setup:**
- Your database (Neon) stays in the cloud
- All team members use the same database
- Real-time features work across all clients
- No need to run local dev server

---

### Option 2: Bundle Server with Electron (Advanced) ⚠️

**Best for:**
- Completely offline operation
- No internet required
- Local database on each machine

**Limitations:**
- Much larger file size (includes Node.js + database)
- Each user has separate database
- No shared data between users
- More complex setup

---

## 🚀 Recommended Setup: Remote API Server

### Step 1: Deploy Your Next.js App

Deploy to a hosting service:

**Vercel (Easiest):**
```bash
npm install -g vercel
vercel
```

**Railway:**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

**Other options:**
- Render
- Fly.io
- DigitalOcean App Platform
- AWS/Azure/GCP

### Step 2: Configure Electron to Use Remote API

The Electron app needs to know where your API server is.

**Environment Variable Approach:**
1. Set `NEXT_PUBLIC_API_URL` when building Electron
2. Update API calls to use this URL

**Example:**
```bash
# Build Electron pointing to your server
cross-env ELECTRON=1 NEXT_PUBLIC_API_URL=https://your-app.vercel.app npm run build && electron-builder
```

### Step 3: Share the .exe

Once built, the .exe will:
- ✅ Connect to your hosted API
- ✅ Use the shared database
- ✅ Support real-time updates
- ✅ Work for all team members

**No local dev server needed!**

---

## 📋 Quick Answer to Your Questions

### Q: Do I need to run local dev server?
**A: NO** - If you use Option 1 (remote API server), team members just run the .exe. No dev server needed.

### Q: Will it be real-time?
**A: YES** - If using remote API server, real-time features work across all team members.

### Q: Will it use the database?
**A: YES** - All team members share the same cloud database (Neon). Data is centralized.

---

## 🔧 Implementation: How to Build with Remote API

### Step 1: Deploy Your Next.js App

Deploy your app to a hosting service (Vercel, Railway, etc.) and get the URL:
- Example: `https://your-app.vercel.app`
- Example: `https://your-app.railway.app`

### Step 2: Build Electron with API URL

**Windows (PowerShell):**
```powershell
$env:ELECTRON_API_URL="https://your-app.vercel.app"
npm run electron:build:win
```

**Windows (CMD):**
```cmd
set ELECTRON_API_URL=https://your-app.vercel.app
npm run electron:build:win
```

**macOS/Linux:**
```bash
ELECTRON_API_URL=https://your-app.vercel.app npm run electron:build
```

### Step 3: Share the .exe

The built .exe will automatically connect to your remote API server. Team members just need to:
1. Install the .exe
2. Run it
3. It connects to your hosted API automatically

**No configuration needed on their end!**

---

## 📝 Alternative: Manual Configuration File

If you prefer, you can also create a config file that users can edit:

1. Create `electron/config.json`:
```json
{
  "apiUrl": "https://your-app.vercel.app"
}
```

2. Update `electron/main.js` to read this config
3. Users can edit the config file to point to a different server

---

## ✅ Summary

**For Team Distribution:**
1. ✅ Deploy your Next.js app to a server (Vercel, Railway, etc.)
2. ✅ Build Electron with the API URL: `ELECTRON_API_URL=https://your-server.com npm run electron:build:win`
3. ✅ Share the .exe file
4. ✅ Team members install and run - it connects to your server automatically

**Result:**
- ✅ No local dev server needed
- ✅ Real-time features work
- ✅ Shared database (all users see same data)
- ✅ Centralized management

