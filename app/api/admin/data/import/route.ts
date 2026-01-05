import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin } from '@/lib/auth'
import { ADMIN_ROLES } from '@/lib/roles'
import { hashPassword } from '@/lib/auth'

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


// POST import data
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
    const { type, data, dryRun = false } = body

    if (!type || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Type and data array are required' },
        { status: 400 }
      )
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Import based on type
    switch (type) {
      case 'users':
        for (const item of data) {
          try {
            if (dryRun) {
              // Validate only
              if (!item.email || !item.password || !item.role) {
                results.failed++
                results.errors.push(`Invalid user data: ${item.email || 'unknown'}`)
                continue
              }
              results.success++
            } else {
              // Create user
              const passwordHash = await hashPassword(item.password)
              await prisma.user.create({
                data: {
                  email: item.email.toLowerCase(),
                  passwordHash,
                  role: item.role,
                  staffId: item.staffId || null,
                  active: item.active !== false,
                  emailVerified: false,
                },
              })
              results.success++
            }
          } catch (error: any) {
            results.failed++
            results.errors.push(`Failed to import user ${item.email}: ${error.message}`)
          }
        }
        break

      case 'policies':
        for (const item of data) {
          try {
            if (dryRun) {
              if (!item.leaveType) {
                results.failed++
                results.errors.push(`Invalid policy: missing leaveType`)
                continue
              }
              results.success++
            } else {
              await prisma.leavePolicy.create({
                data: {
                  leaveType: item.leaveType,
                  maxDays: item.maxDays || 0,
                  accrualRate: item.accrualRate || 0,
                  accrualFrequency: item.accrualFrequency || 'monthly',
                  carryoverAllowed: item.carryoverAllowed || false,
                  maxCarryover: item.maxCarryover || 0,
                  requiresApproval: item.requiresApproval !== false,
                  approvalLevels: item.approvalLevels || 1,
                  active: item.active !== false,
                },
              })
              results.success++
            }
          } catch (error: any) {
            results.failed++
            results.errors.push(`Failed to import policy ${item.leaveType}: ${error.message}`)
          }
        }
        break

      default:
        return NextResponse.json(
          { error: `Invalid import type: ${type}` },
          { status: 400 }
        )
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DATA_IMPORT',
        user: user.email,
        userRole: user.role,
        details: `Imported ${type} data: ${results.success} successful, ${results.failed} failed${dryRun ? ' (dry run)' : ''} by ${user.email}`,
        timestamp: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      dryRun,
      results,
      message: dryRun
        ? `Validation complete: ${results.success} valid, ${results.failed} invalid`
        : `Import complete: ${results.success} imported, ${results.failed} failed`,
    })
  } catch (error) {
    console.error('Error importing data:', error)
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

