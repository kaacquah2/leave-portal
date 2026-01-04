/**
 * Automated Restore Testing Script
 * 
 * Tests database restore functionality by:
 * 1. Creating a test backup
 * 2. Restoring to a test database
 * 3. Verifying data integrity
 * 4. Cleaning up test resources
 * 
 * Usage:
 * - Run manually: tsx scripts/test-restore.ts
 * - Add to cron: 0 0 1 * * (runs monthly on 1st)
 * 
 * Environment Variables:
 * - DATABASE_URL: Production database connection (required)
 * - TEST_DATABASE_URL: Test database connection (optional, will create if not provided)
 */

import 'dotenv/config'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

const DATABASE_URL = process.env.DATABASE_URL
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL
const BACKUP_DIR = process.env.BACKUP_DIR || './backups'
const TEST_BACKUP_DIR = path.join(BACKUP_DIR, 'test-restores')

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required')
  process.exit(1)
}

interface TestResult {
  success: boolean
  message: string
  backupFile?: string
  restoreTime?: number
  verificationPassed?: boolean
  errors: string[]
}

async function main() {
  console.log('🧪 Starting automated restore test...')
  console.log(`📅 Date: ${new Date().toISOString()}`)

  const result: TestResult = {
    success: false,
    message: '',
    errors: [],
  }

  const startTime = Date.now()

  try {
    // Step 1: Create test backup
    console.log('\n📦 Step 1: Creating test backup...')
    const backupFile = await createTestBackup()
    result.backupFile = backupFile
    console.log(`✅ Test backup created: ${backupFile}`)

    // Step 2: Restore to test database
    console.log('\n🔄 Step 2: Restoring to test database...')
    const testDbUrl = await ensureTestDatabase()
    await restoreBackup(backupFile, testDbUrl)
    console.log('✅ Restore completed')

    // Step 3: Verify data integrity
    console.log('\n🔍 Step 3: Verifying data integrity...')
    const verification = await verifyDataIntegrity(testDbUrl)
    result.verificationPassed = verification.passed

    if (verification.passed) {
      console.log('✅ Data integrity verification passed')
      console.log(`   - Tables verified: ${verification.tablesChecked}`)
      console.log(`   - Records verified: ${verification.recordsChecked}`)
    } else {
      console.error('❌ Data integrity verification failed')
      result.errors.push(...verification.errors)
    }

    // Step 4: Cleanup
    console.log('\n🧹 Step 4: Cleaning up test resources...')
    await cleanupTestResources(backupFile, testDbUrl)
    console.log('✅ Cleanup completed')

    result.restoreTime = Date.now() - startTime
    result.success = verification.passed
    result.message = verification.passed
      ? `Restore test passed in ${(result.restoreTime / 1000).toFixed(2)}s`
      : `Restore test failed: ${verification.errors.join(', ')}`

    // Write test report
    const reportFile = path.join(TEST_BACKUP_DIR, `test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
    if (!fs.existsSync(TEST_BACKUP_DIR)) {
      fs.mkdirSync(TEST_BACKUP_DIR, { recursive: true })
    }
    fs.writeFileSync(reportFile, JSON.stringify(result, null, 2))
    console.log(`\n📄 Test report saved: ${reportFile}`)

    if (!result.success) {
      console.error('\n❌ Restore test failed!')
      process.exit(1)
    }

    console.log('\n✅ Restore test completed successfully!')
  } catch (error: any) {
    result.success = false
    result.message = error.message
    result.errors.push(error.message)
    console.error('\n❌ Restore test failed:', error.message)
    process.exit(1)
  }
}

/**
 * Create a test backup
 */
async function createTestBackup(): Promise<string> {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFile = path.join(BACKUP_DIR, `test-backup-${timestamp}.sql`)

  const url = new URL(DATABASE_URL!)
  const dbHost = url.hostname
  const dbPort = url.port || '5432'
  const dbName = url.pathname.slice(1)
  const dbUser = url.username
  const dbPassword = url.password

  const pgDumpCommand = `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F c -f "${backupFile}"`

  await execAsync(pgDumpCommand)

  return backupFile
}

/**
 * Ensure test database exists
 */
async function ensureTestDatabase(): Promise<string> {
  if (TEST_DATABASE_URL) {
    // Verify test database exists
    const url = new URL(TEST_DATABASE_URL)
    const dbName = url.pathname.slice(1)
    const dbHost = url.hostname
    const dbPort = url.port || '5432'
    const dbUser = url.username
    const dbPassword = url.password

    // Try to connect
    try {
      await execAsync(
        `PGPASSWORD="${dbPassword}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -c "SELECT 1"`
      )
      return TEST_DATABASE_URL
    } catch (error) {
      throw new Error(`Test database connection failed: ${error}`)
    }
  } else {
    // Create test database from production URL
    const url = new URL(DATABASE_URL!)
    const testDbName = `${url.pathname.slice(1)}_test_restore`
    const testDbUrl = `${DATABASE_URL!.replace(url.pathname, `/${testDbName}`)}`

    const dbHost = url.hostname
    const dbPort = url.port || '5432'
    const dbUser = url.username
    const dbPassword = url.password

    // Create test database
    try {
      await execAsync(
        `PGPASSWORD="${dbPassword}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d postgres -c "CREATE DATABASE ${testDbName}"`
      )
      console.log(`✅ Test database created: ${testDbName}`)
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log(`ℹ️  Test database already exists: ${testDbName}`)
      } else {
        throw error
      }
    }

    return testDbUrl
  }
}

