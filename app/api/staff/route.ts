import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { mapToMoFARole } from '@/lib/role-mapping'
import { hasPermission } from '@/lib/permissions'
import { MOFA_UNITS, getUnitConfig, getDirectorateForUnit } from '@/lib/mofa-unit-mapping'

// GET all staff members
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Normalize role to MoFA role code
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
    
    let where: any = {}
    
    // HR roles, HR Director, Chief Director, SYS_ADMIN, and AUDITOR can view all
    if (
      hasPermission(normalizedRole, 'employee:view:all') ||
      hasPermission(normalizedRole, 'org:view:all')
    ) {
      // No filter - view all staff
    }
    // Employees can only view their own record
    else if (normalizedRole === 'EMPLOYEE' || normalizedRole === 'employee') {
      if (user.staffId) {
        where.staffId = user.staffId
      } else {
        // No staffId - return empty
        return NextResponse.json([])
      }
    }
    // Regional Manager: Filter by duty station (Region/District)
    else if (normalizedRole === 'REGIONAL_MANAGER' || normalizedRole === 'regional_manager') {
      if (userStaff?.dutyStation) {
        where.dutyStation = {
          in: ['Region', 'District'],
        }
        // Optionally filter by same region if we have region data
      }
    }
    // Director: Filter by directorate
    else if (
      normalizedRole === 'DIRECTOR' || 
      normalizedRole === 'directorate_head' || 
      normalizedRole === 'deputy_director'
    ) {
      if (userStaff?.directorate) {
        where.directorate = userStaff.directorate
      } else {
        // No directorate - return empty
        return NextResponse.json([])
      }
    }
    // Division Head: Filter by directorate (similar to Director)
    else if (normalizedRole === 'DIVISION_HEAD' || normalizedRole === 'division_head') {
      if (userStaff?.directorate) {
        where.directorate = userStaff.directorate
      } else {
        return NextResponse.json([])
      }
    }
    // Unit Head: Filter by unit
    else if (normalizedRole === 'UNIT_HEAD' || normalizedRole === 'unit_head') {
      if (userStaff?.unit) {
        where.unit = userStaff.unit
      } else {
        return NextResponse.json([])
      }
    }
    // Supervisor: Filter by direct reports (managerId or immediateSupervisorId)
    else if (
      normalizedRole === 'SUPERVISOR' || 
      normalizedRole === 'supervisor' || 
      normalizedRole === 'manager'
    ) {
      if (user.staffId) {
        where.OR = [
          { managerId: user.staffId },
          { immediateSupervisorId: user.staffId },
        ]
      } else {
        return NextResponse.json([])
      }
    }
    // Default: return empty if no permission
    else {
      return NextResponse.json([])
    }

    const staff = await prisma.staffMember.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    
    return NextResponse.json(staff)
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }
}, { 
  allowedRoles: [
    'hr', 'hr_assistant', 'admin', 'employee', 'manager', 'deputy_director',
    'EMPLOYEE', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR',
    'REGIONAL_MANAGER', 'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR',
    'AUDITOR', 'SYS_ADMIN'
  ] 
})

