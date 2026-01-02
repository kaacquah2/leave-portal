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
  // Since we set __webpack_require__.p to "./", we need to ensure paths are relative
  // __webpack_require__.p + "/_next/static/..." -> __webpack_require__.p + "./_next/static/..."
  // But if __webpack_require__.p is already "./", then we just need "./_next/static/..."
  content = content.replace(/__webpack_require__\.p\s*\+\s*["']\/(_next\/static\/[^"']+)["']/g, (match, path) => {
    modified = true;
    return `__webpack_require__.p + "./${path}"`;
  });
  
  // Fix cases where publicPath might be concatenated with absolute paths
  // __webpack_require__.p + "/_next/" -> __webpack_require__.p + "./_next/"
  content = content.replace(/__webpack_require__\.p\s*\+\s*["']\/(_next\/[^"']*)["']/g, (match, path) => {
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
  
  // Fix paths missing _next directory: "./static/chunks/..." -> "./_next/static/chunks/..."
  // This fixes script tags that reference chunks without _next (Next.js 16 issue)
  content = content.replace(/(src|href)=["']\.\/(static\/[^"']+)["']/g, (match, attr, path) => {
    if (!path.startsWith('_next/') && !path.startsWith('../') && !path.startsWith('http')) {
      modified = true;
      return `${attr}="./_next/${path}"`;
    }
    return match;
  });
  
  // Fix image paths in public folder (e.g., /mofa-logo.png, /icon-192x192.png, /manifest.json)
  // Fix in HTML attributes (href/src) and in JSON/JavaScript strings
  content = content.replace(/(href|src)=["'](\/(?:mofa-logo|icon|manifest|sw|workbox)[^"']*)["']/g, (match, attr, path) => {
    if (!path.startsWith('./') && !path.startsWith('../') && !path.startsWith('http')) {
      modified = true;
      return `${attr}="./${path.substring(1)}"`;
    }
    return match;
  });
  
  // Fix absolute paths in JSON/JavaScript strings: "/manifest.json" -> "./manifest.json"
  // This handles paths in inline script data
  content = content.replace(/(["'])\/(manifest\.json|icon[^"']*|mofa-logo[^"']*)(["'])/g, (match, quote1, file, quote2) => {
    if (!file.startsWith('./') && !file.startsWith('../') && !file.startsWith('http')) {
      modified = true;
      return `${quote1}./${file}${quote2}`;
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
  
  // Fix webpack publicPath assignment to use relative path "./"
  // This is critical - webpack publicPath must be "./" for file:// protocol
  // __webpack_require__.p = "/_next/static/..." -> __webpack_require__.p = "./"
  // __webpack_require__.p = "/_next/" -> __webpack_require__.p = "./"
  // __webpack_require__.p = "./_next/" -> __webpack_require__.p = "./" (fix double _next issue)
  // __webpack_require__.p = "/" -> __webpack_require__.p = "./"
  content = content.replace(/__webpack_require__\.p\s*=\s*["']\/[^"']*["']/g, (match) => {
    modified = true;
    return `__webpack_require__.p = "./"`;
  });
  
  // Fix webpack publicPath that might be set to "./_next/" (causes double _next)
  content = content.replace(/__webpack_require__\.p\s*=\s*["']\.\/_next\/[^"']*["']/g, (match) => {
    modified = true;
    return `__webpack_require__.p = "./"`;
  });
  
  // Fix webpack publicPath with template literals or other patterns
  // __webpack_require__.p = `/_next/static/...` -> __webpack_require__.p = "./"
  content = content.replace(/__webpack_require__\.p\s*=\s*`\/[^`]*`/g, (match) => {
    modified = true;
    return `__webpack_require__.p = "./"`;
  });
  
  // Fix webpack publicPath with template literals that include _next
  content = content.replace(/__webpack_require__\.p\s*=\s*`\.\/_next\/[^`]*`/g, (match) => {
    modified = true;
    return `__webpack_require__.p = "./"`;
  });
  
  // Fix webpack publicPath initialization patterns
  // var __webpack_public_path__ = "/_next/static/..." -> var __webpack_public_path__ = "./"
  content = content.replace(/(var|let|const)\s+__webpack_public_path__\s*=\s*["']\/[^"']*["']/g, (match) => {
    modified = true;
    return match.replace(/["']\/[^"']*["']/, '"./"');
  });
  
  // Fix webpack publicPath that might be set via assignment without quotes (rare but possible)
  // __webpack_require__.p = "/_next/static/" -> __webpack_require__.p = "./"
  // This handles cases where the path might be in a variable or expression
  content = content.replace(/__webpack_require__\.p\s*=\s*\/[^;,\s\)\]]+/g, (match) => {
    if (!match.includes('"./"') && !match.includes("'./'") && !match.includes('./')) {
      modified = true;
      return `__webpack_require__.p = "./"`;
    }
    return match;
  });
  
  // Fix Next.js 16 inline script data: "433","./static/chunks/..." -> "433","./_next/static/chunks/..."
  // This handles the self.__next_f.push data that references chunks (missing _next)
  // Pattern: "number","./static/chunks/..." or "number","./static/chunks/app/..."
  content = content.replace(/(["'])(\d+)(["'],\s*["'])\.\/(static\/[^"']+)(["'])/g, (match, quote1, num, quote2, chunkPath, quote3) => {
    if (!chunkPath.startsWith('_next/') && !chunkPath.startsWith('../') && !chunkPath.startsWith('http')) {
      modified = true;
      return `${quote1}${num}${quote2}./_next/${chunkPath}${quote3}`;
    }
    return match;
  });
  
  // Fix Next.js 16 inline script data: "433","static/chunks/..." -> "433","./_next/static/chunks/..."
  // This handles the self.__next_f.push data that references chunks (absolute paths)
  // Pattern: "number","static/chunks/..." or "number","static/chunks/app/..."
  content = content.replace(/(["'])(\d+)(["'],\s*["'])(static\/[^"']+)(["'])/g, (match, quote1, num, quote2, chunkPath, quote3) => {
    if (!chunkPath.startsWith('./') && !chunkPath.startsWith('../') && !chunkPath.startsWith('http') && !chunkPath.startsWith('_next/')) {
      modified = true;
      return `${quote1}${num}${quote2}./_next/${chunkPath}${quote3}`;
    }
    return match;
  });
  
  // Fix Next.js chunk loading patterns that might have double _next
  // Pattern: "number","./_next/_next/static/..." -> "number","./_next/static/..."
  content = content.replace(/(["'])(\d+)(["'],\s*["'])\.\/_next\/_next\//g, '$1$2$3./_next/');
  
  // Fix Next.js chunk loading with absolute paths that have double _next
  // Pattern: "number","/_next/_next/static/..." -> "number","./_next/static/..."
  content = content.replace(/(["'])(\d+)(["'],\s*["'])\/_next\/_next\//g, '$1$2$3./_next/');
  
  // Fix paths in JSON-like structures within strings: "./static/chunks/..." -> "./_next/static/chunks/..."
  // This catches any remaining "./static/..." patterns that are missing _next
  content = content.replace(/(["'])\.\/(static\/[^"']+)(["'])/g, (match, quote1, path, quote2) => {
    // Only fix if it's missing _next and not part of a URL
    if (!path.startsWith('_next/') && !path.startsWith('../') && !path.startsWith('http') && !path.includes('://')) {
      modified = true;
      return `${quote1}./_next/${path}${quote2}`;
    }
    return match;
  });
  
  // Fix paths in JSON-like structures within strings: "static/chunks/..." -> "./_next/static/chunks/..."
  // This catches any remaining "static/..." patterns that aren't already relative
  content = content.replace(/(["'])(static\/[^"']+)(["'])/g, (match, quote1, path, quote2) => {
    // Only fix if it's not already relative and not part of a URL
    if (!path.startsWith('./') && !path.startsWith('../') && !path.startsWith('http') && !path.includes('://') && !path.startsWith('_next/')) {
      modified = true;
      return `${quote1}./_next/${path}${quote2}`;
    }
    return match;
  });
  
  // Fix service worker precache paths: {url:"/_next/static/..." -> {url:"./_next/static/..."
  content = content.replace(/(\{url:\s*["'])\/(_next\/static\/[^"']+)(["'])/g, (match, prefix, path, suffix) => {
    if (!path.startsWith('./') && !path.startsWith('../') && !path.startsWith('http')) {
      modified = true;
      return `${prefix}./${path}${suffix}`;
    }
    return match;
  });
  
  // Fix absolute paths in template literals or other contexts: `/_next/static/...` -> `./_next/static/...`
  content = content.replace(/`\/(_next\/static\/[^`]+)`/g, (match, path) => {
    if (!path.startsWith('./') && !path.startsWith('../') && !path.startsWith('http')) {
      modified = true;
      return `\`./${path}\``;
    }
    return match;
  });
  
  // Fix paths in JSON-like structures (e.g., in service workers or manifests)
  // Pattern: "url":"/_next/static/..." -> "url":"./_next/static/..."
  content = content.replace(/(["']url["']\s*:\s*["'])\/(_next\/static\/[^"']+)(["'])/g, (match, prefix, path, suffix) => {
    if (!path.startsWith('./') && !path.startsWith('../') && !path.startsWith('http')) {
      modified = true;
      return `${prefix}./${path}${suffix}`;
    }
    return match;
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
  
  // Fix double _next paths that might occur: "./_next/_next/static/..." -> "./_next/static/..."
  // This can happen if webpack publicPath is set incorrectly or paths are concatenated incorrectly
  // Fix in all contexts: strings, template literals, and code
  content = content.replace(/\.\/_next\/_next\//g, './_next/');
  content = content.replace(/(["'])\/_next\/_next\//g, '$1./_next/');
  content = content.replace(/`\/_next\/_next\//g, '`./_next/');
  content = content.replace(/`\.\/_next\/_next\//g, '`./_next/');
  content = content.replace(/__webpack_require__\.p\s*\+\s*["']\.\/_next\/_next\//g, '__webpack_require__.p + "./_next/');
  content = content.replace(/__webpack_require__\.p\s*\+\s*["']\/_next\/_next\//g, '__webpack_require__.p + "./_next/');
  
  // Fix cases where __webpack_require__.p (which should be "./") is concatenated with "/_next/static/"
  // This creates "./" + "/_next/static/" = "./_next/static/" which is correct, but if publicPath is wrong it becomes "/_next/" + "/_next/static/"
  // We need to ensure that when concatenating, we don't add extra slashes
  // Pattern: __webpack_require__.p + "/_next/static/" where p might be "/_next/" or "./_next/"
  // Since we set p to "./", this should be fine, but catch any remaining issues
  content = content.replace(/__webpack_require__\.p\s*\+\s*["']\/_next\//g, (match) => {
    // If publicPath is already "./", this becomes "./" + "/_next/" = "./_next/" which is correct
    // But if there's a double slash issue, fix it
    modified = true;
    return '__webpack_require__.p + "./_next/';
  });
  
  // Fix webpack chunk loading function patterns
  // Handle cases like: (__webpack_require__.p || "/_next/static/") + chunkId
  // Should become: (__webpack_require__.p || "./") + "./_next/static/" + chunkId
  // But since we set __webpack_require__.p to "./", we can simplify
  content = content.replace(/\(__webpack_require__\.p\s*\|\|\s*["']\/[^"']*["']\)/g, '__webpack_require__.p');
  
  // Fix webpack chunk loading: function(e) { return __webpack_require__.p + "/_next/static/" + e }
  // Should become: function(e) { return __webpack_require__.p + "./_next/static/" + e }
  content = content.replace(/__webpack_require__\.p\s*\+\s*["']\/(_next\/static\/[^"']+)["']\s*\+\s*/g, '__webpack_require__.p + "./$1" + ');
  
  // Fix chunk loading where chunkId already includes "_next/static/" and publicPath is concatenated
  // Pattern: __webpack_require__.p + chunkId where chunkId = "_next/static/chunks/..."
  // If publicPath is "./_next/" or "/_next/", this creates double _next
  // Since we set publicPath to "./", we need to ensure chunkId doesn't start with "/_next/" or "./_next/"
  // This is handled by the earlier patterns, but add a catch-all for any remaining cases
  content = content.replace(/__webpack_require__\.p\s*\+\s*["'](\.\/)?_next\/_next\//g, '__webpack_require__.p + "./_next/');
  
  // Fix any remaining absolute paths that start with /_next/ (should be relative)
  // This catches any patterns we might have missed
  content = content.replace(/(["'])\/(_next\/[^"']+)(["'])/g, (match, quote1, path, quote2) => {
    // Only fix if it's not already relative and not a URL
    if (!path.startsWith('./') && !path.startsWith('../') && !path.startsWith('http') && !path.includes('://')) {
      modified = true;
      return `${quote1}./${path}${quote2}`;
    }
    return match;
  });
  
  // Final pass: Fix any remaining double _next patterns in all contexts
  // This is a catch-all to ensure we don't miss any edge cases
  // Pattern: any occurrence of _next/_next should become _next
  content = content.replace(/_next\/_next\//g, '_next/');
  
  // Fix file:// protocol paths that might have double _next
  // Pattern: file:///C:/_next/_next/... should become file:///C:/_next/...
  // But actually, this shouldn't be in the content itself, it's a runtime resolution issue
  // However, if there are any references to file:// in the code, fix them
  content = content.replace(/file:\/\/\/[^:]+:\/_next\/_next\//g, (match) => {
    modified = true;
    return match.replace('/_next/_next/', '/_next/');
  });

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
  
  // Fix all HTML files in the out directory
  console.log('Fixing paths in HTML files...');
  const files = fs.readdirSync(outDir);
  const htmlFiles = files.filter(file => file.endsWith('.html'));
  
  if (htmlFiles.length === 0) {
    console.warn('⚠️  No HTML files found, skipping path fixes');
    return;
  }
  
  let htmlFixedCount = 0;
  for (const htmlFile of htmlFiles) {
    const htmlPath = path.join(outDir, htmlFile);
    try {
      let html = fs.readFileSync(htmlPath, 'utf-8');
      let htmlModified = false;
      
      const { content: fixedHtml, modified: htmlWasModified } = fixPathsInContent(html, htmlPath);
      htmlModified = htmlWasModified;
      
      // Ensure there's a base tag for file:// protocol
      // Base tag must be the first element in <head> for proper path resolution
      let htmlWithBase = fixedHtml;
      
      // Remove any existing base tags first
      htmlWithBase = htmlWithBase.replace(/<base[^>]*>/gi, '');
      
      // Add base tag as the first element in <head>
      if (htmlWithBase.includes('<head>')) {
        htmlWithBase = htmlWithBase.replace(/<head>/i, '<head>\n  <base href="./">');
        if (htmlWithBase !== fixedHtml) {
          htmlModified = true;
        }
      } else if (htmlWithBase.includes('<head ')) {
        // Handle <head> with attributes
        htmlWithBase = htmlWithBase.replace(/<head([^>]*)>/i, '<head$1>\n  <base href="./">');
        if (htmlWithBase !== fixedHtml) {
          htmlModified = true;
        }
      }
      
      html = htmlWithBase;
      
      if (htmlModified) {
        fs.writeFileSync(htmlPath, html, 'utf-8');
        console.log(`  ✅ Fixed paths in ${htmlFile}`);
        htmlFixedCount++;
      }
    } catch (error) {
      console.warn(`  ⚠️  Could not process ${htmlFile}: ${error.message}`);
    }
  }
  
  if (htmlFixedCount > 0) {
    console.log(`✅ Fixed paths in ${htmlFixedCount} HTML file(s)`);
  } else {
    console.log('ℹ️  No HTML files needed path fixes');
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
  
  // Fix service worker file (sw.js) if it exists
  const swPath = path.join(outDir, 'sw.js');
  if (fs.existsSync(swPath)) {
    console.log('Fixing paths in service worker...');
    try {
      let swContent = fs.readFileSync(swPath, 'utf-8');
      const { content: fixedSwContent, modified: swModified } = fixPathsInContent(swContent, swPath);
      if (swModified) {
        fs.writeFileSync(swPath, fixedSwContent, 'utf-8');
        console.log('✅ Fixed paths in sw.js');
      }
    } catch (error) {
      console.warn(`⚠️  Could not process sw.js: ${error.message}`);
    }
  }
  
  // Fix workbox file if it exists (search for workbox-*.js files)
  try {
    const files = fs.readdirSync(outDir);
    const workboxFiles = files.filter(file => file.startsWith('workbox-') && file.endsWith('.js'));
    for (const workboxFile of workboxFiles) {
      const workboxPath = path.join(outDir, workboxFile);
      console.log(`Fixing paths in ${workboxFile}...`);
      try {
        let workboxContent = fs.readFileSync(workboxPath, 'utf-8');
        const { content: fixedWorkboxContent, modified: workboxModified } = fixPathsInContent(workboxContent, workboxPath);
        if (workboxModified) {
          fs.writeFileSync(workboxPath, fixedWorkboxContent, 'utf-8');
          console.log(`✅ Fixed paths in ${workboxFile}`);
        }
      } catch (error) {
        console.warn(`⚠️  Could not process ${workboxFile}: ${error.message}`);
      }
    }
  } catch (error) {
    // Directory might not exist or be readable
    console.log('ℹ️  Skipping workbox file fixes');
  }
  
  console.log('✅ Path fixing complete');
}

// Run if called directly
if (require.main === module) {
  const outDir = process.argv[2] || path.join(__dirname, '..', 'out');
  fixElectronPaths(outDir);
}

module.exports = { fixElectronPaths };

