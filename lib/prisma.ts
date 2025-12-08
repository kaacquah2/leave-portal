import { PrismaClient } from '@prisma/client'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

// Pre-load bufferutil to ensure it's available when ws needs it
// This is an optional dependency that improves WebSocket performance
if (typeof window === 'undefined') {
  try {
    require('bufferutil')
  } catch (e) {
    // bufferutil is optional - ws will fall back to JS implementation
  }
  try {
    require('utf-8-validate')
  } catch (e) {
    // utf-8-validate is optional - ws will fall back to JS implementation
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configure Neon for Node.js environment
// Only set WebSocket constructor if we're in a Node.js environment (not edge runtime)
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws
}

// Prisma 7: Use Neon adapter with DATABASE_URL from environment variables
// DIRECT_URL is used for migrations via prisma.config.ts
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const adapter = new PrismaNeon({ connectionString })

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

