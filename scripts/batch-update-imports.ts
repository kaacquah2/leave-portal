/**
 * Batch Import Update Script
 * 
 * Updates imports across the codebase to use new barrel exports
 * after lib directory reorganization.
 * 
 * Run with: npx tsx scripts/batch-update-imports.ts
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const rootDir = process.cwd()
const excludeDirs = ['node_modules', 'out', '.next', 'src-tauri', 'target', '.git']

interface Replacement {
  pattern: RegExp
  replacement: string
  description: string
}

const replacements: Replacement[] = [
  // Auth imports - use barrel exports
  {
    pattern: /from ['"]@\/lib\/auth\.ts['"]/g,
    replacement: "from '@/lib/auth'",
    description: 'auth.ts -> auth barrel'
  },
  {
    pattern: /from ['"]@\/lib\/auth-client['"]/g,
    replacement: "from '@/lib/auth'",
    description: 'auth-client -> auth barrel'
  },
  {
    pattern: /from ['"]@\/lib\/auth-proxy['"]/g,
    replacement: "from '@/lib/auth'",
    description: 'auth-proxy -> auth barrel'
  },
  {
    pattern: /from ['"]@\/lib\/auth-edge['"]/g,
    replacement: "from '@/lib/auth'",
    description: 'auth-edge -> auth barrel'
  },
  {
    pattern: /from ['"]@\/lib\/auth-debug['"]/g,
    replacement: "from '@/lib/auth'",
    description: 'auth-debug -> auth barrel'
  },
  
  // API imports - use barrel exports
  {
    pattern: /from ['"]@\/lib\/api-config['"]/g,
    replacement: "from '@/lib/api'",
    description: 'api-config -> api barrel'
  },
  {
    pattern: /from ['"]@\/lib\/api-fetch['"]/g,
    replacement: "from '@/lib/api'",
    description: 'api-fetch -> api barrel'
  },
  
  // Role imports - use barrel exports
  {
    pattern: /from ['"]@\/lib\/permissions['"]/g,
    replacement: "from '@/lib/roles'",
    description: 'permissions -> roles barrel'
  },
  {
    pattern: /from ['"]@\/lib\/role-mapping['"]/g,
    replacement: "from '@/lib/roles'",
    description: 'role-mapping -> roles barrel'
  },
  {
    pattern: /from ['"]@\/lib\/role-utils['"]/g,
    replacement: "from '@/lib/roles'",
    description: 'role-utils -> roles barrel'
  },
  {
    pattern: /from ['"]@\/lib\/mofa-rbac-middleware['"]/g,
    replacement: "from '@/lib/roles'",
    description: 'mofa-rbac-middleware -> roles barrel'
  },
]

function shouldExclude(path: string): boolean {
  const parts = path.split(/[/\\]/)
  return excludeDirs.some(dir => parts.includes(dir))
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir)
  
  for (const file of files) {
    const filePath = join(dir, file)
    
    if (shouldExclude(filePath)) {
      continue
    }
    
    const stat = statSync(filePath)
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList)
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath)
    }
  }
  
  return fileList
}

function updateFile(filePath: string): boolean {
  try {
    let content = readFileSync(filePath, 'utf-8')
    let modified = false
    
    for (const { pattern, replacement, description } of replacements) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement)
        modified = true
        console.log(`  ✓ ${description}`)
      }
    }
    
    if (modified) {
      writeFileSync(filePath, content, 'utf-8')
      return true
    }
    
    return false
  } catch (error) {
    console.error(`  ✗ Error: ${error}`)
    return false
  }
}

function main() {
  console.log('Starting batch import update...\n')
  
  const files = getAllFiles(rootDir)
  let updatedCount = 0
  
  for (const file of files) {
    const relativePath = relative(rootDir, file)
    console.log(`Processing: ${relativePath}`)
    
    if (updateFile(file)) {
      updatedCount++
      console.log(`  ✓ Updated\n`)
    } else {
      console.log(`  - No changes needed\n`)
    }
  }
  
  console.log(`\n✅ Complete! Updated ${updatedCount} files.`)
}

if (require.main === module) {
  main()
}

export { main }

