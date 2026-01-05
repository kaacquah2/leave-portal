import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin } from '@/lib/auth'
import { ADMIN_ROLES } from '@/lib/roles'

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


// GET retention policies
export const GET = withAuth(async ({ user }: AuthContext) => {
  try {
    // Only admin can access this route
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get retention policy settings
    const retentionSettings = await prisma.systemSettings.findMany({
      where: {
        key: {
          startsWith: 'retention_',
        },
      },
    })

    // Default retention policies
    const defaultPolicies = {
      auditLogs: 365, // 1 year
      notifications: 90, // 3 months
      leaveRequests: 2555, // 7 years (statutory requirement)
      staffRecords: 0, // Never delete
      documents: 2555, // 7 years
    }

    // Merge with stored settings
    const policies = { ...defaultPolicies }
    retentionSettings.forEach(setting => {
      const key = setting.key.replace('retention_', '')
      if (key in policies) {
        policies[key as keyof typeof policies] = parseInt(setting.value) || defaultPolicies[key as keyof typeof policies]
      }
    })

    return NextResponse.json({
      policies,
      settings: retentionSettings,
    })
  } catch (error) {
    console.error('Error fetching retention policies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch retention policies' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

// PUT update retention policies
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
    const { policies } = body

    if (!policies || typeof policies !== 'object') {
      return NextResponse.json(
        { error: 'Policies object is required' },
        { status: 400 }
      )
    }

    const updated = []

    // Update each retention policy
    for (const [key, value] of Object.entries(policies)) {
      const settingKey = `retention_${key}`
      const days = typeof value === 'number' ? value : parseInt(String(value))

      if (isNaN(days) || days < 0) {
        continue // Skip invalid values
      }

      await prisma.systemSettings.upsert({
        where: { key: settingKey },
        update: {
          value: String(days),
          updatedAt: new Date(),
        },
        create: {
          key: settingKey,
          value: String(days),
          type: 'number',
          category: 'retention',
          description: `Retention period in days for ${key}`,
        },
      })

      updated.push({ key, days })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'RETENTION_POLICY_UPDATED',
        user: user.email,
        userRole: user.role,
        details: `Retention policies updated by ${user.email}: ${JSON.stringify(updated)}`,
        timestamp: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      updated,
      message: `Updated ${updated.length} retention policies`,
    })
  } catch (error) {
    console.error('Error updating retention policies:', error)
    return NextResponse.json(
      { error: 'Failed to update retention policies' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

