import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { mapToMoFARole, hasPermission } from '@/lib/roles'
import { MOFA_UNITS, getUnitConfig, getDirectorateForUnit } from '@/lib/mofa-unit-mapping'
import { calculateInitialLeaveBalances } from '@/lib/leave-accrual'
import { buildStaffWhereClause } from '@/lib/data-scoping-utils'
import { parsePaginationParams, createPaginatedResponse, validatePaginationParams } from '@/lib/pagination-utils'

// Force static export configuration (required for static export mode)
// GET all staff members

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Parse pagination parameters with defaults
    const paginationParams = parsePaginationParams(searchParams)
    const validation = validatePaginationParams(paginationParams)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid pagination parameters' },
        { status: 400 }
      )
    }
    
    // Build where clause based on user role with proper data scoping
    const { where, hasAccess } = await buildStaffWhereClause({
      id: user.id,
      role: user.role,
      staffId: user.staffId,
    })
    
    if (!hasAccess) {
      return NextResponse.json(createPaginatedResponse([], 0, paginationParams))
    }

    // PERFORMANCE FIX: Add pagination to reduce payload size
    const [staff, total] = await Promise.all([
      prisma.staffMember.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: paginationParams.limit,
        skip: paginationParams.offset,
      }),
      prisma.staffMember.count({ where }),
    ])
    
    const response = NextResponse.json(createPaginatedResponse(staff, total, paginationParams))
    
    // Add cache headers for GET requests (5 minutes)
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600')
    
    return response
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }
}, { 
  allowedRoles: [
    'hr', 'hr_assistant', 'admin', 'employee', 'manager', 'deputy_director',
    'EMPLOYEE', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR',
    'REGIONAL_MANAGER', 'HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR',
    'AUDITOR', 'SYSTEM_ADMIN', 'SYS_ADMIN'
  ] 
})

