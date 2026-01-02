const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Helper function to sleep synchronously (for retry delays)
function sleep(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Busy wait - acceptable for short delays in build scripts
  }
}

// Helper function to retry an operation with exponential backoff
function retryOperation(operation, maxRetries = 5, delay = 100) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return operation();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      // Wait before retrying (exponential backoff)
      const waitTime = delay * Math.pow(2, i);
      console.log(`   ⚠️  Retry ${i + 1}/${maxRetries} after ${waitTime}ms...`);
      sleep(waitTime);
    }
  }
}

console.log('Building Electron app with offline capability...');
console.log('The Electron app will work offline using bundled static files.');
console.log('✅ App works OFFLINE! Falls back to remote URL if needed.');

// Clean dist folder to avoid rename conflicts
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  console.log('Cleaning dist folder...');
  try {
    // Remove win-unpacked specifically to avoid rename conflicts
    const winUnpackedDir = path.join(distDir, 'win-unpacked');
    if (fs.existsSync(winUnpackedDir)) {
      fs.rmSync(winUnpackedDir, { recursive: true, force: true });
      console.log('Cleaned win-unpacked directory');
    }
  } catch (error) {
    console.log('Note: Could not clean dist folder (non-critical):', error.message);
  }
}

try {
  // Default Vercel URL for production builds
  const DEFAULT_VERCEL_URL = 'https://hr-leave-portal.vercel.app';
  
  // Get API URL from environment or use default
  // Priority: ELECTRON_API_URL > NEXT_PUBLIC_API_URL > DEFAULT_VERCEL_URL
  const electronApiUrl = process.env.ELECTRON_API_URL || 
                        process.env.NEXT_PUBLIC_API_URL || 
                        DEFAULT_VERCEL_URL;
  
  console.log('='.repeat(60));
  console.log('Building Electron App for Production');
  console.log('='.repeat(60));
  console.log(`API URL: ${electronApiUrl}`);
  console.log(`Source: ${process.env.ELECTRON_API_URL ? 'ELECTRON_API_URL' : process.env.NEXT_PUBLIC_API_URL ? 'NEXT_PUBLIC_API_URL' : 'DEFAULT (Vercel)'}`);
  console.log('='.repeat(60));
  
  // Build static files for offline capability
  console.log('\n📦 Building static files for offline capability...');
  console.log('   App will load from local files first (works offline)');
  console.log('   Falls back to remote URL if local files not found');
  
  // Build Next.js static export
  try {
    console.log('\n🔨 Running Next.js static export...');
    
    // Temporarily move API routes folder to avoid static export errors
    // Next.js static export doesn't support API routes
    const apiDir = path.join(__dirname, '..', 'app', 'api');
    const apiBackupDir = path.join(__dirname, '..', 'app', '_api_backup');
    let apiRoutesMoved = false;
    
    if (fs.existsSync(apiDir)) {
      console.log('📦 Temporarily moving API routes for static export...');
      try {
        // Remove backup if it exists
        if (fs.existsSync(apiBackupDir)) {
          fs.rmSync(apiBackupDir, { recursive: true, force: true });
        }
        // Move API routes to backup location with retry
        retryOperation(() => {
          fs.renameSync(apiDir, apiBackupDir);
        }, 3, 100);
        apiRoutesMoved = true;
        console.log('✅ API routes moved to _api_backup');
      } catch (error) {
        console.error('❌ Failed to move API routes:', error.message);
        console.error('   Make sure no processes are using files in app/api');
        throw error;
      }
    }
    
    try {
      // Create .next directory if it doesn't exist
      const nextDir = path.join(__dirname, '..', '.next');
      if (!fs.existsSync(nextDir)) {
        fs.mkdirSync(nextDir, { recursive: true });
      }
      
      // Create required-server-files.json if it doesn't exist (workaround for static export)
      // This file is needed during the build process even for static exports
      const requiredServerFilesPath = path.join(nextDir, 'required-server-files.json');
      if (!fs.existsSync(requiredServerFilesPath)) {
        const requiredServerFiles = {
          version: 1,
          config: {
            output: 'export'
          },
          appDir: true,
          relativeAppDir: 'app',
          relativePagesDir: '',
          relativeRootDir: '.',
          routes: {}
        };
        fs.writeFileSync(requiredServerFilesPath, JSON.stringify(requiredServerFiles, null, 2));
        console.log('✅ Created required-server-files.json for static export');
      }
      
      // Set ELECTRON=1 environment variable for the build
      const buildEnv = { ...process.env, ELECTRON: '1' };
      execSync('npm run build', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        env: buildEnv
      });
      console.log('✅ Static files built successfully');
    } finally {
      // Restore API routes after build
      if (apiRoutesMoved && fs.existsSync(apiBackupDir)) {
        console.log('📦 Restoring API routes...');
        try {
          // Use retry mechanism for Windows permission issues
          retryOperation(() => {
            // Remove existing api directory if it exists
            if (fs.existsSync(apiDir)) {
              fs.rmSync(apiDir, { recursive: true, force: true });
              // Small delay to ensure Windows releases file handles
              sleep(500);
            }
            
            // Try rename first (faster)
            try {
              fs.renameSync(apiBackupDir, apiDir);
            } catch (renameError) {
              // If rename fails, use copy + delete approach (more reliable on Windows)
              console.log('   Using copy method for restoration (more reliable on Windows)...');
              copyDir(apiBackupDir, apiDir);
              // Remove backup after successful copy
              fs.rmSync(apiBackupDir, { recursive: true, force: true });
            }
          }, 5, 200);
          console.log('✅ API routes restored');
        } catch (error) {
          console.error('❌ Failed to restore API routes:', error.message);
          console.error('   The _api_backup folder still exists. You may need to manually restore it.');
          console.error('   Run: Move-Item -Path "app\\_api_backup" -Destination "app\\api" -Force');
          // Don't throw - allow build to continue
        }
      }
    }
    
    // Verify out folder exists
    const outDir = path.join(__dirname, '..', 'out');
    if (!fs.existsSync(outDir)) {
      throw new Error('out folder not found after build');
    }
    if (!fs.existsSync(path.join(outDir, 'index.html'))) {
      throw new Error('out/index.html not found after build');
    }
    console.log('✅ Verified static files in out/ folder');
    
    // Fix paths for Electron file:// protocol
    console.log('\n🔧 Fixing paths for Electron file:// protocol...');
    try {
      const { fixElectronPaths } = require('./fix-electron-paths');
      fixElectronPaths(outDir);
      console.log('✅ Path fixing complete');
    } catch (error) {
      console.error('❌ Failed to fix paths:', error.message);
      console.error('   The app may not work correctly with file:// protocol');
      throw error;
    }
  } catch (error) {
    console.error('❌ Failed to build static files:', error.message);
    console.error('   The app will still work but will require internet connection');
    throw error;
  }
  
  // Always embed API URL in preload script (required for production)
  console.log(`\nEmbedding API URL in preload script: ${electronApiUrl}`);
  const preloadPath = path.join(__dirname, '..', 'electron', 'preload.js');
  let preloadContent = fs.readFileSync(preloadPath, 'utf-8');
  
  // Replace the API URL in preload script
  // This ensures the API URL is hardcoded in the built app
  const normalizedApiUrl = electronApiUrl.replace(/\/$/, ''); // Remove trailing slash
  
  // Replace the API URL assignment (handles multi-line format)
  // Match: const apiUrl = process.env.ELECTRON_API_URL || ... || (isDev ? '' : DEFAULT_VERCEL_URL);
  const apiUrlPattern = /const apiUrl\s*=\s*process\.env\.ELECTRON_API_URL\s*\|\|[\s\S]*?process\.env\.NEXT_PUBLIC_API_URL\s*\|\|[\s\S]*?\(isDev\s*\?\s*''\s*:\s*DEFAULT_VERCEL_URL\)\s*;?/;
  if (apiUrlPattern.test(preloadContent)) {
    preloadContent = preloadContent.replace(
      apiUrlPattern,
      `const apiUrl = '${normalizedApiUrl}'; // Embedded at build time`
    );
  } else {
    console.warn('⚠️  Could not find apiUrl pattern in preload script - API URL may not be embedded');
  }
  
  // Also ensure the normalizedApiUrl uses the embedded value
  const normalizedPattern = /const normalizedApiUrl\s*=\s*apiUrl\s*\?\s*apiUrl\.replace\(\/\\\/\$\/,\s*''\)\s*:\s*''\s*;/;
  if (normalizedPattern.test(preloadContent)) {
    preloadContent = preloadContent.replace(
      normalizedPattern,
      `const normalizedApiUrl = '${normalizedApiUrl}'; // Embedded at build time`
    );
  } else {
    console.warn('⚠️  Could not find normalizedApiUrl pattern in preload script');
  }
  
  fs.writeFileSync(preloadPath, preloadContent, 'utf-8');
  console.log('✅ API URL embedded in preload script');
  
  // Run electron-builder
  console.log('\nBuilding Electron executable...');
  console.log('This will create a Windows installer (.exe) in the dist/ folder');
  
  // Use PowerShell-compatible environment variable setting
  const env = { ...process.env };
  // Always set ELECTRON_API_URL for electron-builder
  env.ELECTRON_API_URL = normalizedApiUrl;
  
  const builderCmd = 'electron-builder --win';
  console.log(`\nUsing API URL: ${normalizedApiUrl}`);
  console.log('This URL will be used for all API calls in the built application.');
  console.log('\n📦 Building Electron app (offline capable):');
  console.log('   ✅ App loads from local static files (works offline)');
  console.log('   ✅ Falls back to remote URL if local files not found');
  console.log('   ✅ API calls go to:', normalizedApiUrl);
  
  try {
    execSync(builderCmd, { 
      stdio: 'inherit', 
      cwd: path.join(__dirname, '..'),
      env: env
    });
  } finally {
    // Restore original preload script (for development)
    const preloadPath = path.join(__dirname, '..', 'electron', 'preload.js');
    const originalPreload = `const { contextBridge, ipcRenderer } = require('electron');

// Default Vercel URL for production builds
const DEFAULT_VERCEL_URL = 'https://hr-leave-portal.vercel.app';

// Get API URL from environment variable (set at build time or runtime)
// Priority: ELECTRON_API_URL > NEXT_PUBLIC_API_URL > DEFAULT_VERCEL_URL (production only)
// This allows the Electron app to point to a remote API server
// Detect dev mode without requiring electron-is-dev (which may not be available in production)
let isDev = false;
try {
  // Try to require electron-is-dev (works in development)
  isDev = require('electron-is-dev');
} catch (e) {
  // In production, electron-is-dev may not be available
  // Fall back to NODE_ENV check
  isDev = process.env.NODE_ENV === 'development';
}
const apiUrl = process.env.ELECTRON_API_URL || 
               process.env.NEXT_PUBLIC_API_URL || 
               (isDev ? '' : DEFAULT_VERCEL_URL);

// Normalize API URL (remove trailing slash)
const normalizedApiUrl = apiUrl ? apiUrl.replace(/\\/$/, '') : '';

// Expose protected methods that allow the renderer process
// to use Electron APIs without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform information
  platform: process.platform,
  versions: process.versions,
  
  // API URL for remote server connection
  apiUrl: normalizedApiUrl || null,
  
  // Example: Get app version
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Example: Send message to main process
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  
  // Example: Listen for messages from main process
  onMessage: (callback) => {
    ipcRenderer.on('message', (event, ...args) => callback(...args));
  },
  
  // Remove listener
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
  
  // Database IPC handlers for offline-first functionality
  // These enable queuing operations when offline and syncing when online
  db: {
    // Add item to sync queue (for offline operations)
    addToSyncQueue: (tableName, operation, recordId, payload) => 
      ipcRenderer.invoke('db-add-to-sync-queue', tableName, operation, recordId, payload),
    
    // Get sync queue items
    getSyncQueue: (limit = 50) => 
      ipcRenderer.invoke('db-get-sync-queue', limit),
    
    // Remove item from sync queue
    removeFromSyncQueue: (id) => 
      ipcRenderer.invoke('db-remove-from-sync-queue', id),
    
    // Increment retry count for sync queue item
    incrementSyncQueueRetry: (id, error) => 
      ipcRenderer.invoke('db-increment-sync-queue-retry', id, error),
    
    // Get last sync time
    getLastSyncTime: () => 
      ipcRenderer.invoke('db-get-last-sync-time'),
    
    // Set last sync time
    setLastSyncTime: (timestamp) => 
      ipcRenderer.invoke('db-set-last-sync-time', timestamp),
    
    // Mark record as synced
    markSynced: (tableName, recordId) => 
      ipcRenderer.invoke('db-mark-synced', tableName, recordId),
    
    // Upsert record (insert or update)
    upsertRecord: (tableName, record) => 
      ipcRenderer.invoke('db-upsert-record', tableName, record),
    
    // Get record by ID
    getRecord: (tableName, recordId) => 
      ipcRenderer.invoke('db-get-record', tableName, recordId),
    
    // Get all records from table
    getAllRecords: (tableName, limit = 1000) => 
      ipcRenderer.invoke('db-get-all-records', tableName, limit),
    
    // Delete record
    deleteRecord: (tableName, recordId) => 
      ipcRenderer.invoke('db-delete-record', tableName, recordId),
  },
  
  // Check if running in Electron
  isElectron: true,
});

// Always expose API URL directly on window for easier access
// This is safe because we control the value
// In production, this will always have a value (either from env or default Vercel URL)
if (normalizedApiUrl) {
  contextBridge.exposeInMainWorld('__ELECTRON_API_URL__', normalizedApiUrl);
  console.log('[Preload] Electron API URL configured:', normalizedApiUrl);
} else {
  console.log('[Preload] Development mode - using relative URLs (localhost)');
  // Still expose empty string so the app knows it's in Electron
  contextBridge.exposeInMainWorld('__ELECTRON_API_URL__', '');
}

// Log that preload script has loaded
console.log('[Preload] Electron preload script loaded');
console.log('[Preload] Environment:', isDev ? 'development' : 'production');
`;
    fs.writeFileSync(preloadPath, originalPreload, 'utf-8');
    console.log('✅ Preload script restored to development version');
  }
  
  console.log('\n✅ Build completed successfully!');
  console.log('📦 Installer location: dist/HR Leave Portal Setup 1.0.0.exe');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

