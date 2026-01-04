#!/usr/bin/env node
/**
 * Ensures the out directory exists before building
 * This is required for Tauri static exports
 */

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');

try {
  // Create directory if it doesn't exist
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
    console.log('✓ Created out directory:', outDir);
  } else {
    console.log('✓ out directory already exists:', outDir);
  }
  
  // Verify the directory is writable
  try {
    const testFile = path.join(outDir, '.test-write');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('✓ out directory is writable');
  } catch (writeError) {
    console.warn('⚠ Warning: out directory may not be writable:', writeError.message);
  }
} catch (error) {
  console.error('✗ Failed to create out directory:', error.message);
  process.exit(1);
}

