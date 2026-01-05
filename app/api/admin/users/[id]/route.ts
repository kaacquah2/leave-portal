/**
 * PATCH /api/admin/users/[id]
 * DELETE /api/admin/users/[id]
 * 
 * Update or delete user (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin } from '@/lib/auth'
import { ADMIN_ROLES, VALID_USER_ROLES } from '@/lib/roles'

// Force static export configuration (required for static export mode)
// For static export, API routes are not generated but need generateStaticParams
// Return a dummy value to satisfy Next.js static export requirements
export function generateStaticParams() {
  // Return at least one value to satisfy static export requirements
  // This route will not actually be used in static export (API routes require server)
  return [{ id: 'dummy' }]
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only admin can access this route
      if (!isAdmin(user)) {
        return NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        )
      }

      const { id } = await params
      const body = await req.json()
      const { role, active } = body

      // Validate role if provided
      if (role) {
        if (!VALID_USER_ROLES.includes(role.toLowerCase() as any) && 
            !VALID_USER_ROLES.includes(role.toUpperCase() as any) &&
            !VALID_USER_ROLES.includes(role as any)) {
          return NextResponse.json(
            { error: `Invalid role. Must be one of the valid UserRole values.` },
            { status: 400 }
          )
        }
      }

      // Find user
      const existingUser = await prisma.user.findUnique({
        where: { id },
      })

      if (!existingUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...(role && { role: role.toLowerCase() }),
          ...(typeof active === 'boolean' && { active }),
        },
        include: {
          staff: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              department: true,
              position: true,
            },
          },
        },
      })

      // Comprehensive audit logging
      const { logRoleChange, logUserStatusChange } = await import('@/lib/comprehensive-audit')
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Log role change if role was updated
      if (role && role !== existingUser.role) {
        await logRoleChange(
          user.id,
          user.role,
          user.email,
          existingUser.id,
          existingUser.email,
          existingUser.role,
          role,
          user.id,
          user.email,
          ip,
          userAgent
        )
      }

      // Log user activation/deactivation
      if (typeof active === 'boolean' && active !== existingUser.active) {
        await logUserStatusChange(
          user.id,
          user.role,
          user.email,
          existingUser.id,
          existingUser.email,
          active ? 'activated' : 'deactivated',
          undefined,
          ip,
          userAgent
        )
      }

      // Also create standard audit log for backward compatibility
      await prisma.auditLog.create({
        data: {
          action: 'USER_UPDATED',
          user: user.email,
          userRole: user.role,
          staffId: updatedUser.staffId || undefined,
          details: `Admin ${user.email} updated user ${updatedUser.email}: ${role ? `role=${role}` : ''} ${typeof active === 'boolean' ? `active=${active}` : ''}`,
          ip,
          userAgent,
        },
      })

      return NextResponse.json({
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          staffId: updatedUser.staffId,
          active: updatedUser.active,
          staff: updatedUser.staff,
        },
      })
    } catch (error: any) {
      console.error('Error updating user:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update user' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ADMIN_ROLES })(request)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only admin can access this route
      if (!isAdmin(user)) {
        return NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        )
      }

      const { id } = await params

      // Find user
      const existingUser = await prisma.user.findUnique({
        where: { id },
        include: {
          staff: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      if (!existingUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      // Prevent deleting own account
      if (existingUser.id === user.id) {
        return NextResponse.json(
          { error: 'You cannot delete your own account' },
          { status: 400 }
        )
      }

      // Delete user (cascade will handle related records based on schema)
      await prisma.user.delete({
        where: { id },
      })

      // Create audit log
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      await prisma.auditLog.create({
        data: {
          action: 'USER_DELETED',
          user: user.email,
          userRole: user.role,
          staffId: existingUser.staffId || undefined,
          details: `Admin ${user.email} deleted user account: ${existingUser.email}${existingUser.staff ? ` (${existingUser.staff.firstName} ${existingUser.staff.lastName})` : ''}`,
          ip,
          userAgent,
        },
      })

      return NextResponse.json({
        success: true,
        message: `User ${existingUser.email} has been deleted successfully`,
      })
    } catch (error: any) {
      console.error('Error deleting user:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to delete user' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ADMIN_ROLES })(request)
}
