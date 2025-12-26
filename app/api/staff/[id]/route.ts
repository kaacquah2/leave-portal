import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET single staff member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const staff = await prisma.staffMember.findUnique({
        where: { id },
      })
      if (!staff) {
        return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
      }
      
      // Employees can only view their own profile
      if (user.role === 'employee' && staff.staffId !== user.staffId) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
      
      return NextResponse.json(staff)
    } catch (error) {
      console.error('Error fetching staff:', error)
      return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
    }
  }, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })(request)
}

// PATCH update staff member
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request }: AuthContext) => {
    try {
      // Only HR and admin can update staff
      if (user.role !== 'hr' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const staff = await prisma.staffMember.update({
        where: { id },
        data: {
          ...(body.firstName && { firstName: body.firstName }),
          ...(body.lastName && { lastName: body.lastName }),
          ...(body.email && { email: body.email }),
          ...(body.phone && { phone: body.phone }),
          ...(body.department && { department: body.department }),
          ...(body.position && { position: body.position }),
          ...(body.grade && { grade: body.grade }),
          ...(body.level && { level: body.level }),
          ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl }),
          ...(body.active !== undefined && { active: body.active }),
          ...(body.employmentStatus && { employmentStatus: body.employmentStatus }),
          ...(body.terminationDate && { terminationDate: new Date(body.terminationDate) }),
          ...(body.terminationReason !== undefined && { terminationReason: body.terminationReason }),
          ...(body.joinDate && { joinDate: new Date(body.joinDate) }),
        },
      })
      return NextResponse.json(staff)
    } catch (error) {
      console.error('Error updating staff:', error)
      return NextResponse.json({ error: 'Failed to update staff' }, { status: 500 })
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

// POST terminate staff member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR and admin can terminate staff
      if (user.role !== 'hr' && user.role !== 'admin') {
        return NextResponse.json(
          { 
            error: 'You do not have permission to terminate staff',
            errorCode: 'PERMISSION_DENIED',
            troubleshooting: [
              'Only HR and admin roles can terminate staff members',
              'Verify you have the correct role assigned',
              'Contact IT support if you believe this is an error',
            ],
          },
          { status: 403 }
        )
      }

      const body = await req.json()
      const { terminationDate, terminationReason, employmentStatus } = body

      if (!terminationDate || !terminationReason) {
        return NextResponse.json(
          { 
            error: 'Termination date and reason are required',
            errorCode: 'VALIDATION_ERROR',
            troubleshooting: [
              'Ensure all required fields are filled',
              'Termination date is required',
              'Termination reason must be at least 10 characters',
              'Check that all fields are properly filled',
            ],
          },
          { status: 400 }
        )
      }
      
      if (terminationReason.trim().length < 10) {
        return NextResponse.json(
          { 
            error: 'Termination reason must be at least 10 characters',
            errorCode: 'VALIDATION_ERROR',
            troubleshooting: [
              'Termination reason must be at least 10 characters long',
              'Provide a detailed reason for termination',
              'Ensure the reason field is properly filled',
            ],
          },
          { status: 400 }
        )
      }
      
      // Check if staff member exists
      const existingStaff = await prisma.staffMember.findUnique({
        where: { id },
        select: { id: true, staffId: true, firstName: true, lastName: true, employmentStatus: true, active: true } as any,
      })
      
      if (!existingStaff) {
        return NextResponse.json(
          { 
            error: 'Staff member not found',
            errorCode: 'STAFF_NOT_FOUND',
            troubleshooting: [
              'The staff member may have been deleted',
              'Verify the staff ID is correct',
              'Refresh the page and try again',
              'Contact IT support if you believe this is an error',
            ],
          },
          { status: 404 }
        )
      }
      
      // Check if already terminated
      if ((existingStaff as any).employmentStatus !== 'active' || !existingStaff.active) {
        return NextResponse.json(
          { 
            error: 'Staff member is already terminated or inactive',
            errorCode: 'ALREADY_TERMINATED',
            currentStatus: (existingStaff as any).employmentStatus,
            troubleshooting: [
              `This staff member is already ${(existingStaff as any).employmentStatus || 'inactive'}`,
              'Check the staff member\'s current status',
              'If you need to update termination details, contact HR',
            ],
          },
          { status: 400 }
        )
      }

      // Update staff member to terminated status
      const staff = await prisma.staffMember.update({
        where: { id },
        data: {
          active: false,
          employmentStatus: employmentStatus || 'terminated' as any,
          terminationDate: new Date(terminationDate),
          terminationReason,
        },
        include: {
          user: true,
        },
      })

      // Deactivate associated user account if exists
      if (staff.user) {
        await prisma.user.update({
          where: { id: staff.user.id },
          data: { active: false },
        })

        // Delete all active sessions for this user
        await prisma.session.deleteMany({
          where: { userId: staff.user.id },
        })
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'STAFF_TERMINATED',
          user: user.email,
          staffId: staff.staffId,
          details: `Staff member ${staff.firstName} ${staff.lastName} (${staff.staffId}) terminated. Reason: ${terminationReason}`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json({ success: true, staff })
    } catch (error) {
      console.error('Error terminating staff:', error)
      return NextResponse.json({ error: 'Failed to terminate staff' }, { status: 500 })
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

// DELETE staff member (soft delete - should use termination instead)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only HR and admin can delete staff
      if (user.role !== 'hr' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      await prisma.staffMember.delete({
        where: { id },
      })
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error deleting staff:', error)
      return NextResponse.json({ error: 'Failed to delete staff' }, { status: 500 })
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

