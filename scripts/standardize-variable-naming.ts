/**
 * Variable Naming Standardization Script
 * 
 * Standardizes variable naming across the codebase:
 * - `role` → `userRole` (more descriptive)
 * - `staff_id` → `staffId` (camelCase convention)
 * 
 * Run with: npx tsx scripts/standardize-variable-naming.ts
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const rootDir = process.cwd()
const excludeDirs = ['node_modules', 'out', '.next', 'src-tauri', 'target', '.git', 'prisma']

interface Replacement {
  pattern: RegExp
  replacement: string
  description: string
  context?: string // Additional context for safety
}

const replacements: Replacement[] = [
  // Standardize role → userRole (but be careful with context)
  {
    pattern: /(\w+):\s*role\b/g,
    replacement: '$1: userRole',
    description: 'Type annotation: role → userRole',
    context: 'Type definitions and interfaces'
  },
  {
    pattern: /\bconst\s+role\s*[:=]/g,
    replacement: 'const userRole =',
    description: 'Variable declaration: const role → const userRole'
  },
  {
    pattern: /\blet\s+role\s*[:=]/g,
    replacement: 'let userRole =',
    description: 'Variable declaration: let role → let userRole'
  },
  {
    pattern: /\bvar\s+role\s*[:=]/g,
    replacement: 'var userRole =',
    description: 'Variable declaration: var role → var userRole'
  },
  {
    pattern: /\{?\s*role\s*[:=]/g,
    replacement: '{ userRole =',
    description: 'Destructuring: { role = → { userRole ='
  },
  {
    pattern: /\{?\s*role\s*[,}]/g,
    replacement: '{ userRole,',
    description: 'Destructuring: { role, → { userRole,'
  },
  {
    pattern: /\brole\s*:\s*role\b/g,
    replacement: 'role: userRole',
    description: 'Object property: role: role → role: userRole'
  },
  
  // Standardize staff_id → staffId
  {
    pattern: /\bstaff_id\b/g,
    replacement: 'staffId',
    description: 'staff_id → staffId (camelCase)'
  },
  
  // Function parameters - be more careful
  {
    pattern: /\((\w+):\s*role\b/g,
    replacement: '($1: userRole',
    description: 'Function parameter type: role → userRole'
  },
  {
    pattern: /\(role\s*[,)]/g,
    replacement: '(userRole,',
    description: 'Function parameter: role → userRole'
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

function updateFile(filePath: string): { modified: boolean; changes: string[] } {
  try {
    let content = readFileSync(filePath, 'utf-8')
    const originalContent = content
    const changes: string[] = []
    
    for (const { pattern, replacement, description } of replacements) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement)
        changes.push(description)
      }
    }
    
    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf-8')
      return { modified: true, changes }
    }
    
    return { modified: false, changes: [] }
  } catch (error) {
    console.error(`  ✗ Error: ${error}`)
    return { modified: false, changes: [] }
  }
}

function main() {
  console.log('Starting variable naming standardization...\n')
  console.log('⚠️  WARNING: This script makes automatic replacements.')
  console.log('⚠️  Please review changes carefully before committing.\n')
  
  const files = getAllFiles(rootDir)
  let updatedCount = 0
  const fileChanges: Map<string, string[]> = new Map()
  
  for (const file of files) {
    const relativePath = relative(rootDir, file)
    const result = updateFile(file)
    
    if (result.modified) {
      updatedCount++
      fileChanges.set(relativePath, result.changes)
      console.log(`✓ Updated: ${relativePath}`)
      if (result.changes.length > 0) {
        result.changes.forEach(change => console.log(`  - ${change}`))
      }
    }
  }
  
  console.log(`\n✅ Complete! Updated ${updatedCount} files.`)
  
  if (fileChanges.size > 0) {
    console.log('\n📋 Summary of changes:')
    fileChanges.forEach((changes, file) => {
      console.log(`\n${file}:`)
      changes.forEach(change => console.log(`  - ${change}`))
    })
  }
}

if (require.main === module) {
  main()
}

export { main }

