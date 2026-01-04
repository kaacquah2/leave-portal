import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin } from '@/lib/auth-proxy'
import { ADMIN_ROLES } from '@/lib/role-utils'

// Force static export configuration
export const dynamic = 'force-static'

// POST initiate system backup
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only admin can access this route
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { type = 'full', description } = body

    // Create audit log for backup initiation
    await prisma.auditLog.create({
      data: {
        action: 'SYSTEM_BACKUP_INITIATED',
        user: user.email,
        userRole: user.role,
        details: `System backup initiated by ${user.email}. Type: ${type}${description ? `. Description: ${description}` : ''}`,
        timestamp: new Date(),
      },
    })

    // In a production environment, you would:
    // 1. Trigger actual database backup (e.g., pg_dump for PostgreSQL)
    // 2. Backup file storage
    // 3. Store backup metadata
    // 4. Send notification to admins
    
    // For now, we'll simulate a backup and return success
    // In production, this should be an async job that runs in the background
    
    return NextResponse.json({
      success: true,
      message: 'Backup initiated successfully',
      backupId: `backup-${Date.now()}`,
      type,
      initiatedBy: user.email,
      initiatedAt: new Date().toISOString(),
      status: 'pending',
      note: 'Backup is being processed. Check backup logs for completion status.',
    })
  } catch (error) {
    console.error('Error initiating backup:', error)
    return NextResponse.json(
      { error: 'Failed to initiate backup' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

// GET backup status/history
export const GET = withAuth(async ({ user }: AuthContext) => {
  try {
    // Only admin can access this route
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get backup-related audit logs
    const backupLogs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['SYSTEM_BACKUP_INITIATED', 'SYSTEM_BACKUP_COMPLETED', 'SYSTEM_BACKUP_FAILED'],
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 20,
    })

    return NextResponse.json({
      backups: backupLogs.map(log => ({
        id: log.id,
        action: log.action,
        initiatedBy: log.user,
        timestamp: log.timestamp,
        details: log.details,
      })),
      count: backupLogs.length,
    })
  } catch (error) {
    console.error('Error fetching backup history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch backup history' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

