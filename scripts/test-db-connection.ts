/**
 * Script to test database connection and diagnose connection issues
 * 
 * Usage: npx tsx scripts/test-db-connection.ts
 */

import dotenv from 'dotenv'
import { resolve } from 'path'
import { testDatabaseConnection } from '../lib/db-utils'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') })

async function main() {
  console.log('🔍 Testing database connection...\n')
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set')
    console.log('\nPlease set DATABASE_URL in your .env file')
    process.exit(1)
  }

  // Mask password in connection string for display
  const maskedUrl = process.env.DATABASE_URL.replace(
    /:([^:@]+)@/,
    ':****@'
  )
  console.log(`📡 Connection String: ${maskedUrl}\n`)

  // Test connection
  const result = await testDatabaseConnection()

  if (result.connected) {
    console.log('✅ Database connection successful!')
    process.exit(0)
  } else {
    console.error('❌ Database connection failed!')
    console.error(`\nError: ${result.error}`)
    if (result.details) {
      console.error(`Details: ${result.details}`)
    }
    
    console.log('\n🔧 Troubleshooting steps:')
    console.log('1. Check your internet connection')
    console.log('2. Verify the DATABASE_URL in your .env file is correct')
    console.log('3. Check if the database endpoint is accessible:')
    const hostname = process.env.DATABASE_URL.match(/@([^/]+)\//)?.[1]
    if (hostname) {
      console.log(`   Try: ping ${hostname}`)
      console.log(`   Or: nslookup ${hostname}`)
    }
    console.log('4. Check firewall/proxy settings')
    console.log('5. Verify your Neon database is active in the Neon console')
    console.log('6. Try using the direct connection URL (without -pooler)')
    
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})

