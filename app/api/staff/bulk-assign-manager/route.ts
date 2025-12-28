import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// POST bulk assign manager to multiple staff members
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR and admin can perform bulk assignments
      if (user.role !== 'hr' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - Only HR and Admin can perform bulk assignments' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const { staffIds, managerId } = body

      if (!Array.isArray(staffIds) || staffIds.length === 0) {
        return NextResponse.json(
          { error: 'staffIds must be a non-empty array' },
          { status: 400 }
        )
      }

      // Validate manager exists if provided
      if (managerId) {
        const manager = await prisma.staffMember.findUnique({
          where: { staffId: managerId },
        })

        if (!manager) {
          return NextResponse.json(
            { error: 'Manager not found' },
            { status: 404 }
          )
        }
      }

      const results = {
        success: [] as string[],
        failed: [] as Array<{ staffId: string; error: string }>,
      }

      // Process each staff member
      for (const staffId of staffIds) {
        try {
          const staff = await prisma.staffMember.findUnique({
            where: { staffId },
          })

          if (!staff) {
            results.failed.push({ staffId, error: 'Staff member not found' })
            continue
          }

          // Prevent self-assignment
          if (managerId && managerId === staff.staffId) {
            results.failed.push({ staffId, error: 'Cannot assign self as manager' })
            continue
          }

          // Update staff member
          await prisma.staffMember.update({
            where: { staffId },
            data: {
              managerId: managerId || null,
            },
          })

          // Create audit log
          await prisma.auditLog.create({
            data: {
              action: managerId ? 'MANAGER_ASSIGNED' : 'MANAGER_REMOVED',
              user: user.email || 'system',
              staffId: staff.staffId,
              details: JSON.stringify({
                staffId: staff.staffId,
                staffName: `${staff.firstName} ${staff.lastName}`,
                managerId: managerId || null,
                bulkOperation: true,
              }),
              ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
            },
          })

          results.success.push(staffId)
        } catch (error: any) {
          results.failed.push({ staffId, error: error.message || 'Unknown error' })
        }
      }

      return NextResponse.json({
        success: true,
        processed: results.success.length,
        failed: results.failed.length,
        results,
      })
    } catch (error: any) {
      console.error('Error performing bulk manager assignment:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to perform bulk assignment' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

