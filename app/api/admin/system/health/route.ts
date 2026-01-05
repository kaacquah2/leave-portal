import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin } from '@/lib/auth'
import { ADMIN_ROLES } from '@/lib/roles'

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


// GET system health status
export const GET = withAuth(async ({ user }: AuthContext) => {
  try {
    // Only admin can access this route
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const startTime = Date.now()
    
    // Check database connectivity
    let databaseConnected = false
    try {
      await prisma.$queryRaw`SELECT 1`
      databaseConnected = true
    } catch (error) {
      console.error('Database health check failed:', error)
      databaseConnected = false
    }

    // Check API service (if we can query, API is working)
    const apiWorking = true // If we got here, API is working

    // Calculate uptime (simplified - in production, track from server start)
    const processUptime = process.uptime ? process.uptime() : 0

    // Determine overall status
    let status: 'operational' | 'degraded' | 'down' = 'operational'
    if (!databaseConnected) {
      status = 'down'
    } else if (!apiWorking) {
      status = 'degraded'
    }

    // Get system metrics (if available)
    const health = {
      status,
      database: databaseConnected,
      api: apiWorking,
      uptime: Math.floor(processUptime),
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      // Optional: Add disk usage, memory usage if available
      // diskUsage: getDiskUsage(),
      // memoryUsage: getMemoryUsage(),
    }

    return NextResponse.json(health)
  } catch (error) {
    console.error('Error checking system health:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check system health',
        status: 'down',
        database: false,
        api: false,
        uptime: 0,
      },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

