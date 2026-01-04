/**
 * Health Check Endpoint
 * 
 * GET /api/health
 * 
 * Returns the health status of the application including:
 * - Application status
 * - Database connection status
 * - Environment information (without sensitive data)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { testDatabaseConnection } from '@/lib/db-utils'
import { logger } from '@/lib/logger'
import { addCorsHeaders, handleCorsPreflight } from '@/lib/cors'

// Handle OPTIONS preflight requests

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 })
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const health: {
    status: 'healthy' | 'degraded' | 'unhealthy'
    timestamp: string
    uptime: number
    version: string
    environment: string
    checks: {
      database: {
        status: 'healthy' | 'unhealthy'
        responseTime?: number
        error?: string
      }
    }
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || 'unknown',
    environment: process.env.NODE_ENV || 'unknown',
    checks: {
      database: {
        status: 'unhealthy',
      },
    },
  }

  try {
    // Test database connection
    const dbStartTime = Date.now()
    const dbResult = await testDatabaseConnection()
    const dbResponseTime = Date.now() - dbStartTime

    health.checks.database = {
      status: dbResult.connected ? 'healthy' : 'unhealthy',
      responseTime: dbResponseTime,
      ...(dbResult.error && { error: dbResult.error }),
    }

    // Determine overall health status
    if (!dbResult.connected) {
      health.status = 'unhealthy'
      logger.warn('Health check failed: Database connection failed', {
        error: dbResult.error,
        responseTime: dbResponseTime,
      })
    } else {
      logger.debug('Health check passed', {
        responseTime: Date.now() - startTime,
        dbResponseTime,
      })
    }

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 503

    const response = NextResponse.json(health, { status: statusCode })
    return addCorsHeaders(response, request)
  } catch (error) {
    logger.error('Health check error', error)
    health.status = 'unhealthy'
    health.checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    }

    const response = NextResponse.json(health, { status: 503 })
    return addCorsHeaders(response, request)
  }
}

