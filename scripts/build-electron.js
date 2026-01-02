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

console.log('Building Electron app for remote API only...');
console.log('The Electron app will load from remote URL and use remote API.');
console.log('✅ App requires internet connection.');

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
  // Can be overridden via ELECTRON_DEFAULT_API_URL environment variable
  // Priority: ELECTRON_API_URL > NEXT_PUBLIC_API_URL > ELECTRON_DEFAULT_API_URL > hardcoded default
  const DEFAULT_VERCEL_URL = process.env.ELECTRON_DEFAULT_API_URL || 'https://hr-leave-portal.vercel.app';
  
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
  
  // No static export needed - app will load from remote URL
  console.log('\n📦 Building Electron app for remote URL only...');
  console.log('   App will load from:', electronApiUrl);
  console.log('   No local static files will be bundled');
  
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
  console.log('This URL will be used for all API calls and UI loading in the built application.');
  console.log('\n📦 Building Electron app (remote URL only):');
  console.log('   ✅ App loads from remote URL:', normalizedApiUrl);
  console.log('   ✅ API calls go to:', normalizedApiUrl);
  console.log('   ⚠️  Internet connection required');
  
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
// Can be overridden via ELECTRON_DEFAULT_API_URL environment variable
const DEFAULT_VERCEL_URL = process.env.ELECTRON_DEFAULT_API_URL || 'https://hr-leave-portal.vercel.app';

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

