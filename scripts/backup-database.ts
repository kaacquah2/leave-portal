/**
 * Database Backup Script
 * Creates a backup of the database with optional cloud storage upload
 * 
 * Usage:
 * - Run manually: tsx scripts/backup-database.ts
 * - Add to cron: 0 2 * * * (runs daily at 2 AM)
 * 
 * Environment Variables:
 * - DATABASE_URL: PostgreSQL connection string (required)
 * - BACKUP_DIR: Local backup directory (default: ./backups)
 * - BACKUP_CLOUD_PROVIDER: 's3' or 'azure' (optional)
 * - AWS_S3_BACKUP_BUCKET: S3 bucket name (if using S3)
 * - AWS_REGION: AWS region (default: us-east-1)
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

    // Upload to cloud storage if configured
    if (process.env.BACKUP_CLOUD_PROVIDER) {
      try {
        console.log(`☁️  Uploading to ${process.env.BACKUP_CLOUD_PROVIDER.toUpperCase()}...`)
        const cloudResult = await uploadToCloud(backupFile, manifestFile)
        if (cloudResult.success) {
          console.log(`✅ Cloud upload successful: ${cloudResult.location}`)
        } else {
          console.warn('⚠️  Cloud upload failed, but local backup succeeded')
        }
      } catch (error: any) {
        console.warn(`⚠️  Cloud upload failed: ${error.message}`)
        console.warn('   Local backup is still available')
        // Don't fail the backup if cloud upload fails
      }
    }
  } catch (error: any) {
    console.error('❌ Backup failed:', error.message)
    process.exit(1)
  }
}

/**
 * Upload backup to cloud storage
 */
async function uploadToCloud(
  backupFile: string,
  manifestFile: string
): Promise<{ success: boolean; location?: string }> {
  const provider = process.env.BACKUP_CLOUD_PROVIDER?.toLowerCase()

  switch (provider) {
    case 's3':
      return await uploadToS3(backupFile, manifestFile)
    case 'azure':
      return await uploadToAzure(backupFile, manifestFile)
    default:
      throw new Error(`Unsupported cloud provider: ${provider}`)
  }
}

/**
 * Upload to AWS S3
 */
async function uploadToS3(
  backupFile: string,
  manifestFile: string
): Promise<{ success: boolean; location?: string }> {
  try {
    // Dynamic import to avoid loading AWS SDK if not needed
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3' as any)
    const { readFileSync } = await import('fs')

    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    })

    const bucket = process.env.AWS_S3_BACKUP_BUCKET
    if (!bucket) {
      throw new Error('AWS_S3_BACKUP_BUCKET environment variable is required')
    }

    const timestamp = path.basename(backupFile, '.sql')
    const backupKey = `backups/${timestamp}.sql`
    const manifestKey = `backups/${timestamp}.json`

    // Upload backup file
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: backupKey,
        Body: readFileSync(backupFile),
        ContentType: 'application/octet-stream',
        ServerSideEncryption: 'AES256',
      })
    )

    // Upload manifest
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: manifestKey,
        Body: readFileSync(manifestFile),
        ContentType: 'application/json',
      })
    )

    return {
      success: true,
      location: `s3://${bucket}/${backupKey}`,
    }
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND' || error.message?.includes('@aws-sdk/client-s3')) {
      console.error('[Backup] AWS SDK not installed. Install with: npm install @aws-sdk/client-s3')
      return {
        success: false,
      }
    }
    throw error
  }
}

/**
 * Upload to Azure Blob Storage
 */
async function uploadToAzure(
  backupFile: string,
  manifestFile: string
): Promise<{ success: boolean; location?: string }> {
  // Azure Blob Storage upload would go here
  // Requires @azure/storage-blob package
  throw new Error('Azure Blob Storage upload not yet implemented. Install @azure/storage-blob package.')
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

