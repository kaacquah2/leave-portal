/**
 * Verify that all required offline functionality files are included in build
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  // Core Electron files
  'electron/main.js',
  'electron/preload.js',
  
  // Offline functionality
  'electron/database-encrypted.js',
  'electron/sync-engine.js',
  'electron/background-sync.js',
  'electron/offline-session.js',
  'electron/offline-approvals.js',
  'electron/conflict-resolver.js',
  'electron/bootstrap.js',
  'electron/disaster-recovery.js',
  'electron/token-expiry-enforcer.js',
  'electron/auto-updater.js',
  'electron/ipc-repository-handlers.js',
  'electron/ipc-handlers.js',
  'electron/window-manager.js',
  'electron/logger.js',
  'electron/error-reporter.js',
  'electron/utils.js',
  'electron/security.js',
  'electron/protocol-handler.js',
  'electron/auth-storage.js',
  'electron/incremental-sync.js',
  'electron/sync-compression.js',
  
  // Migrations
  'electron/migrations/001_initial_schema.sql',
  'electron/migrations/002_complete_offline_schema.sql',
  'electron/migrations/003_seed_static_data.sql',
  
  // Compiled repositories
  'electron/repositories-compiled/base-repository.js',
  'electron/repositories-compiled/employee-repository.js',
  'electron/repositories-compiled/leave-request-repository.js',
  'electron/repositories-compiled/leave-balance-repository.js',
  'electron/repositories-compiled/audit-log-repository.js',
];

const projectRoot = path.join(__dirname, '..');
let allFound = true;
const missing = [];

console.log('Verifying build files...\n');

for (const file of requiredFiles) {
  const fullPath = path.join(projectRoot, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    missing.push(file);
    allFound = false;
  }
}

console.log('\n' + '='.repeat(60));

if (allFound) {
  console.log('✅ All required files are present!');
  process.exit(0);
} else {
  console.log(`❌ ${missing.length} file(s) missing:`);
  missing.forEach(file => console.log(`   - ${file}`));
  process.exit(1);
}

