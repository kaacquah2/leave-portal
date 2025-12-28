/**
 * Restore Critical API Endpoints
 * Restores essential API routes needed for the application to function
 */

import * as fs from 'fs'
import * as path from 'path'

const backupDir = path.join(process.cwd(), 'app', '_api_backup')
const apiDir = path.join(process.cwd(), 'app', 'api')

// Critical endpoints that MUST exist for the app to work
const criticalEndpoints = [
  // Authentication - CRITICAL
  'auth/login',
  'auth/logout',
  'auth/me',
  'auth/register',
  
  // Staff Management - CRITICAL
  'staff',
  'staff/[id]',
  
  // Leave Management - CRITICAL
  'leaves',
  
  // Leave Balances - CRITICAL
  'balances',
  'balances/[staffId]',
  
  // Holidays - CRITICAL
  'holidays',
  'holidays/[id]',
  
  // Leave Policies - CRITICAL
  'leave-policies',
  'leave-policies/[id]',
  
  // Leave Templates - CRITICAL
  'leave-templates',
  'leave-templates/[id]',
  
  // Notifications - CRITICAL
  'notifications',
  'notifications/[id]',
  'notifications/mark-read',
  
  // Real-time - CRITICAL
  'realtime',
  
  // Audit Logs - CRITICAL
  'audit-logs',
]

function copyDirectory(src: string, dest: string) {
  if (!fs.existsSync(src)) {
    console.log(`⚠️  Source not found: ${src}`)
    return false
  }

  const destDir = path.dirname(dest)
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }

  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }
    const files = fs.readdirSync(src)
    files.forEach((file) => {
      copyDirectory(
        path.join(src, file),
        path.join(dest, file)
      )
    })
  } else {
    fs.copyFileSync(src, dest)
  }
  return true
}

async function main() {
  console.log('🔄 Restoring critical API endpoints...\n')

  let restored = 0
  let skipped = 0
  let errors = 0

  for (const endpoint of criticalEndpoints) {
    const backupPath = path.join(backupDir, endpoint)
    const apiPath = path.join(apiDir, endpoint)

    // Check if already exists
    if (fs.existsSync(apiPath)) {
      console.log(`⏭️  Skipping (already exists): ${endpoint}`)
      skipped++
      continue
    }

    // Check if backup exists
    if (!fs.existsSync(backupPath)) {
      console.log(`⚠️  Backup not found: ${endpoint}`)
      errors++
      continue
    }

    // Copy from backup
    try {
      copyDirectory(backupPath, apiPath)
      console.log(`✅ Restored: ${endpoint}`)
      restored++
    } catch (error: any) {
      console.log(`❌ Error restoring ${endpoint}: ${error.message}`)
      errors++
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   ✅ Restored: ${restored}`)
  console.log(`   ⏭️  Skipped (already exists): ${skipped}`)
  console.log(`   ❌ Errors: ${errors}`)
  console.log('\n✅ Critical API restoration complete!')
  console.log('⚠️  IMPORTANT: Commit and push these changes to deploy to Vercel')
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

