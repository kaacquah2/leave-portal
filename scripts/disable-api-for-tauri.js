/**
 * Disable API folder and middleware during Tauri build
 * 
 * CRITICAL: Next.js will refuse static export if:
 * - API routes exist (app/api/)
 * - Middleware exists (middleware.ts)
 * 
 * This script disables these before build and restores them after.
 */

const fs = require('fs');
const path = require('path');

const apiDir = path.join(process.cwd(), 'app', 'api');
// CRITICAL: Move API folder OUTSIDE app/ directory so Next.js doesn't detect it
const apiDisabledDir = path.join(process.cwd(), '.tauri-build-temp', 'api');
const middlewareFile = path.join(process.cwd(), 'middleware.ts');
const middlewareDisabledFile = path.join(process.cwd(), '.tauri-build-temp', 'middleware.ts');

function disableApi() {
  // Ensure temp directory exists
  const tempDir = path.dirname(apiDisabledDir);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Check for leftover api.disabled in app/ directory (from old builds)
  const apiDisabledInApp = path.join(process.cwd(), 'app', 'api.disabled');
  if (fs.existsSync(apiDisabledInApp)) {
    console.log('[Tauri Build] Removing leftover app/api.disabled...');
    // If temp location already exists, remove it first
    if (fs.existsSync(apiDisabledDir)) {
      fs.rmSync(apiDisabledDir, { recursive: true, force: true });
    }
    // Move leftover api.disabled to temp location
    fs.renameSync(apiDisabledInApp, apiDisabledDir);
    console.log('[Tauri Build] ✅ Removed leftover app/api.disabled');
  }
  
  if (fs.existsSync(apiDir)) {
    console.log('[Tauri Build] Disabling API folder...');
    // If temp location already exists, remove it first
    if (fs.existsSync(apiDisabledDir)) {
      fs.rmSync(apiDisabledDir, { recursive: true, force: true });
    }
    // Move API folder OUTSIDE app/ directory
    fs.renameSync(apiDir, apiDisabledDir);
    console.log('[Tauri Build] ✅ API folder moved to .tauri-build-temp/api');
  } else if (fs.existsSync(apiDisabledDir)) {
    console.log('[Tauri Build] ✅ API folder already disabled (in .tauri-build-temp)');
  } else {
    console.log('[Tauri Build] ⚠️  No API folder found');
  }
}

function disableMiddleware() {
  if (fs.existsSync(middlewareFile)) {
    console.log('[Tauri Build] Disabling middleware.ts...');
    // Ensure temp directory exists
    const tempDir = path.dirname(middlewareDisabledFile);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    // Move middleware OUTSIDE app/ directory
    fs.renameSync(middlewareFile, middlewareDisabledFile);
    console.log('[Tauri Build] ✅ middleware.ts moved to .tauri-build-temp/middleware.ts');
  } else if (fs.existsSync(middlewareDisabledFile)) {
    console.log('[Tauri Build] ⚠️  middleware.ts already disabled');
  } else {
    console.log('[Tauri Build] ⚠️  No middleware.ts found');
  }
}

function restoreApi() {
  if (fs.existsSync(apiDisabledDir)) {
    console.log('[Tauri Build] Restoring API folder...');
    fs.renameSync(apiDisabledDir, apiDir);
    console.log('[Tauri Build] ✅ API folder restored');
  }
}

function restoreMiddleware() {
  if (fs.existsSync(middlewareDisabledFile)) {
    console.log('[Tauri Build] Restoring middleware.ts...');
    fs.renameSync(middlewareDisabledFile, middlewareFile);
    console.log('[Tauri Build] ✅ middleware.ts restored');
  }
}

// If script is run directly, disable API and middleware
// NOTE: Do NOT restore here - restoration happens in verify-export.js
// This ensures API/middleware stay disabled during the entire build process
if (require.main === module) {
  disableApi();
  disableMiddleware();
  // Exit successfully - restoration will happen in verify-export.js
  process.exit(0);
}

module.exports = { disableApi, disableMiddleware, restoreApi, restoreMiddleware };

