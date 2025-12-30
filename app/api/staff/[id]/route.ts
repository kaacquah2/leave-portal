import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { mapToMoFARole } from '@/lib/role-mapping'
import { hasPermission } from '@/lib/permissions'

// GET single staff member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request }: AuthContext) => {
    try {
    const normalizedRole = mapToMoFARole(user.role)
    
    // Get user's staff record for organizational info
    let userStaff = null
    if (user.staffId) {
      userStaff = await prisma.staffMember.findUnique({
        where: { staffId: user.staffId },
        select: {
          unit: true,
          directorate: true,
          dutyStation: true,
          staffId: true,
        },
      })
    }
    
    const staff = await prisma.staffMember.findUnique({
      where: { id },
    })
    
    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }
    
    // Check permissions
    if (hasPermission(normalizedRole, 'employee:view:all') || hasPermission(normalizedRole, 'org:view:all')) {
      // HR roles can view all
      return NextResponse.json(staff)
    }
    
    if (normalizedRole === 'EMPLOYEE' || normalizedRole === 'employee') {
      // Employees can only view their own record
      if (user.staffId && staff.staffId === user.staffId) {
        return NextResponse.json(staff)
      }
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Check unit-based permissions
    if (normalizedRole === 'UNIT_HEAD' || normalizedRole === 'unit_head') {
      if (userStaff?.unit && staff.unit === userStaff.unit) {
        return NextResponse.json(staff)
      }
    }
    
    // Check directorate-based permissions
    if (
      normalizedRole === 'DIRECTOR' || 
      normalizedRole === 'DIVISION_HEAD' ||
      normalizedRole === 'directorate_head' || 
      normalizedRole === 'division_head' ||
      normalizedRole === 'deputy_director'
    ) {
      if (userStaff?.directorate && staff.directorate === userStaff.directorate) {
        return NextResponse.json(staff)
      }
    }
    
    // Check regional permissions
    if (normalizedRole === 'REGIONAL_MANAGER' || normalizedRole === 'regional_manager') {
      if (userStaff?.dutyStation && 
          (userStaff.dutyStation === 'Region' || userStaff.dutyStation === 'District') &&
          (staff.dutyStation === 'Region' || staff.dutyStation === 'District')) {
        return NextResponse.json(staff)
      }
    }
    
    // Check supervisor permissions (direct reports)
    if (normalizedRole === 'SUPERVISOR' || normalizedRole === 'supervisor' || normalizedRole === 'manager') {
      if (user.staffId && (staff.managerId === user.staffId || staff.immediateSupervisorId === user.staffId)) {
        return NextResponse.json(staff)
      }
    }
    
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: 'Failed to fetch staff member' }, { status: 500 })
    }
  }, { 
    allowedRoles: [
      'hr', 'hr_assistant', 'admin', 'employee', 'manager', 'deputy_director',
      'EMPLOYEE', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR',
      'REGIONAL_MANAGER', 'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR',
      'AUDITOR', 'SYS_ADMIN'
    ] 
  })(request)
}

// PATCH update staff member
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request }: AuthContext) => {
    try {
    const normalizedRole = mapToMoFARole(user.role)
    
    // Only HR roles, HR Director, and SYS_ADMIN can update staff
    // Check using helper functions for normalized role matching
    const { isHR, isAdmin } = await import('@/lib/auth-proxy')
    if (
      !hasPermission(normalizedRole, 'employee:update') &&
      !isHR(user) &&
      !isAdmin(user)
    ) {
      return NextResponse.json(
        { error: 'Forbidden - Only HR roles can update staff members' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    // Get existing staff member
    const existing = await prisma.staffMember.findUnique({
      where: { id },
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }
    
    // Update staff member
    const updated = await prisma.staffMember.update({
      where: { id },
      data: {
        ...(body.firstName && { firstName: body.firstName }),
        ...(body.lastName && { lastName: body.lastName }),
        ...(body.email && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.department !== undefined && { department: body.department }),
        ...(body.position !== undefined && { position: body.position }),
        ...(body.grade !== undefined && { grade: body.grade }),
        ...(body.level !== undefined && { level: body.level }),
        ...(body.rank !== undefined && { rank: body.rank || null }),
        ...(body.step !== undefined && { step: body.step || null }),
        ...(body.directorate !== undefined && { directorate: body.directorate || null }),
        ...(body.division !== undefined && { division: body.division || null }),
        ...(body.unit !== undefined && { unit: body.unit || null }),
        ...(body.dutyStation !== undefined && { dutyStation: body.dutyStation || 'HQ' }),
        ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.employmentStatus !== undefined && { employmentStatus: body.employmentStatus }),
        ...(body.managerId !== undefined && { managerId: body.managerId || null }),
        ...(body.immediateSupervisorId !== undefined && { immediateSupervisorId: body.immediateSupervisorId || null }),
        ...(body.joinDate && { joinDate: new Date(body.joinDate) }),
      },
    })
    
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating staff:', error)
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field'
      return NextResponse.json(
        { error: `${field} already exists` },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
    }
  }, { 
    allowedRoles: [
      'hr', 'admin', 'HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN'
    ] 
  })(request)
}

