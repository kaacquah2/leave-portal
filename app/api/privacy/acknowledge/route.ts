/**
 * Privacy Acknowledgement API
 * 
 * Data Protection Act 843 Compliance: Require staff to acknowledge privacy notice
 * Per requirement: Require staff to acknowledge privacy notice on first login
 * 
 * Legal Reference: Data Protection Act, 2012 (Act 843)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { createAuditLog } from '@/lib/audit-logger'

/**
 * POST /api/privacy/acknowledge
 * Acknowledge privacy notice (required on first login)
 */
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Check if already acknowledged
    const existing = await prisma.privacyAcknowledgement.findUnique({
      where: { userId: user.id },
    })

    if (existing) {
      return NextResponse.json(
        { message: 'Privacy notice already acknowledged', acknowledged: true },
        { status: 200 }
      )
    }

    // Create acknowledgement
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const acknowledgement = await prisma.privacyAcknowledgement.create({
      data: {
        userId: user.id,
        staffId: user.staffId || null,
        ip,
        userAgent,
        version: '1.0', // Privacy notice version
      },
    })

    // Log acknowledgement for audit
    await createAuditLog({
      action: 'privacy_notice_acknowledged',
      user: user.id,
      userRole: user.role,
      staffId: user.staffId || undefined,
      details: 'Privacy notice acknowledged by user',
      metadata: {
        version: '1.0',
        ip,
      },
      ip,
      userAgent,
    })

    return NextResponse.json({
      message: 'Privacy notice acknowledged successfully',
      acknowledged: true,
      acknowledgement,
    })
  } catch (error) {
    console.error('Error acknowledging privacy notice:', error)
    return NextResponse.json(
      { error: 'Failed to acknowledge privacy notice' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['*'] }) // All authenticated users

/**
 * GET /api/privacy/acknowledge
 * Check if privacy notice has been acknowledged
 */
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const acknowledgement = await prisma.privacyAcknowledgement.findUnique({
      where: { userId: user.id },
    })

    return NextResponse.json({
      acknowledged: !!acknowledgement,
      acknowledgement: acknowledgement || null,
    })
  } catch (error) {
    console.error('Error checking privacy acknowledgement:', error)
    return NextResponse.json(
      { error: 'Failed to check privacy acknowledgement' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['*'] }) // All authenticated users

