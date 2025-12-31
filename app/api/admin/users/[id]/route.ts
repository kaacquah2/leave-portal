/**
 * PATCH /api/admin/users/[id]
 * 
 * Update user role and status (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only admin can access this route
      const normalizedRole = user.role?.toUpperCase()
      const isAdmin = user.role === 'admin' || 
                     normalizedRole === 'SYS_ADMIN' || 
                     normalizedRole === 'SYSTEM_ADMIN' || 
                     normalizedRole === 'SECURITY_ADMIN'
      
      if (!isAdmin) {
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
        const validRoles = [
          'employee', 'supervisor', 'unit_head', 'division_head', 'directorate_head',
          'regional_manager', 'hr_officer', 'hr_director', 'chief_director',
          'internal_auditor', 'admin',
          // Legacy roles
          'hr', 'hr_assistant', 'manager', 'deputy_director',
        ]
        
        if (!validRoles.includes(role.toLowerCase())) {
          return NextResponse.json(
            { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
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

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'USER_UPDATED',
          user: user.email,
          staffId: updatedUser.staffId || undefined,
          details: `Admin ${user.email} updated user ${updatedUser.email}: ${role ? `role=${role}` : ''} ${typeof active === 'boolean' ? `active=${active}` : ''}`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
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
  }, { allowedRoles: ['admin', 'SYS_ADMIN', 'SYSTEM_ADMIN', 'SECURITY_ADMIN'] })(request)
}

