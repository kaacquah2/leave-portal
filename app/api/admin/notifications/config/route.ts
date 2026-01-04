import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin } from '@/lib/auth-proxy'
import { ADMIN_ROLES } from '@/lib/role-utils'

// Force static export configuration
export const dynamic = 'force-static'

interface NotificationConfig {
  emailEnabled: boolean
  systemEnabled: boolean
  backupFailureEnabled: boolean
  syncFailureEnabled: boolean
  authFailureEnabled: boolean
  policyChangeEnabled: boolean
  emailServer: string
  emailFrom: string
}

// GET notification configuration
export const GET = withAuth(async ({ user }: AuthContext) => {
  try {
    // Only admin can access this route
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get notification settings
    const settings = await prisma.systemSettings.findMany({
      where: {
        key: {
          startsWith: 'notification_',
        },
      },
    })

    // Default notification config
    const defaultConfig = {
      emailEnabled: true,
      systemEnabled: true,
      backupFailureEnabled: true,
      syncFailureEnabled: true,
      authFailureEnabled: true,
      policyChangeEnabled: true,
      emailServer: process.env.SMTP_HOST || '',
      emailFrom: process.env.SMTP_FROM || '',
    }

    // Merge with stored settings
    const config: NotificationConfig = { ...defaultConfig }
    settings.forEach(setting => {
      const key = setting.key.replace('notification_', '')
      if (key in config) {
        const value = setting.value
        if (setting.type === 'boolean') {
          (config as any)[key] = value === 'true'
        } else {
          (config as any)[key] = value
        }
      }
    })

    return NextResponse.json({
      config,
      settings,
    })
  } catch (error) {
    console.error('Error fetching notification config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification configuration' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

// PUT update notification configuration
export const PUT = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only admin can access this route
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { config } = body

    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { error: 'Config object is required' },
        { status: 400 }
      )
    }

    const updated = []

    // Update each notification setting
    for (const [key, value] of Object.entries(config)) {
      const settingKey = `notification_${key}`
      const isBoolean = typeof value === 'boolean'
      const settingValue = String(value)

      await prisma.systemSettings.upsert({
        where: { key: settingKey },
        update: {
          value: settingValue,
          updatedAt: new Date(),
        },
        create: {
          key: settingKey,
          value: settingValue,
          type: isBoolean ? 'boolean' : 'string',
          category: 'notification',
          description: `Notification setting for ${key}`,
        },
      })

      updated.push({ key, value })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'NOTIFICATION_CONFIG_UPDATED',
        user: user.email,
        userRole: user.role,
        details: `Notification configuration updated by ${user.email}`,
        timestamp: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      updated,
      message: `Updated ${updated.length} notification settings`,
    })
  } catch (error) {
    console.error('Error updating notification config:', error)
    return NextResponse.json(
      { error: 'Failed to update notification configuration' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