// POST create staff member
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Normalize role to MoFA role code
    const normalizedRole = mapToMoFARole(user.role)
    
    // Ghana Government Compliance: Only HR roles can create staff
    // SYSTEM_ADMIN can create for system setup, but cannot edit/delete (segregation of duties)
    const { isHR } = await import('@/lib/auth-proxy')
    
    // Allow SYSTEM_ADMIN to create staff for system setup only
    const canCreate = hasPermission(normalizedRole, 'employee:create') || 
                      isHR(user) ||
                      normalizedRole === 'SYSTEM_ADMIN' ||
                      normalizedRole === 'SYS_ADMIN'
    
    if (!canCreate) {
      return NextResponse.json(
        { error: 'Forbidden - Only HR roles and system administrators can create staff members' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate required fields per MoFAD requirements
    const requiredFields = {
      staffId: body.staffId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      department: body.department,
      position: body.position,
      grade: body.grade,
      level: body.level,
      unit: body.unit,
      dutyStation: body.dutyStation,
      joinDate: body.joinDate,
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value || (typeof value === 'string' && value.trim() === ''))
      .map(([key]) => key)

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missingFields,
          message: `The following required fields are missing: ${missingFields.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
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
          { 
            error: `Unit "${body.unit}" is not a valid MoFAD unit`,
            message: 'Please select from the approved 18 MoFAD units',
            validUnits: MOFA_UNITS.map(u => u.unit)
          },
          { status: 400 }
        )
      }
      
      // Validate unit-directorate relationship
      if (unitConfig.directorate) {
        // Unit belongs to a directorate
        if (body.directorate && body.directorate !== unitConfig.directorate) {
          return NextResponse.json(
            { 
              error: `Unit-directorate mismatch`,
              message: `Unit "${body.unit}" belongs to "${unitConfig.directorate}", not "${body.directorate}". Please correct the directorate.`
            },
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
            { 
              error: `Unit reports to Chief Director`,
              message: `Unit "${body.unit}" reports directly to Chief Director. Please leave the directorate field empty.`
            },
            { status: 400 }
          )
        }
      }
    }

    // Validate duty station (must be one of the approved values)
    const validDutyStations = ['HQ', 'Region', 'District', 'Agency']
    if (body.dutyStation && !validDutyStations.includes(body.dutyStation)) {
      return NextResponse.json(
        { 
          error: `Invalid duty station`,
          message: `Duty station must be one of: ${validDutyStations.join(', ')}`,
          validDutyStations
        },
        { status: 400 }
      )
    }

    // Validate government grade format (SSS, PSS, DSS, USS, MSS, JSS 1-6)
    if (body.grade) {
      const gradeRegex = /^(SSS|PSS|DSS|USS|MSS|JSS)\s*[1-6]$/i
      if (!gradeRegex.test(body.grade.trim())) {
        return NextResponse.json(
          { 
            error: 'Invalid grade format',
            message: 'Grade must be in format: SSS/PSS/DSS/USS/MSS/JSS followed by 1-6 (e.g., PSS 4, SSS 2)',
            validFormat: 'SSS/PSS/DSS/USS/MSS/JSS 1-6'
          },
          { status: 400 }
        )
      }
    }

    // Validate level (1-12)
    if (body.level) {
      const levelNum = parseInt(body.level)
      if (isNaN(levelNum) || levelNum < 1 || levelNum > 12) {
        return NextResponse.json(
          { 
            error: 'Invalid level',
            message: 'Level must be a number between 1 and 12',
            validRange: '1-12'
          },
          { status: 400 }
        )
      }
    }

    // Validate rank if provided (optional but should be valid)
    const validRanks = [
      'Chief Director',
      'Deputy Chief Director',
      'Director',
      'Deputy Director',
      'Principal Officer',
      'Senior Officer',
      'Officer',
      'Assistant Officer',
      'Senior Staff',
      'Staff',
      'Junior Staff'
    ]
    if (body.rank && !validRanks.includes(body.rank)) {
      return NextResponse.json(
        { 
          error: 'Invalid rank',
          message: 'Rank must be one of the approved government ranks',
          validRanks
        },
        { status: 400 }
      )
    }

    // Validate step if provided (1-15)
    if (body.step) {
      const stepNum = parseInt(body.step)
      if (isNaN(stepNum) || stepNum < 1 || stepNum > 15) {
        return NextResponse.json(
          { 
            error: 'Invalid step',
            message: 'Step must be a number between 1 and 15',
            validRange: '1-15'
          },
          { status: 400 }
        )
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
          { error: 'Cannot assign self as supervisor' },
          { status: 400 }
        )
      }
    }

    // Validate manager self-assignment
    if (body.managerId && body.managerId === body.staffId) {
      return NextResponse.json(
        { error: 'Cannot assign self as manager' },
        { status: 400 }
      )
    }

    // Create staff member and initial leave balance in transaction
    const result = await prisma.$transaction(async (tx) => {
      const staff = await tx.staffMember.create({
      data: {
        staffId: body.staffId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email.toLowerCase(),
        phone: body.phone,
        department: body.department,
        position: body.position,
        grade: body.grade.trim(),
        level: body.level.toString(),
        rank: body.rank || null,
        step: body.step ? body.step.toString() : null,
        directorate: body.directorate || null,
        division: body.division || null,
        unit: body.unit,
        dutyStation: body.dutyStation,
        photoUrl: body.photoUrl || null,
        active: body.active ?? true,
        employmentStatus: body.employmentStatus || 'active',
        joinDate: body.joinDate ? new Date(body.joinDate) : new Date(),
        confirmationDate: body.confirmationDate ? new Date(body.confirmationDate) : null,
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
    
    // Calculate initial leave balances based on join date (non-blocking)
    // This ensures new staff members have correct leave balances from their join date
    calculateInitialLeaveBalances(result.staffId).catch((error) => {
      console.error('Failed to calculate initial leave balances:', error)
      // Don't fail the request if balance calculation fails
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

