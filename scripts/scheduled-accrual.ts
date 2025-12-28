/**
 * Scheduled Accrual Processing Script
 * Run this monthly to process leave accruals for all staff
 * 
 * Usage:
 * - Add to cron: 0 0 1 * * (runs on 1st of every month)
 * - Or run manually: tsx scripts/scheduled-accrual.ts
 */

// Load environment variables
import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { processLeaveAccrual } from '../lib/leave-accrual'

async function main() {
  console.log('🔄 Starting monthly accrual processing...')
  console.log(`📅 Date: ${new Date().toISOString()}`)

  try {
    // Get accrual date from system settings or use current date
    const accrualDateSetting = await prisma.systemSettings.findUnique({
      where: { key: 'accrual_day' },
    })

    const accrualDate = new Date()
    const accrualDay = accrualDateSetting ? parseInt(accrualDateSetting.value) : 1
    
    // Set to first of month or configured day
    accrualDate.setDate(accrualDay)
    accrualDate.setHours(0, 0, 0, 0)

    // Process accrual
    const result = await processLeaveAccrual({
      accrualDate,
      processExpiration: true, // Process expired leave
      processCarryForward: false, // Only process carry-forward at year-end
      processedBy: 'system-scheduled-job',
    })

    console.log(`✅ Accrual processing completed:`)
    console.log(`   - Processed: ${result.processed} staff members`)
    console.log(`   - Errors: ${result.errors.length}`)

    if (result.errors.length > 0) {
      console.log('⚠️ Errors encountered:')
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. Staff ${error.staffId}: ${error.error}`)
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'MONTHLY_ACCRUAL_PROCESSED',
        user: 'system',
        details: JSON.stringify({
          processed: result.processed,
          errors: result.errors.length,
          accrualDate: accrualDate.toISOString(),
        }),
      },
    })

    console.log('✅ Monthly accrual processing completed successfully')
  } catch (error: any) {
    console.error('❌ Accrual processing failed:', error)
    
    // Create error audit log
    await prisma.auditLog.create({
      data: {
        action: 'MONTHLY_ACCRUAL_FAILED',
        user: 'system',
        details: JSON.stringify({
          error: error.message,
          timestamp: new Date().toISOString(),
        }),
      },
    })

    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

