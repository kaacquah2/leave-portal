# Build Requirements for Electron App

## ✅ Simple Build (No Visual Studio Required!)

**Great news!** The app now uses `sql.js` (pure JavaScript SQLite) instead of native modules. This means **no Visual Studio Build Tools needed**!

### Required Tools

**Only Node.js is required!**

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

### Building the App

**That's it!** Just Node.js:

```bash
# Install dependencies
npm install

# Build the Electron app
npm run electron:build:win
```

**No Visual Studio, no Python, no native compilation!** 🎉

The app uses `sql.js` - a pure JavaScript SQLite implementation that requires no native compilation.

---

## Previous Build Method (Deprecated)

<details>
<summary>Click to view old build requirements (no longer needed)</summary>

### Why We Don't Need Visual Studio Anymore

Previously, the app used `better-sqlite3` which required native compilation. We've migrated to `sql.js` which is pure JavaScript and requires no compilation.

**Old requirements (no longer needed):**
- ❌ Visual Studio Build Tools
- ❌ Python
- ❌ Native module compilation

See [SQLJS-MIGRATION.md](SQLJS-MIGRATION.md) for migration details.

</details>

### Troubleshooting

#### Error: "SQL.js not initialized"

**Solution:** This should not happen, but if it does:
1. Ensure `sql.js` is installed: `npm install sql.js`
2. Check that `electron/sqlite-adapter.js` exists
3. Try reinstalling: `npm install`

#### Error: "Module not found: sql.js"

**Solution:**
```bash
npm install sql.js @types/sql.js
```

#### Build Issues

If you encounter any build issues:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Try building: `npm run electron:build:win`

### Verification

Verify the setup:

```bash
# Check Node.js version (should be v18+)
node --version

# Install dependencies
npm install

# Build the app
npm run electron:build:win
```

If the build succeeds, you're all set! 🎉

---

## Migration Notes

The app was migrated from `better-sqlite3` (native) to `sql.js` (pure JavaScript) to simplify builds. See [SQLJS-MIGRATION.md](SQLJS-MIGRATION.md) for details.

