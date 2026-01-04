/**
 * Automated Database Backup Cron Job
 * 
 * Creates daily database backups and optionally uploads to cloud storage
 * 
 * Schedule: Daily at 2 AM UTC
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/backup",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 * 
 * GitHub Actions: Can be triggered via workflow
 * External Cron: Use cron-job.org or similar service
 */

import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import { logger } from '@/lib/logger'

const execAsync = promisify(exec)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'

interface BackupResult {
  success: boolean
  message: string
  backupFile?: string
  backupSize?: number
  cloudUploaded?: boolean
  cloudLocation?: string
  timestamp: string
  note?: string
}

export async function GET(request: NextRequest) {
  // During static export build, return early without accessing headers
  const isBuild = typeof process !== 'undefined' && 
                  process.env.ELECTRON === '1' && 
                  (process.env.NEXT_PHASE === 'phase-production-build' || !globalThis.window)
  
  if (isBuild) {
    return NextResponse.json({
      success: true,
      message: 'Static export build - backup requires runtime',
      timestamp: new Date().toISOString(),
      note: 'Backup functionality requires serverless runtime environment',
    })
  }
  
  // Wrap in runtime handler
  const runtimeHandler = async () => {
    try {
      // Verify cron secret or Vercel Cron header
      const authHeader = request.headers.get('authorization')
      const cronSecret = process.env.CRON_SECRET
      
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        const cronHeader = request.headers.get('x-vercel-cron')
        if (!cronHeader) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
      }

      const result = await performBackup()

    if (!result.success) {
      logger.error('Automated backup failed', { error: result.message })
      return NextResponse.json(result, { status: 500 })
    }

    logger.info('Automated backup completed successfully', {
      backupFile: result.backupFile,
      size: result.backupSize,
      cloudUploaded: result.cloudUploaded,
    })

      return NextResponse.json(result, { status: 200 })
    } catch (error: any) {
      logger.error('Backup cron job error', error)
      return NextResponse.json(
        {
          success: false,
          message: error.message || 'Unknown error during backup',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }
  }
  
  return runtimeHandler()
}

export async function POST(request: NextRequest) {
  // Allow manual trigger via POST
  return GET(request)
}

/**
 * Perform database backup
 */
async function performBackup(): Promise<BackupResult> {
  const DATABASE_URL = process.env.DATABASE_URL

  if (!DATABASE_URL) {
    return {
      success: false,
      message: 'DATABASE_URL environment variable is required',
      timestamp: new Date().toISOString(),
    }
  }

  // Check if we're in a serverless environment (Vercel, etc.)
  const isServerless = !process.env.BACKUP_DIR || process.env.VERCEL === '1'
  
  if (isServerless) {
    // In serverless, we can only upload to cloud storage directly
    // Skip local file system operations
    const cloudProvider = process.env.BACKUP_CLOUD_PROVIDER
    
    if (!cloudProvider) {
      return {
        success: false,
        message: 'Backup in serverless environment requires BACKUP_CLOUD_PROVIDER to be set. Local file system operations are not available.',
        timestamp: new Date().toISOString(),
      }
    }

    // For serverless, we need to stream directly to cloud storage
    // This would require implementing streaming backup to S3/Azure
    // For now, return a message indicating cloud backup is required
    return {
      success: false,
      message: 'Direct database backup in serverless environment requires cloud storage configuration. Please use Prisma Data Proxy backup or configure cloud storage.',
      timestamp: new Date().toISOString(),
      note: 'Consider using Prisma Data Proxy backup features or external backup services for serverless deployments.',
    }
  }

  // Local/self-hosted environment - use file system
  try {
    const BACKUP_DIR = process.env.BACKUP_DIR || './backups'
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    // Generate backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`)

    // Extract connection details from DATABASE_URL
    const url = new URL(DATABASE_URL)
    const dbHost = url.hostname
    const dbPort = url.port || '5432'
    const dbName = url.pathname.slice(1)
    const dbUser = url.username
    const dbPassword = url.password

    // Use pg_dump to create backup
    const pgDumpCommand = `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F c -f "${backupFile}"`

    await execAsync(pgDumpCommand)

    // Get file size
    const stats = fs.statSync(backupFile)
    const fileSizeMB = stats.size / (1024 * 1024)

    // Clean up old backups (keep last 30 days)
    cleanupOldBackups(BACKUP_DIR, 30)

    // Create backup manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      file: backupFile,
      size: stats.size,
      database: dbName,
      version: process.env.npm_package_version || 'unknown',
    }

    const manifestFile = path.join(BACKUP_DIR, `manifest-${timestamp}.json`)
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2))

    // Upload to cloud storage if configured
    let cloudUploaded = false
    let cloudLocation = undefined

    if (process.env.BACKUP_CLOUD_PROVIDER) {
      try {
        const cloudResult = await uploadToCloud(backupFile, manifestFile)
        cloudUploaded = cloudResult.success
        cloudLocation = cloudResult.location
      } catch (error: any) {
        logger.warn('Cloud upload failed, but local backup succeeded', {
          error: error.message,
        })
        // Don't fail the backup if cloud upload fails
      }
    }

    return {
      success: true,
      message: `Backup completed successfully (${fileSizeMB.toFixed(2)} MB)`,
      backupFile,
      backupSize: stats.size,
      cloudUploaded,
      cloudLocation,
      timestamp: new Date().toISOString(),
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Backup failed',
      timestamp: new Date().toISOString(),
    }
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
      return { success: false }
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
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')

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
        Body: fs.readFileSync(backupFile),
        ContentType: 'application/octet-stream',
        ServerSideEncryption: 'AES256',
      })
    )

    // Upload manifest
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: manifestKey,
        Body: fs.readFileSync(manifestFile),
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
  // For now, return not implemented
  throw new Error('Azure Blob Storage upload not yet implemented')
}

/**
 * Clean up old backups
 */
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
    logger.info(`Cleaned up ${deletedCount} old backup(s)`)
  }
}

