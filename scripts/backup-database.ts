/**
 * Database Backup Script
 * Creates a backup of the database
 * 
 * Usage:
 * - Run manually: tsx scripts/backup-database.ts
 * - Add to cron: 0 2 * * * (runs daily at 2 AM)
 */

// Load environment variables
import 'dotenv/config'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

const BACKUP_DIR = process.env.BACKUP_DIR || './backups'
const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required')
  process.exit(1)
}

async function main() {
  console.log('💾 Starting database backup...')
  console.log(`📅 Date: ${new Date().toISOString()}`)

  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    // Generate backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`)

    // Extract connection details from DATABASE_URL
    // Format: postgresql://user:password@host:port/database
    const url = new URL(DATABASE_URL!)
    const dbHost = url.hostname
    const dbPort = url.port || '5432'
    const dbName = url.pathname.slice(1) // Remove leading /
    const dbUser = url.username
    const dbPassword = url.password

    // Use pg_dump to create backup
    // Note: pg_dump must be installed on the system
    const pgDumpCommand = `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F c -f "${backupFile}"`

    console.log('🔄 Running pg_dump...')
    await execAsync(pgDumpCommand)

    // Get file size
    const stats = fs.statSync(backupFile)
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2)

    console.log(`✅ Backup completed successfully`)
    console.log(`   - File: ${backupFile}`)
    console.log(`   - Size: ${fileSizeMB} MB`)

    // Clean up old backups (keep last 30 days)
    cleanupOldBackups(BACKUP_DIR, 30)

    // Create backup manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      file: backupFile,
      size: stats.size,
      database: dbName,
    }

    const manifestFile = path.join(BACKUP_DIR, `manifest-${timestamp}.json`)
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2))

    console.log('✅ Backup manifest created')
  } catch (error: any) {
    console.error('❌ Backup failed:', error.message)
    process.exit(1)
  }
}

function cleanupOldBackups(backupDir: string, keepDays: number) {
  const files = fs.readdirSync(backupDir)
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - keepDays)

  let deletedCount = 0
  for (const file of files) {
    if (file.startsWith('backup-') && file.endsWith('.sql')) {
      const filePath = path.join(backupDir, file)
      const stats = fs.statSync(filePath)
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath)
        deletedCount++
        
        // Also delete corresponding manifest
        const manifestFile = file.replace('.sql', '.json').replace('backup-', 'manifest-')
        const manifestPath = path.join(backupDir, manifestFile)
        if (fs.existsSync(manifestPath)) {
          fs.unlinkSync(manifestPath)
        }
      }
    }
  }

  if (deletedCount > 0) {
    console.log(`🗑️  Cleaned up ${deletedCount} old backup(s)`)
  }
}

main()

