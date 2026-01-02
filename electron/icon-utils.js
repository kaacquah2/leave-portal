/**
 * Icon path resolution utilities for Electron
 */

const path = require('path');
const fs = require('fs');

/**
 * Get icon path for current platform
 * 
 * @param {string} baseDir - Base directory for icon files (default: __dirname)
 * @returns {string|undefined} Icon path or undefined if not found
 */
function getIconPath(baseDir = __dirname) {
  const iconPaths = {
    win32: path.join(baseDir, '../public/mofa.ico'),
    darwin: path.join(baseDir, '../public/icon.icns'),
    default: path.join(baseDir, '../public/icon.png'),
  };

  const platformIcon = iconPaths[process.platform] || iconPaths.default;
  const fallbacks = [
    platformIcon,
    path.join(baseDir, '../public/icon.ico'),
    path.join(baseDir, '../public/icon-256x256.png'),
    path.join(baseDir, '../public/icon.png'),
    path.join(baseDir, '../public/mofa-logo.png'),
  ];

  for (const iconPath of fallbacks) {
    if (fs.existsSync(iconPath)) {
      return iconPath;
    }
  }

  return undefined;
}

/**
 * Get all available icon paths (for testing/debugging)
 * 
 * @param {string} baseDir - Base directory for icon files (default: __dirname)
 * @returns {Array<{path: string, exists: boolean}>} Array of icon paths with existence status
 */
function getAllIconPaths(baseDir = __dirname) {
  const iconPaths = {
    win32: path.join(baseDir, '../public/mofa.ico'),
    darwin: path.join(baseDir, '../public/icon.icns'),
    default: path.join(baseDir, '../public/icon.png'),
  };

  const fallbacks = [
    iconPaths[process.platform] || iconPaths.default,
    path.join(baseDir, '../public/icon.ico'),
    path.join(baseDir, '../public/icon-256x256.png'),
    path.join(baseDir, '../public/icon.png'),
    path.join(baseDir, '../public/mofa-logo.png'),
  ];

  return fallbacks.map(iconPath => ({
    path: iconPath,
    exists: fs.existsSync(iconPath),
  }));
}

module.exports = {
  getIconPath,
  getAllIconPaths,
};

