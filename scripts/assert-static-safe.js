/**
 * Build-time static export safety validator
 * 
 * Ensures the codebase is compatible with Next.js static export (required for Tauri builds).
 * Fails the build if any static-incompatible features are detected.
 */

const fs = require('fs');
const path = require('path');

// Patterns that are incompatible with static export
const FORBIDDEN_PATTERNS = [
  {
    pattern: /middleware\.(ts|js)$/,
    description: 'Middleware files (middleware.ts/js)',
    reason: 'Middleware requires a server and is not compatible with static export'
  },
  {
    pattern: /headers\s*\(/,
    description: 'Dynamic headers() function',
    reason: 'Dynamic headers require a server at runtime'
  },
  {
    pattern: /cookies\s*\(/,
    description: 'Dynamic cookies() function',
    reason: 'Dynamic cookies require a server at runtime'
  },
  {
    pattern: /redirect\s*\(/,
    description: 'Dynamic redirect() function',
    reason: 'Dynamic redirects require a server at runtime'
  },
  {
    pattern: /rewrites\s*:/,
    description: 'Rewrites configuration',
    reason: 'Rewrites require a server and are not compatible with static export'
  },
  {
    pattern: /dynamic\s*=\s*['"]force-dynamic['"]/,
    description: 'force-dynamic route segment config',
    reason: 'force-dynamic requires server-side rendering'
  },
  {
    pattern: /app\/api\//,
    description: 'API route handlers (app/api/)',
    reason: 'API routes require a server and are disabled in static export'
  },
];

// Directories to scan
const SCAN_DIRS = [
  'app',
  'src/app', // If using src directory
];

// Files/directories to ignore
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /out/,
  /dist/,
  /\.git/,
  /\.DS_Store/,
  /\.(log|tmp)$/,
];

let violations = [];
let filesScanned = 0;

/**
 * Check if a path should be ignored
 */
function shouldIgnore(filePath) {
  return IGNORE_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Scan a file for forbidden patterns
 */
function scanFile(filePath) {
  filesScanned++;
  
  if (shouldIgnore(filePath)) {
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    FORBIDDEN_PATTERNS.forEach(({ pattern, description, reason }) => {
      if (pattern.test(content)) {
        // For file patterns, check if the file itself matches
        if (pattern.source.includes('\\.(ts|js)$')) {
          if (pattern.test(filePath)) {
            violations.push({
              file: filePath,
              pattern: description,
              reason: reason
            });
          }
        } else {
          // For content patterns, check file content
          violations.push({
            file: filePath,
            pattern: description,
            reason: reason
          });
        }
      }
    });
  } catch (error) {
    // Skip files that can't be read (binary files, etc.)
    if (error.code !== 'EISDIR') {
      console.warn(`⚠️  Could not read ${filePath}: ${error.message}`);
    }
  }
}

/**
 * Recursively scan a directory
 */
function scanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  
  if (shouldIgnore(dirPath)) {
    return;
  }
  
  try {
    const entries = fs.readdirSync(dirPath);
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (stat.isFile()) {
        // Only scan relevant file types
        if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) {
          scanFile(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️  Could not scan ${dirPath}: ${error.message}`);
  }
}

/**
 * Main validation function
 */
function validateStaticExport() {
  console.log('🔍 Validating static export compatibility...');
  console.log('');
  
  const rootDir = path.join(__dirname, '..');
  
  // Scan all specified directories
  SCAN_DIRS.forEach(dir => {
    const fullPath = path.join(rootDir, dir);
    if (fs.existsSync(fullPath)) {
      scanDirectory(fullPath);
    }
  });
  
  // Report results
  console.log(`📊 Scanned ${filesScanned} files`);
  console.log('');
  
  if (violations.length > 0) {
    console.error('❌ Static export compatibility violations found:');
    console.error('');
    
    violations.forEach(({ file, pattern, reason }, index) => {
      const relativePath = path.relative(rootDir, file);
      console.error(`  ${index + 1}. ${pattern}`);
      console.error(`     File: ${relativePath}`);
      console.error(`     Reason: ${reason}`);
      console.error('');
    });
    
    console.error('💡 To fix:');
    console.error('   - Remove or replace server-only features');
    console.error('   - Use client-side alternatives where possible');
    console.error('   - Ensure all routes are statically exportable');
    console.error('');
    console.error('📖 See: https://nextjs.org/docs/app/building-your-application/deploying/static-exports');
    console.error('');
    
    process.exit(1);
  }
  
  console.log('✅ Static export compatibility validated');
  console.log('   All routes and features are compatible with static export');
  console.log('');
}

// Run validation
if (require.main === module) {
  validateStaticExport();
}

module.exports = { validateStaticExport };

