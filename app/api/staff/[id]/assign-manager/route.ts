import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isHR, isAdmin } from '@/lib/auth-proxy'

// PATCH assign manager to staff member
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR (not HR Assistant) and admin can assign managers
      if (!isHR(user) && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'Forbidden - Only HR and Admin can assign managers' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const { managerId } = body

      // Validate staff member exists
      const staff = await prisma.staffMember.findUnique({
        where: { id },
      })

      if (!staff) {
        return NextResponse.json(
          { error: 'Staff member not found' },
          { status: 404 }
        )
      }

      // If managerId is provided, validate it exists
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

        // Prevent self-assignment
        if (managerId === staff.staffId) {
          return NextResponse.json(
            { error: 'Staff member cannot be their own manager' },
            { status: 400 }
          )
        }

        // Prevent circular references (check if staff is manager of the assigned manager)
        const isCircular = await prisma.staffMember.findFirst({
          where: {
            staffId: managerId,
            managerId: staff.staffId,
          },
        })

        if (isCircular) {
          return NextResponse.json(
            { error: 'Circular manager assignment not allowed' },
            { status: 400 }
          )
        }
      }

      // Update staff member
      const updated = await prisma.staffMember.update({
        where: { id },
        data: {
          managerId: managerId || null,
        },
        include: {
          manager: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
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
            previousManagerId: staff.managerId || null,
          }),
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json(updated)
    } catch (error: any) {
      console.error('Error assigning manager:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to assign manager' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

// GET get manager assignment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const staff = await prisma.staffMember.findUnique({
        where: { id },
        include: {
          manager: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              email: true,
              position: true,
            },
          },
          teamMembers: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              email: true,
              position: true,
            },
          },
        },
      })

      if (!staff) {
        return NextResponse.json(
          { error: 'Staff member not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        manager: staff.manager,
        teamMembers: staff.teamMembers,
      })
    } catch (error) {
      console.error('Error fetching manager assignment:', error)
      return NextResponse.json(
        { error: 'Failed to fetch manager assignment' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'hr_assistant', 'admin', 'HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN', 'SYSTEM_ADMIN', 'SECURITY_ADMIN', 'hr_officer', 'hr_director'] })(request)
}

