/**
 * Restore API Endpoints Script
 * Restores necessary API endpoints from backup to active API directory
 */

import * as fs from 'fs'
import * as path from 'path'

const backupDir = path.join(process.cwd(), 'app', '_api_backup')
const apiDir = path.join(process.cwd(), 'app', 'api')

// Endpoints that need to be restored
const endpointsToRestore = [
  'staff/[id]/assign-manager',
  'staff/bulk-assign-manager',
  'approvals/reminders',
  'monitoring/health',
  'audit-logs/[id]',
  'leaves/[id]',
  'leaves/[id]/cancel',
  'leaves/bulk',
  'leaves/calculate-days',
  'leaves', // Main leaves route
]

function copyDirectory(src: string, dest: string) {
  if (!fs.existsSync(src)) {
    console.log(`⚠️  Source not found: ${src}`)
    return false
  }

  // Create destination directory if it doesn't exist
  const destDir = path.dirname(dest)
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }

  // Copy file or directory
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
  console.log('🔄 Restoring API endpoints from backup...\n')

  let restored = 0
  let skipped = 0
  let errors = 0

  for (const endpoint of endpointsToRestore) {
    const backupPath = path.join(backupDir, endpoint)
    const apiPath = path.join(apiDir, endpoint)

    // Check if already exists in API directory
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

  // Verify critical endpoints have enhancements
  console.log('\n🔍 Verifying enhancements...')
  
  const criticalFiles = [
    'app/api/leaves/[id]/route.ts',
    'app/api/leaves/route.ts',
    'app/api/leaves/[id]/cancel/route.ts',
  ]

  for (const file of criticalFiles) {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      if (content.includes('updateLeaveBalance') || content.includes('deductLeaveBalance') || content.includes('restoreLeaveBalance')) {
        console.log(`   ✅ ${file} has balance utilities`)
      } else {
        console.log(`   ⚠️  ${file} may need balance utilities`)
      }
    }
  }

  console.log('\n✅ Restoration complete!')
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

