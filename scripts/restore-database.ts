/**
 * Database Restore Script
 * Restores database from a backup file
 * 
 * Usage:
 * tsx scripts/restore-database.ts <backup-file>
 * 
 * WARNING: This will overwrite the current database!
 */

// Load environment variables
import 'dotenv/config'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required')
  process.exit(1)
}

async function main() {
  const backupFile = process.argv[2]

  if (!backupFile) {
    console.error('❌ Backup file path is required')
    console.log('Usage: tsx scripts/restore-database.ts <backup-file>')
    process.exit(1)
  }

  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Backup file not found: ${backupFile}`)
    process.exit(1)
  }

  console.log('⚠️  WARNING: This will overwrite the current database!')
  console.log(`📁 Backup file: ${backupFile}`)
  console.log('🔄 Starting database restore...')

  try {
    // Extract connection details from DATABASE_URL
    const url = new URL(DATABASE_URL!)
    const dbHost = url.hostname
    const dbPort = url.port || '5432'
    const dbName = url.pathname.slice(1)
    const dbUser = url.username
    const dbPassword = url.password

    // Use pg_restore to restore backup
    // Note: pg_restore must be installed on the system
    const pgRestoreCommand = `PGPASSWORD="${dbPassword}" pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --clean --if-exists "${backupFile}"`

    console.log('🔄 Running pg_restore...')
    await execAsync(pgRestoreCommand)

    console.log('✅ Database restore completed successfully')
    console.log('⚠️  Please verify the data and test the application')
  } catch (error: any) {
    console.error('❌ Restore failed:', error.message)
    process.exit(1)
  }
}

main()

