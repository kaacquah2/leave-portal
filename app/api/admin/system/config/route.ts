import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin } from '@/lib/auth'
import { ADMIN_ROLES } from '@/lib/roles'

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


// GET system configuration
export const GET = withAuth(async ({ user }: AuthContext) => {
  try {
    // Only admin can access this route
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get all system settings
    const settings = await prisma.systemSettings.findMany({
      orderBy: {
        category: 'asc',
      },
    })

    // Group by category
    const settingsByCategory = settings.reduce((acc, setting) => {
      const category = setting.category || 'general'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push({
        key: setting.key,
        value: setting.value,
        type: setting.type,
        description: setting.description,
        updatedAt: setting.updatedAt,
      })
      return acc
    }, {} as Record<string, any[]>)

    return NextResponse.json({
      settings: settingsByCategory,
      total: settings.length,
      categories: Object.keys(settingsByCategory),
    })
  } catch (error) {
    console.error('Error fetching system configuration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system configuration' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

// PUT update system configuration
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
    const { key, value, description } = body

    if (!key) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      )
    }

    // Validate value type
    const existingSetting = await prisma.systemSettings.findUnique({
      where: { key },
    })

    if (!existingSetting) {
      return NextResponse.json(
        { error: `Setting with key "${key}" not found` },
        { status: 404 }
      )
    }

    // Type validation
    let validatedValue = value
    if (existingSetting.type === 'number') {
      validatedValue = Number(value)
      if (isNaN(validatedValue)) {
        return NextResponse.json(
          { error: `Value must be a number for setting "${key}"` },
          { status: 400 }
        )
      }
    } else if (existingSetting.type === 'boolean') {
      validatedValue = value === 'true' || value === true
    }

    // Update setting
    const updated = await prisma.systemSettings.update({
      where: { key },
      data: {
        value: String(validatedValue),
        description: description || existingSetting.description,
        updatedAt: new Date(),
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'SYSTEM_CONFIG_UPDATED',
        user: user.email,
        userRole: user.role,
        details: `System setting "${key}" updated from "${existingSetting.value}" to "${validatedValue}" by ${user.email}`,
        timestamp: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      setting: {
        key: updated.key,
        value: updated.value,
        type: updated.type,
        description: updated.description,
        updatedAt: updated.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error updating system configuration:', error)
    return NextResponse.json(
      { error: 'Failed to update system configuration' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

