const fs = require('fs');
const path = require('path');

/**
 * Fix HTML paths for Electron file:// protocol
 * Converts absolute paths (starting with /) to relative paths
 */
function fixElectronPaths(outDir) {
  console.log('Fixing HTML paths for Electron file:// protocol...');
  
  const indexHtmlPath = path.join(outDir, 'index.html');
  
  if (!fs.existsSync(indexHtmlPath)) {
    console.warn('⚠️  index.html not found, skipping path fixes');
    return;
  }
  
  let html = fs.readFileSync(indexHtmlPath, 'utf-8');
  let modified = false;
  
  // Fix script and link tags with absolute paths
  // Convert /_next/static/... to ./_next/static/...
  html = html.replace(/(href|src)=["'](\/_next\/[^"']+)["']/g, (match, attr, path) => {
    if (!path.startsWith('./') && !path.startsWith('../')) {
      modified = true;
      return `${attr}="./${path.substring(1)}"`;
    }
    return match;
  });
  
  // Also fix any base tag that might have absolute path
  html = html.replace(/<base\s+href=["']\/["']/g, '<base href="./"');
  
  // Ensure there's a base tag for file:// protocol
  if (!html.includes('<base')) {
    // Insert base tag after <head>
    html = html.replace(/<head>/, '<head>\n  <base href="./">');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(indexHtmlPath, html, 'utf-8');
    console.log('✅ Fixed HTML paths for Electron file:// protocol');
  } else {
    console.log('ℹ️  No path fixes needed');
  }
}

// Run if called directly
if (require.main === module) {
  const outDir = process.argv[2] || path.join(__dirname, '..', 'out');
  fixElectronPaths(outDir);
}

module.exports = { fixElectronPaths };

