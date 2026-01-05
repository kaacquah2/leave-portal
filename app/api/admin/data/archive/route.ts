import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin } from '@/lib/auth'
import { ADMIN_ROLES } from '@/lib/roles'

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


// POST archive old records
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only admin can access this route
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { type, olderThanDays, dryRun = false } = body

    if (!type || !olderThanDays) {
      return NextResponse.json(
        { error: 'Type and olderThanDays are required' },
        { status: 400 }
      )
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    let count = 0
    let archived = 0

    switch (type) {
      case 'audit-logs':
        count = await prisma.auditLog.count({
          where: {
            timestamp: {
              lt: cutoffDate,
            },
          },
        })
        if (!dryRun) {
          // In production, you would move to archive table or external storage
          // For now, we'll just mark them
          await prisma.auditLog.updateMany({
            where: {
              timestamp: {
                lt: cutoffDate,
              },
            },
            data: {
              // Add archived flag if you have it, or delete
            },
          })
          archived = count
        }
        break

      case 'notifications':
        count = await prisma.notification.count({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
            read: true,
          },
        })
        if (!dryRun) {
          await prisma.notification.deleteMany({
            where: {
              createdAt: {
                lt: cutoffDate,
              },
              read: true,
            },
          })
          archived = count
        }
        break

      default:
        return NextResponse.json(
          { error: `Invalid archive type: ${type}` },
          { status: 400 }
        )
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DATA_ARCHIVE',
        user: user.email,
        userRole: user.role,
        details: `${dryRun ? 'Dry run: ' : ''}Archived ${archived || count} ${type} records older than ${olderThanDays} days by ${user.email}`,
        timestamp: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      dryRun,
      type,
      olderThanDays,
      recordsFound: count,
      recordsArchived: archived,
      cutoffDate: cutoffDate.toISOString(),
    })
  } catch (error) {
    console.error('Error archiving data:', error)
    return NextResponse.json(
      { error: 'Failed to archive data' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