// POST create staff member
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Normalize role to MoFA role code
    const normalizedRole = mapToMoFARole(user.role)
    
    // Only HR roles, HR Director, and SYS_ADMIN can create staff
    if (
      !hasPermission(normalizedRole, 'employee:create') &&
      normalizedRole !== 'hr' &&
      normalizedRole !== 'admin'
    ) {
      return NextResponse.json(
        { error: 'Forbidden - Only HR roles can create staff members' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.staffId || !body.firstName || !body.lastName || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields: staffId, firstName, lastName, email' },
        { status: 400 }
      )
    }

    // Check if staffId already exists
    const existing = await prisma.staffMember.findUnique({
      where: { staffId: body.staffId },
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'Staff ID already exists' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingEmail = await prisma.staffMember.findUnique({
      where: { email: body.email },
    })
    
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Validate MoFA Organizational Structure
    if (body.unit) {
      const unitConfig = getUnitConfig(body.unit)
      
      if (!unitConfig) {
        return NextResponse.json(
          { error: `Unit "${body.unit}" is not a valid MoFA unit. Please select from the approved units.` },
          { status: 400 }
        )
      }
      
      // Validate unit-directorate relationship
      if (unitConfig.directorate) {
        // Unit belongs to a directorate
        if (body.directorate && body.directorate !== unitConfig.directorate) {
          return NextResponse.json(
            { error: `Unit "${body.unit}" belongs to "${unitConfig.directorate}", not "${body.directorate}". Please correct the directorate.` },
            { status: 400 }
          )
        }
        // Auto-set directorate if not provided
        if (!body.directorate) {
          body.directorate = unitConfig.directorate
        }
      } else {
        // Unit reports to Chief Director (no directorate)
        if (body.directorate) {
          return NextResponse.json(
            { error: `Unit "${body.unit}" reports directly to Chief Director. Please leave the directorate field empty.` },
            { status: 400 }
          )
        }
      }
    }
    
    // Validate manager/supervisor assignments
    if (body.managerId) {
      const manager = await prisma.staffMember.findUnique({
        where: { staffId: body.managerId },
      })
      
      if (!manager) {
        return NextResponse.json(
          { error: `Manager with Staff ID "${body.managerId}" not found` },
          { status: 400 }
        )
      }
      
      if (!manager.active || manager.employmentStatus !== 'active') {
        return NextResponse.json(
          { error: `Manager "${body.managerId}" is not active` },
          { status: 400 }
        )
      }
    }
    
    if (body.immediateSupervisorId) {
      const supervisor = await prisma.staffMember.findUnique({
        where: { staffId: body.immediateSupervisorId },
      })
      
      if (!supervisor) {
        return NextResponse.json(
          { error: `Supervisor with Staff ID "${body.immediateSupervisorId}" not found` },
          { status: 400 }
        )
      }
      
      if (!supervisor.active || supervisor.employmentStatus !== 'active') {
        return NextResponse.json(
          { error: `Supervisor "${body.immediateSupervisorId}" is not active` },
          { status: 400 }
        )
      }
      
      // Prevent self-assignment
      if (body.immediateSupervisorId === body.staffId) {
        return NextResponse.json(
          { error: 'Staff member cannot be their own supervisor' },
          { status: 400 }
        )
      }
    }

    // Create staff member and initial leave balance in transaction
    const result = await prisma.$transaction(async (tx) => {
      const staff = await tx.staffMember.create({
      data: {
        staffId: body.staffId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone || '',
        department: body.department || '',
        position: body.position || '',
        grade: body.grade || '',
        level: body.level || '',
        rank: body.rank || null,
        step: body.step || null,
        directorate: body.directorate || null,
        division: body.division || null,
        unit: body.unit || null,
        dutyStation: body.dutyStation || 'HQ',
        photoUrl: body.photoUrl,
        active: body.active ?? true,
        employmentStatus: body.employmentStatus || 'active',
        joinDate: body.joinDate ? new Date(body.joinDate) : new Date(),
        managerId: body.managerId || null,
        immediateSupervisorId: body.immediateSupervisorId || null,
      },
      })
      
      // Create initial leave balance
      await tx.leaveBalance.create({
        data: {
          staffId: staff.staffId,
          annual: 0,
          sick: 0,
          unpaid: 0,
          specialService: 0,
          training: 0,
          study: 0,
          maternity: 0,
          paternity: 0,
          compassionate: 0,
        },
      })
      
      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'STAFF_CREATED',
          user: user.email,
          userRole: user.role,
          staffId: staff.staffId,
          details: JSON.stringify({
            createdBy: user.email,
            staffId: staff.staffId,
            firstName: staff.firstName,
            lastName: staff.lastName,
            unit: staff.unit,
            directorate: staff.directorate,
            dutyStation: staff.dutyStation,
            timestamp: new Date().toISOString(),
          }),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        },
      })
      
      return staff
    })
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating staff:', error)
    return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 })
  }
}, { 
  allowedRoles: [
    'hr', 'admin', 'HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN'
  ] 
})

