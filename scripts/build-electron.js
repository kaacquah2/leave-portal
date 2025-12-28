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
  // Run the build
  console.log('Running Next.js build (static export)...');
  execSync('cross-env ELECTRON=1 npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  
  // Run electron-builder
  console.log('Building Electron executable...');
  console.log('This will create a Windows installer (.exe) in the dist/ folder');
  const electronApiUrl = process.env.ELECTRON_API_URL || '';
  
  // Use PowerShell-compatible environment variable setting
  const env = { ...process.env };
  if (electronApiUrl) {
    env.ELECTRON_API_URL = electronApiUrl;
  }
  
  const builderCmd = 'electron-builder --win';
  console.log('Note: If ELECTRON_API_URL is not set, the app will use localhost');
  if (electronApiUrl) {
    console.log(`Using API URL: ${electronApiUrl}`);
  }
  
  execSync(builderCmd, { 
    stdio: 'inherit', 
    cwd: path.join(__dirname, '..'),
    env: env
  });
  
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