/**
 * Restore backup to test database
 */
async function restoreBackup(backupFile: string, testDbUrl: string): Promise<void> {
  const url = new URL(testDbUrl)
  const dbHost = url.hostname
  const dbPort = url.port || '5432'
  const dbName = url.pathname.slice(1)
  const dbUser = url.username
  const dbPassword = url.password

  const pgRestoreCommand = `PGPASSWORD="${dbPassword}" pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --clean --if-exists "${backupFile}"`

  await execAsync(pgRestoreCommand)
}

/**
 * Verify data integrity
 */
async function verifyDataIntegrity(testDbUrl: string): Promise<{
  passed: boolean
  tablesChecked: number
  recordsChecked: number
  errors: string[]
}> {
  const url = new URL(testDbUrl)
  const dbHost = url.hostname
  const dbPort = url.port || '5432'
  const dbName = url.pathname.slice(1)
  const dbUser = url.username
  const dbPassword = url.password

  const errors: string[] = []
  let tablesChecked = 0
  let recordsChecked = 0

  // Check critical tables exist and have data
  const criticalTables = ['User', 'Staff', 'LeaveRequest', 'LeaveBalance']

  for (const table of criticalTables) {
    try {
      const result = await execAsync(
        `PGPASSWORD="${dbPassword}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -t -c "SELECT COUNT(*) FROM \\"${table}\\""`
      )
      const count = parseInt(result.stdout.trim())
      if (count === 0) {
        errors.push(`Table ${table} is empty`)
      } else {
        recordsChecked += count
      }
      tablesChecked++
    } catch (error: any) {
      errors.push(`Failed to verify table ${table}: ${error.message}`)
    }
  }

  return {
    passed: errors.length === 0,
    tablesChecked,
    recordsChecked,
    errors,
  }
}

/**
 * Cleanup test resources
 */
async function cleanupTestResources(backupFile: string, testDbUrl: string): Promise<void> {
  // Delete test backup
  if (fs.existsSync(backupFile)) {
    fs.unlinkSync(backupFile)
  }

  // Drop test database if we created it
  if (!TEST_DATABASE_URL) {
    const url = new URL(testDbUrl)
    const dbName = url.pathname.slice(1)
    const dbHost = url.hostname
    const dbPort = url.port || '5432'
    const dbUser = url.username
    const dbPassword = url.password

    try {
      await execAsync(
        `PGPASSWORD="${dbPassword}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d postgres -c "DROP DATABASE IF EXISTS ${dbName}"`
      )
      console.log(`✅ Test database dropped: ${dbName}`)
    } catch (error: any) {
      console.warn(`⚠️  Failed to drop test database: ${error.message}`)
    }
  }
}

main()

