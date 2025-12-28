/**
 * Year-End Leave Processing Script
 * Run this at the end of each year to process carry-forward and forfeiture
 * 
 * Usage:
 * - Add to cron: 0 0 1 1 * (runs on January 1st)
 * - Or run manually: tsx scripts/year-end-processing.ts
 */

// Load environment variables
import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { processYearEndForAllStaff } from '../lib/leave-rules'

async function main() {
  console.log('🎊 Starting year-end leave processing...')
  const year = new Date().getFullYear()
  console.log(`📅 Processing year: ${year}`)

  try {
    // Process year-end for all staff
    const results = await processYearEndForAllStaff()

    console.log(`✅ Year-end processing completed:`)
    console.log(`   - Processed: ${results.length} staff members`)

    let totalCarryForward = 0
    let totalForfeited = 0

    results.forEach((result) => {
      result.results.forEach((r) => {
        totalCarryForward += r.carryForwardDays
        totalForfeited += r.forfeitedDays
      })
    })

    console.log(`   - Total days carried forward: ${totalCarryForward}`)
    console.log(`   - Total days forfeited: ${totalForfeited}`)

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'YEAR_END_PROCESSING_COMPLETED',
        user: 'system',
        details: JSON.stringify({
          year,
          processed: results.length,
          totalCarryForward,
          totalForfeited,
          timestamp: new Date().toISOString(),
        }),
      },
    })

    console.log('✅ Year-end processing completed successfully')
  } catch (error: any) {
    console.error('❌ Year-end processing failed:', error)
    
    // Create error audit log
    await prisma.auditLog.create({
      data: {
        action: 'YEAR_END_PROCESSING_FAILED',
        user: 'system',
        details: JSON.stringify({
          error: error.message,
          year,
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

