#!/usr/bin/env node
/**
 * Clean .next directory before Tauri build
 * 
 * CRITICAL: Next.js caches route information in .next/server/app/
 * If API routes were present in a previous build, they'll still be referenced
 * even if we move the API folder. We must clean .next before building.
 */

const fs = require('fs');
const path = require('path');

const nextDir = path.join(process.cwd(), '.next');

function cleanNextCache() {
  if (fs.existsSync(nextDir)) {
    console.log('[Tauri Build] Cleaning .next cache directory...');
    try {
      fs.rmSync(nextDir, { recursive: true, force: true });
      console.log('[Tauri Build] ✅ .next directory cleaned');
    } catch (error) {
      console.error('[Tauri Build] ⚠️  Failed to clean .next directory:', error.message);
      console.error('[Tauri Build] ⚠️  You may need to manually delete .next directory');
      process.exit(1);
    }
  } else {
    console.log('[Tauri Build] ✅ .next directory does not exist (already clean)');
  }
}

if (require.main === module) {
  cleanNextCache();
}

module.exports = { cleanNextCache };

