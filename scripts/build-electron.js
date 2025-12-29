const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiDir = path.join(__dirname, '..', 'app', 'api');
const apiBackupDir = path.join(__dirname, '..', 'app', '_api_backup');

console.log('Building Electron app...');
console.log('Note: API routes will be temporarily excluded from static build');
console.log('The Electron app should connect to a remote API server.');

// Fix sharp directories issue
try {
  require('./fix-sharp-dirs.js');
} catch (error) {
  console.log('Note: Could not fix sharp directories (non-critical)');
}

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

// Copy API directory to backup location (more reliable than rename on Windows)
if (fs.existsSync(apiDir)) {
  if (fs.existsSync(apiBackupDir)) {
    fs.rmSync(apiBackupDir, { recursive: true, force: true });
  }
  // Use copy instead of rename to avoid permission issues
  copyDirSync(apiDir, apiBackupDir);
  console.log('API routes backed up');
  
  // Remove API directory for build
  fs.rmSync(apiDir, { recursive: true, force: true });
  console.log('API routes temporarily removed for static build');
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
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
  
  // Run the build
  console.log('\nRunning Next.js build (static export)...');
  console.log('This will create static files in the "out" folder for offline capability.');
  execSync('cross-env ELECTRON=1 npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  
  // Verify static files were created
  const outDir = path.join(__dirname, '..', 'out');
  const indexHtml = path.join(outDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    console.log('✅ Static files created successfully in "out" folder');
    console.log('   The app will work OFFLINE by loading from these local files');
    console.log('   API calls will still go to:', electronApiUrl);
    
    // Fix HTML paths for Electron file:// protocol
    console.log('\nFixing HTML paths for Electron file:// protocol...');
    try {
      const { fixElectronPaths } = require('./fix-electron-paths.js');
      fixElectronPaths(outDir);
    } catch (error) {
      console.warn('⚠️  Could not fix HTML paths (non-critical):', error.message);
    }
  } else {
    console.warn('⚠️  WARNING: Static files not found in "out" folder');
    console.warn('   The app will require internet connection to load');
  }
  
  // Always embed API URL in preload script (required for production)
  console.log(`\nEmbedding API URL in preload script: ${electronApiUrl}`);
  const preloadPath = path.join(__dirname, '..', 'electron', 'preload.js');
  let preloadContent = fs.readFileSync(preloadPath, 'utf-8');
  
  // Replace the API URL in preload script
  // This ensures the API URL is hardcoded in the built app
  const normalizedApiUrl = electronApiUrl.replace(/\/$/, ''); // Remove trailing slash
  
  // Replace the line that gets API URL from environment
  // Handle both the old format and the new try-catch format
  preloadContent = preloadContent.replace(
    /const apiUrl = process\.env\.ELECTRON_API_URL \|\|[\s\S]*?process\.env\.NEXT_PUBLIC_API_URL \|\|[\s\S]*?isDev \? '' : DEFAULT_VERCEL_URL\);?/,
    `const apiUrl = '${normalizedApiUrl}'; // Embedded at build time`
  );
  
  // Also ensure the normalizedApiUrl uses the embedded value
  preloadContent = preloadContent.replace(
    /const normalizedApiUrl = apiUrl \? apiUrl\.replace\(\/\\\/\$\/, ''\) : '';/,
    `const normalizedApiUrl = '${normalizedApiUrl}'; // Embedded at build time`
  );
  
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
  console.log('\n📦 Building Electron app with offline capability:');
  console.log('   ✅ Static files bundled (works offline)');
  console.log('   ✅ API calls go to:', normalizedApiUrl);
  console.log('   ✅ App works with OR without internet');
  
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
} finally {
  // Restore API directory
  if (fs.existsSync(apiBackupDir)) {
    if (fs.existsSync(apiDir)) {
      fs.rmSync(apiDir, { recursive: true, force: true });
    }
    // Use copy to restore
    copyDirSync(apiBackupDir, apiDir);
    fs.rmSync(apiBackupDir, { recursive: true, force: true });
    console.log('API routes restored');
  }
}

