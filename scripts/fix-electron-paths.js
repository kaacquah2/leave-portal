const fs = require('fs');
const path = require('path');

/**
 * Fix paths in a file content (HTML or JavaScript)
 * Converts absolute paths (starting with /) to relative paths
 */
function fixPathsInContent(content, filePath) {
  let modified = false;
  
  // Fix absolute paths in JavaScript strings: /_next/static/... to ./_next/static/...
  // This handles webpack chunk loading, dynamic imports, and __webpack_require__
  // Pattern: "/_next/static/..." in quotes
  content = content.replace(/(["'])\/(_next\/static\/[^"']+)(["'])/g, (match, quote1, path, quote2) => {
    if (!path.startsWith('./') && !path.startsWith('../') && !path.startsWith('http')) {
      modified = true;
      return `${quote1}./${path}${quote2}`;
    }
    return match;
  });
  
  // Fix webpack publicPath references: __webpack_require__.p + "/_next/static/..."
  // This is how webpack loads chunks dynamically
  content = content.replace(/__webpack_require__\.p\s*\+\s*["']\/(_next\/static\/[^"']+)["']/g, (match, path) => {
    modified = true;
    return `__webpack_require__.p + "./${path}"`;
  });
  
  // Fix absolute paths in script/link tags: /_next/static/... to ./_next/static/...
  content = content.replace(/(href|src)=["'](\/_next\/[^"']+)["']/g, (match, attr, path) => {
    if (!path.startsWith('./') && !path.startsWith('../')) {
      modified = true;
      return `${attr}="./${path.substring(1)}"`;
    }
    return match;
  });
  
  // Fix image paths in public folder (e.g., /mofa-logo.png)
  // Fix in HTML attributes (href/src)
  content = content.replace(/(href|src)=["'](\/(?:mofa-logo|icon|manifest|sw|workbox)[^"']*)["']/g, (match, attr, path) => {
    if (!path.startsWith('./') && !path.startsWith('../') && !path.startsWith('http')) {
      modified = true;
      return `${attr}="./${path.substring(1)}"`;
    }
    return match;
  });
  
  // Fix image paths in JavaScript strings (e.g., "/mofa-logo.png" in JS code)
  // This handles Next.js Image component paths that might be in JavaScript bundles
  content = content.replace(/(["'])\/(mofa-logo|icon|manifest|sw|workbox[^"']*)\.(png|jpg|jpeg|svg|gif|webp|ico|json|js)(["'])/g, (match, quote1, name, ext, quote2) => {
    if (!name.startsWith('./') && !name.startsWith('../') && !name.startsWith('http')) {
      modified = true;
      return `${quote1}./${name}.${ext}${quote2}`;
    }
    return match;
  });
  
  // Fix webpack publicPath assignment to use relative path
  // __webpack_require__.p = "/_next/static/..." -> __webpack_require__.p = "./_next/static/..."
  content = content.replace(/__webpack_require__\.p\s*=\s*["']\/(_next\/static\/[^"']+)["']/g, (match, path) => {
    modified = true;
    return `__webpack_require__.p = "./${path}"`;
  });
  
  // Fix base tag - ensure it's relative
  // Fix CSS preload links - convert to regular stylesheet links to avoid browser warnings
  // This prevents "preloaded but not used" warnings for CSS files in Electron
  content = content.replace(
    /<link\s+rel=["']preload["']\s+href=["']([^"']*\.css[^"']*)["']\s+as=["']style["']\s*\/?>/gi,
    (match, href) => {
      modified = true;
      // Ensure href is relative (should already be fixed by earlier regex, but be safe)
      let fixedHref = href;
      if (href.startsWith('/') && !href.startsWith('./') && !href.startsWith('../')) {
        fixedHref = `./${href.substring(1)}`;
      }
      // Convert preload to regular stylesheet link
      return `<link rel="stylesheet" href="${fixedHref}">`;
    }
  );
  
  content = content.replace(/<base\s+href=["']\/["']/g, '<base href="./"');
  
  return { content, modified };
}

/**
 * Recursively fix paths in all files in a directory
 */
function fixPathsInDirectory(dir, relativePath = '') {
  if (!fs.existsSync(dir)) {
    return;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let totalFixed = 0;
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(relativePath, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively process subdirectories
      const fixed = fixPathsInDirectory(fullPath, relPath);
      totalFixed += fixed;
    } else if (entry.isFile()) {
      // Process JavaScript and HTML files
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.js' || ext === '.html' || ext === '.json') {
        try {
          let content = fs.readFileSync(fullPath, 'utf-8');
          const { content: fixedContent, modified } = fixPathsInContent(content, fullPath);
          
          if (modified) {
            fs.writeFileSync(fullPath, fixedContent, 'utf-8');
            totalFixed++;
            console.log(`  ✅ Fixed paths in: ${relPath}`);
          }
        } catch (error) {
          // Skip files that can't be read (binary files, etc.)
          if (error.code !== 'EISDIR') {
            console.warn(`  ⚠️  Could not process ${relPath}: ${error.message}`);
          }
        }
      }
    }
  }
  
  return totalFixed;
}

/**
 * Fix HTML paths for Electron file:// protocol
 * Converts absolute paths (starting with /) to relative paths
 */
function fixElectronPaths(outDir) {
  console.log('Fixing paths for Electron file:// protocol...');
  
  const indexHtmlPath = path.join(outDir, 'index.html');
  
  if (!fs.existsSync(indexHtmlPath)) {
    console.warn('⚠️  index.html not found, skipping path fixes');
    return;
  }
  
  // Fix HTML file
  let html = fs.readFileSync(indexHtmlPath, 'utf-8');
  let htmlModified = false;
  
  const { content: fixedHtml, modified: htmlWasModified } = fixPathsInContent(html, indexHtmlPath);
  htmlModified = htmlWasModified;
  
  // Ensure there's a base tag for file:// protocol
  if (!fixedHtml.includes('<base')) {
    const htmlWithBase = fixedHtml.replace(/<head>/, '<head>\n  <base href="./">');
    if (htmlWithBase !== fixedHtml) {
      html = htmlWithBase;
      htmlModified = true;
    } else {
      html = fixedHtml;
    }
  } else {
    html = fixedHtml;
  }
  
  if (htmlModified) {
    fs.writeFileSync(indexHtmlPath, html, 'utf-8');
    console.log('✅ Fixed paths in index.html');
  }
  
  // Fix paths in all JavaScript files in _next/static directory
  const nextStaticDir = path.join(outDir, '_next', 'static');
  if (fs.existsSync(nextStaticDir)) {
    console.log('Fixing paths in JavaScript chunks...');
    const fixedCount = fixPathsInDirectory(nextStaticDir, '_next/static');
    if (fixedCount > 0) {
      console.log(`✅ Fixed paths in ${fixedCount} JavaScript file(s)`);
    } else {
      console.log('ℹ️  No JavaScript files needed path fixes');
    }
  }
  
  console.log('✅ Path fixing complete');
}

// Run if called directly
if (require.main === module) {
  const outDir = process.argv[2] || path.join(__dirname, '..', 'out');
  fixElectronPaths(outDir);
}

module.exports = { fixElectronPaths };

