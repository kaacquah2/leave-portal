import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin } from '@/lib/auth'
import { ADMIN_ROLES } from '@/lib/roles'

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


// POST override policy
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
    const { policyId, override, reason, staffId } = body

    if (!policyId || override === undefined) {
      return NextResponse.json(
        { error: 'Policy ID and override value are required' },
        { status: 400 }
      )
    }

    // Get policy
    const policy = await prisma.leavePolicy.findUnique({
      where: { id: policyId },
    })

    if (!policy) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      )
    }

    // Create policy override record (you may want to create a PolicyOverride table)
    // For now, we'll store it in system settings or audit log
    const overrideKey = `policy_override_${policyId}_${staffId || 'global'}`

    await prisma.systemSettings.upsert({
      where: { key: overrideKey },
      update: {
        value: JSON.stringify({
          policyId,
          staffId: staffId || null,
          override,
          reason,
          overriddenBy: user.email,
          overriddenAt: new Date().toISOString(),
        }),
        updatedAt: new Date(),
      },
      create: {
        key: overrideKey,
        value: JSON.stringify({
          policyId,
          staffId: staffId || null,
          override,
          reason,
          overriddenBy: user.email,
          overriddenAt: new Date().toISOString(),
        }),
        type: 'string',
        category: 'policy_override',
        description: `Policy override for ${policy.leaveType}`,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ADMIN_OVERRIDE_POLICY',
        user: user.email,
        userRole: user.role,
        staffId: staffId || null,
        details: `Policy override: ${override ? 'Enabled' : 'Disabled'} policy ${policy.leaveType} (${policyId})${staffId ? ` for staff ${staffId}` : ' globally'} by ${user.email}. Reason: ${reason || 'Admin override'}`,
        timestamp: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      policyId,
      override,
      staffId: staffId || null,
      message: `Policy override ${override ? 'enabled' : 'disabled'} successfully`,
    })
  } catch (error) {
    console.error('Error performing policy override:', error)
    return NextResponse.json(
      { error: 'Failed to perform policy override' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

