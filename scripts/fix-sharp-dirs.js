/**
 * Fix sharp directory scanning issue
 * Creates empty directories that electron-builder expects
 */

const fs = require('fs');
const path = require('path');

const nodeModulesPath = path.join(__dirname, '..', 'node_modules', '@img');
const sharpDirs = [
  'sharp-darwin-arm64',
  'sharp-darwin-x64',
  'sharp-linux-arm64',
  'sharp-linux-x64',
  'sharp-win32-ia32'
];

console.log('Fixing sharp directories for electron-builder...');

if (!fs.existsSync(nodeModulesPath)) {
  console.log('node_modules/@img not found, skipping...');
  process.exit(0);
}

sharpDirs.forEach(dir => {
  const dirPath = path.join(nodeModulesPath, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    // Create a dummy file so directory is not empty
    fs.writeFileSync(path.join(dirPath, '.gitkeep'), '');
    console.log(`Created: ${dir}`);
  }
});

console.log('✅ Done');

