# Simple Build Options (No Visual Studio Required)

This document provides simpler alternatives to building the Electron app without requiring Visual Studio Build Tools or GitHub Actions.

## The Problem

The current build requires Visual Studio Build Tools because `better-sqlite3` is a native module that needs to be compiled for Electron. This adds complexity to the build process.

## Solution Options

### Option 1: Replace better-sqlite3 with sql.js (Recommended - Simplest)

**sql.js** is a pure JavaScript SQLite implementation that requires **no native compilation**. It's perfect for offline-first apps and works entirely in JavaScript.

#### Advantages:
- ✅ **No native compilation needed** - Pure JavaScript
- ✅ **No Visual Studio required** - Just Node.js
- ✅ **Works offline** - Same SQLite functionality
- ✅ **Cross-platform** - Works on Windows, Mac, Linux
- ✅ **Simple build** - Just `npm install` and `npm run build`

#### Disadvantages:
- ⚠️ **Slightly slower** - JavaScript vs native (usually not noticeable for most apps)
- ⚠️ **Larger bundle size** - ~1-2MB (acceptable for desktop apps)
- ⚠️ **API differences** - Need to update database code

#### Migration Steps:

1. **Install sql.js:**
   ```bash
   npm install sql.js
   npm install --save-dev @types/sql.js
   ```

2. **Remove better-sqlite3:**
   ```bash
   npm uninstall better-sqlite3 @types/better-sqlite3
   ```

3. **Update database code** - Replace `better-sqlite3` API calls with `sql.js` API

4. **Build normally:**
   ```bash
   npm install
   npm run electron:build:win
   ```

**No Visual Studio needed!** 🎉

---

### Option 2: Use Pre-built Binaries (Keep better-sqlite3)

Use pre-built `better-sqlite3` binaries instead of compiling from source.

#### Advantages:
- ✅ **Keep existing code** - No API changes needed
- ✅ **No compilation** - Use pre-built binaries
- ✅ **Better performance** - Native speed

#### Disadvantages:
- ⚠️ **Platform-specific** - Need binaries for each platform
- ⚠️ **Version matching** - Must match Electron/Node versions exactly

#### Implementation:

1. **Use electron-rebuild with pre-built binaries:**
   ```bash
   npm install --save-dev electron-rebuild
   ```

2. **Download pre-built binaries** for your Electron version:
   - Check: https://github.com/WiseLibs/better-sqlite3/releases
   - Or use: `npm install better-sqlite3 --build-from-source=false`

3. **Configure package.json:**
   ```json
   {
     "build": {
       "npmRebuild": false,
       "nodeGypRebuild": false,
       "buildDependenciesFromSource": false
     }
   }
   ```

**Note:** This still requires finding/building binaries for your specific Electron version, which can be tricky.

---

### Option 3: Use Docker for Building (Isolated Environment)

Build in a Docker container with all tools pre-installed.

#### Advantages:
- ✅ **No local installation** - Everything in Docker
- ✅ **Consistent builds** - Same environment every time
- ✅ **Cross-platform** - Works on any OS

#### Disadvantages:
- ⚠️ **Docker required** - Need Docker Desktop installed
- ⚠️ **Larger downloads** - Docker images are big
- ⚠️ **Learning curve** - Need to understand Docker

#### Implementation:

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18
   RUN apt-get update && apt-get install -y \
       python3 make g++ \
       && rm -rf /var/lib/apt/lists/*
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run electron:build:win
   ```

2. **Build with Docker:**
   ```bash
   docker build -t hr-leave-portal .
   docker run --rm -v ${PWD}/dist:/app/dist hr-leave-portal
   ```

---

### Option 4: Use Electron Forge (Simplified Build Tool)

**Electron Forge** simplifies the entire build process and handles native modules better.

#### Advantages:
- ✅ **Simpler configuration** - Less setup
- ✅ **Better native module handling** - Automatic rebuild
- ✅ **Cross-platform builds** - Easy multi-platform support

#### Disadvantages:
- ⚠️ **Migration needed** - Need to restructure project
- ⚠️ **Still needs build tools** - For native modules (unless using sql.js)

#### Implementation:

1. **Install Electron Forge:**
   ```bash
   npm install --save-dev @electron-forge/cli
   npx electron-forge import
   ```

2. **Build:**
   ```bash
   npm run make
   ```

**Note:** This still requires Visual Studio if using `better-sqlite3`. Combine with Option 1 (sql.js) for a truly simple build.

---

## Recommended Approach: Option 1 (sql.js)

For the **simplest build experience**, I recommend **Option 1: Replace better-sqlite3 with sql.js**.

### Why sql.js?

1. **Zero native compilation** - Pure JavaScript
2. **Same functionality** - Full SQLite support
3. **Offline-first** - Perfect for your use case
4. **Simple builds** - Just `npm install` and `npm run build`
5. **Cross-platform** - Works everywhere

### Performance Considerations

- **sql.js is fast enough** for most desktop applications
- **Better-sqlite3 is faster**, but the difference is usually negligible for HR leave portal workloads
- **Your app is offline-first** - Users won't notice the difference

### Migration Effort

- **Low to medium** - Need to update database code
- **API is similar** - Easy to migrate
- **One-time change** - Then builds are simple forever

---

## Quick Start: Switch to sql.js

If you want to switch to sql.js right now, I can help you:

1. Update `package.json` dependencies
2. Create a new database adapter using sql.js
3. Update all database code to use the new adapter
4. Test the offline functionality
5. Update build scripts

**Result:** Simple builds with just `npm install` and `npm run build` - no Visual Studio needed!

---

## Comparison Table

| Option | Native Compilation | Visual Studio | Build Complexity | Performance | Migration Effort |
|--------|-------------------|---------------|------------------|-------------|-------------------|
| **sql.js** | ❌ No | ❌ No | ⭐⭐⭐⭐⭐ Very Simple | ⭐⭐⭐⭐ Good | ⭐⭐⭐ Medium |
| **Pre-built binaries** | ❌ No | ❌ No | ⭐⭐⭐ Moderate | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐ Low |
| **Docker** | ✅ Yes | ✅ In Docker | ⭐⭐⭐ Moderate | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Low |
| **Electron Forge** | ✅ Yes | ✅ Yes | ⭐⭐⭐⭐ Simple | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Medium |

---

## Next Steps

1. **Choose an option** based on your needs
2. **If choosing sql.js** - I can help migrate the code
3. **If choosing Docker** - I can create the Dockerfile
4. **If choosing Electron Forge** - I can help restructure the project

**Which option would you like to pursue?**

