/**
 * Custom protocol handler for app:// scheme
 */

const { protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

/**
 * Setup custom app:// protocol
 */
function setupProtocol() {
  if (protocol.isProtocolRegistered('app')) {
    return;
  }

  protocol.registerFileProtocol('app', (request, callback) => {
    // Remove 'app://' prefix
    let url = request.url.replace(/^app:\/\/+/, '');
    if (!url.startsWith('/')) {
      url = '/' + url;
    }
    
    // Find out directory
    const possibleOutDirs = [
      path.join(process.resourcesPath || app.getAppPath(), 'app', 'out'),
      path.join(process.resourcesPath || app.getAppPath(), 'out'),
      path.join(app.getAppPath(), 'out'),
      path.join(__dirname, '..', 'out'),
    ];
    
    let outDir = null;
    for (const dir of possibleOutDirs) {
      if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.html'))) {
        outDir = dir;
        break;
      }
    }
    
    if (!outDir) {
      callback({ error: -6 }); // ERR_FILE_NOT_FOUND
      return;
    }
    
    // Remove leading slash
    let urlPath = url.startsWith('/') ? url.substring(1) : url;
    
    // Security: Prevent path traversal
    if (urlPath.includes('..')) {
      callback({ error: -6 });
      return;
    }
    
    // Fix double _next paths
    urlPath = urlPath.replace(/^_next\/_next\//, '_next/');
    
    // Handle relative paths
    if (urlPath.startsWith('./')) {
      urlPath = urlPath.substring(2);
    }
    
    // Normalize path
    const filePath = path.normalize(path.join(outDir, urlPath));
    
    // Security: Ensure path is within out directory
    const normalizedOutDir = path.resolve(outDir);
    const resolvedFilePath = path.resolve(filePath);
    
    if (!resolvedFilePath.startsWith(normalizedOutDir + path.sep) && 
        resolvedFilePath !== normalizedOutDir) {
      callback({ error: -6 });
      return;
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // Try to fix double _next issue
      if (urlPath.includes('_next/_next/')) {
        const fixedPath = filePath.replace(/[\\/]_next[\\/]_next[\\/]/g, path.sep + '_next' + path.sep);
        if (fs.existsSync(fixedPath)) {
          callback({ path: fixedPath });
          return;
        }
      }
      callback({ error: -6 });
      return;
    }
    
    callback({ path: filePath });
  });
}

/**
 * Register protocol schemes as privileged
 */
function registerSchemes() {
  protocol.registerSchemesAsPrivileged([
    { 
      scheme: 'app', 
      privileges: { 
        secure: true,
        standard: true,
        supportFetchAPI: true,
        corsEnabled: false,
        stream: true
      } 
    }
  ]);
}

module.exports = {
  setupProtocol,
  registerSchemes,
};

