#!/usr/bin/env tsx
/**
 * Clear Next.js cache directories
 * 
 * This script removes the .next/cache directory to resolve
 * webpack cache permission errors on Windows (EPERM issues)
 */

import { rmSync, existsSync } from 'fs'
import { join } from 'path'

const projectRoot = process.cwd()
const cacheDir = join(projectRoot, '.next', 'cache')
const nextDir = join(projectRoot, '.next')

const args = process.argv.slice(2)
const cleanAll = args.includes('--all') || args.includes('-a')

try {
  if (cleanAll) {
    console.log('🧹 Cleaning entire .next directory...')
    if (existsSync(nextDir)) {
      rmSync(nextDir, { recursive: true, force: true })
      console.log('✅ Successfully cleaned .next directory')
    } else {
      console.log('ℹ️  .next directory does not exist')
    }
  } else {
    console.log('🧹 Cleaning .next/cache directory...')
    if (existsSync(cacheDir)) {
      rmSync(cacheDir, { recursive: true, force: true })
      console.log('✅ Successfully cleaned .next/cache directory')
    } else {
      console.log('ℹ️  .next/cache directory does not exist')
    }
  }
} catch (error) {
  if (error instanceof Error) {
    console.error('❌ Error cleaning cache:', error.message)
    console.error('\n💡 Tip: Make sure no processes are using the cache files')
    console.error('   Try closing your dev server or IDE and run again')
    process.exit(1)
  }
  throw error
}

