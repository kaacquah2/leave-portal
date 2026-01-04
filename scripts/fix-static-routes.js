/**
 * Script to add export const dynamic = 'force-static' to all API routes
 * that don't have it and are not dynamic routes (don't have [id] in path)
 */

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'app', 'api');

function getAllRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllRouteFiles(filePath, fileList);
    } else if (file === 'route.ts') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function isDynamicRoute(filePath) {
  return filePath.includes('[') && filePath.includes(']');
}

function hasDynamicExport(content) {
  return content.includes('export const dynamic');
}

function hasGenerateStaticParams(content) {
  return content.includes('generateStaticParams');
}

function addStaticExport(content, filePath) {
  // Find the last import statement
  const importLines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < importLines.length; i++) {
    if (importLines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    } else if (lastImportIndex !== -1 && importLines[i].trim() === '') {
      // Found empty line after imports, insert here
      break;
    } else if (lastImportIndex !== -1 && !importLines[i].trim().startsWith('//') && importLines[i].trim() !== '') {
      // Found non-comment, non-empty line - insert before it
      break;
    }
  }
  
  if (lastImportIndex === -1) {
    console.warn(`Could not find import section in ${filePath}`);
    return content;
  }
  
  // Find where to insert (after last import, before first export or comment)
  let insertIndex = lastImportIndex + 1;
  
  // Skip empty lines and comments
  while (insertIndex < importLines.length && 
         (importLines[insertIndex].trim() === '' || importLines[insertIndex].trim().startsWith('//'))) {
    insertIndex++;
  }
  
  // Insert the static export configuration
  const staticExport = '// Force static export configuration (required for static export mode)\nexport const dynamic = \'force-static\'\n';
  
  // If there's already an empty line, use it; otherwise add one
  if (insertIndex > 0 && importLines[insertIndex - 1].trim() === '') {
    importLines.splice(insertIndex, 0, staticExport.trim());
  } else {
    importLines.splice(insertIndex, 0, '', staticExport.trim());
  }
  
  return importLines.join('\n');
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has dynamic export
  if (hasDynamicExport(content)) {
    return false;
  }
  
  // Skip dynamic routes (they need generateStaticParams instead)
  if (isDynamicRoute(filePath)) {
    // Check if it already has generateStaticParams
    if (!hasGenerateStaticParams(content)) {
      console.warn(`⚠️  Dynamic route missing generateStaticParams: ${filePath}`);
    }
    return false;
  }
  
  // Add static export
  const newContent = addStaticExport(content, filePath);
  fs.writeFileSync(filePath, newContent, 'utf8');
  return true;
}

// Main execution
console.log('🔍 Scanning API routes...\n');

const routeFiles = getAllRouteFiles(API_DIR);
let fixed = 0;
let skipped = 0;

routeFiles.forEach(filePath => {
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  
  if (processFile(filePath)) {
    console.log(`✅ Fixed: ${relativePath}`);
    fixed++;
  } else {
    skipped++;
  }
});

console.log(`\n✨ Done! Fixed ${fixed} routes, skipped ${skipped} routes.`);

