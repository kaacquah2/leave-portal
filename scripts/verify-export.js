#!/usr/bin/env node
/**
 * Verifies that Next.js static export completed successfully
 * Checks that the out directory contains expected files
 * Also restores API folder after verification
 */

const fs = require('fs');
const path = require('path');
const { restoreApi, restoreMiddleware } = require('./disable-api-for-tauri');

const outDir = path.join(__dirname, '..', 'out');

function verifyExport() {
  console.log('\n🔍 Verifying Next.js static export...\n');
  
  // Check if out directory exists
  if (!fs.existsSync(outDir)) {
    console.error('✗ ERROR: out directory does not exist!');
    console.error('  Expected location:', outDir);
    console.error('  This means Next.js static export did not complete.');
    process.exit(1);
  }
  
  // Check for index.html
  const indexHtml = path.join(outDir, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    console.error('✗ ERROR: index.html not found in out directory!');
    console.error('  Expected location:', indexHtml);
    console.error('  This means Next.js static export did not complete.');
    process.exit(1);
  }
  
  // Check for _next directory (contains JS/CSS bundles)
  const nextDir = path.join(outDir, '_next');
  if (!fs.existsSync(nextDir)) {
    console.warn('⚠ WARNING: _next directory not found in out directory!');
    console.warn('  This might indicate the export is incomplete.');
  }
  
  // Count files in out directory
  try {
    const files = fs.readdirSync(outDir, { recursive: true });
    const fileCount = files.length;
    console.log('✓ Static export completed successfully!');
    console.log(`  - out directory exists: ${outDir}`);
    console.log(`  - index.html found: ${indexHtml}`);
    console.log(`  - Total files exported: ${fileCount}`);
    if (fs.existsSync(nextDir)) {
      console.log(`  - _next directory found: ${nextDir}`);
    }
    console.log('');
  } catch (error) {
    console.error('✗ ERROR: Failed to read out directory:', error.message);
    process.exit(1);
  }
}

// Check if .next directory exists and has build output
function checkNextBuild() {
  const nextDir = path.join(__dirname, '..', '.next');
  if (fs.existsSync(nextDir)) {
    console.log('ℹ Found .next directory - build completed but export may have failed');
    console.log('  This might indicate Next.js exported to a different location or export failed silently');
  }
}

// Run both checks
verifyExport();
checkNextBuild();

// Restore API folder and middleware after verification
restoreApi();
restoreMiddleware();

