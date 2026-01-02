import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin } from '@/lib/auth-proxy'
import { hashPassword } from '@/lib/auth'
import { sendEmail, generateNewUserCredentialsEmail } from '@/lib/email'
import { ADMIN_ROLES } from '@/lib/role-utils'
import { calculateInitialLeaveBalances } from '@/lib/leave-accrual'
import { validatePasswordComplexity, addPasswordToHistory, setPasswordExpiry } from '@/lib/password-policy'
import { getUnitConfig, getDirectorateForUnit, MOFA_UNITS } from '@/lib/mofa-unit-mapping'

// GET all users (admin only)
export const GET = withAuth(async ({ user }: AuthContext) => {
  try {
    // Only admin can access this route
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const users = await prisma.user.findMany({
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Format response to match what the frontend expects
    const formattedUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      staffId: u.staffId,
      active: u.active,
      emailVerified: u.emailVerified,
      lastLogin: u.lastLogin,
      staff: u.staff,
    }))

    return NextResponse.json(formattedUsers)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

// POST create new user with staff member (admin only)
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
    const {
      // User account fields
      email,
      password,
      role,
      active = true,
      // Staff member fields
      staffId,
      firstName,
      lastName,
      phone,
      department,
      position,
      grade,
      level,
      rank,
      step,
      unit,
      directorate,
      division,
      dutyStation,
      joinDate,
      confirmationDate,
      managerId,
      immediateSupervisorId,
    } = body

    // Validate required fields per MoFAD requirements
    const requiredFields = {
      email,
      password,
      staffId,
      firstName,
      lastName,
      phone,
      department,
      position,
      grade,
      level,
      unit,
      dutyStation,
      joinDate,
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

    // Validate email format (government email preferred)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password complexity (Ghana Government compliance)
    const passwordValidation = validatePasswordComplexity(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { 
          error: 'Password does not meet complexity requirements',
          details: passwordValidation.errors
        },
        { status: 400 }
      )
    }

    // Validate MoFAD organizational structure
    let finalDirectorate = directorate
    if (unit) {
      const unitConfig = getUnitConfig(unit)
      
      if (!unitConfig) {
        return NextResponse.json(
          { 
            error: `Unit "${unit}" is not a valid MoFAD unit`,
            message: 'Please select from the approved 18 MoFAD units',
            validUnits: MOFA_UNITS.map(u => u.unit)
          },
          { status: 400 }
        )
      }
      
      // Validate unit-directorate relationship
      if (unitConfig.directorate) {
        // Unit belongs to a directorate
        if (finalDirectorate && finalDirectorate !== unitConfig.directorate) {
          return NextResponse.json(
            { 
              error: `Unit-directorate mismatch`,
              message: `Unit "${unit}" belongs to "${unitConfig.directorate}", not "${finalDirectorate}". Please correct the directorate.`
            },
            { status: 400 }
          )
        }
        // Auto-set directorate if not provided
        if (!finalDirectorate) {
          finalDirectorate = unitConfig.directorate
        }
      } else {
        // Unit reports to Chief Director (no directorate)
        if (finalDirectorate) {
          return NextResponse.json(
            { 
              error: `Unit reports to Chief Director`,
              message: `Unit "${unit}" reports directly to Chief Director. Please leave the directorate field empty.`
            },
            { status: 400 }
          )
        }
      }
    }

    // Validate duty station (must be one of the approved values)
    const validDutyStations = ['HQ', 'Region', 'District', 'Agency']
    if (dutyStation && !validDutyStations.includes(dutyStation)) {
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
    const gradeRegex = /^(SSS|PSS|DSS|USS|MSS|JSS)\s*[1-6]$/i
    if (grade && !gradeRegex.test(grade.trim())) {
      return NextResponse.json(
        { 
          error: 'Invalid grade format',
          message: 'Grade must be in format: SSS/PSS/DSS/USS/MSS/JSS followed by 1-6 (e.g., PSS 4, SSS 2)',
          validFormat: 'SSS/PSS/DSS/USS/MSS/JSS 1-6'
        },
        { status: 400 }
      )
    }

    // Validate level (1-12)
    const levelNum = parseInt(level)
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
    if (rank && !validRanks.includes(rank)) {
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
    if (step) {
      const stepNum = parseInt(step)
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

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Check if staff member with this staffId already exists
    const existingStaff = await prisma.staffMember.findUnique({
      where: { staffId },
    })

    if (existingStaff) {
      return NextResponse.json(
        { error: 'Staff member with this Staff ID already exists' },
        { status: 400 }
      )
    }

    // Check if staffId is already linked to a user
    const existingStaffUser = await prisma.user.findUnique({
      where: { staffId },
    })

    if (existingStaffUser) {
      return NextResponse.json(
        { error: 'Staff ID is already linked to another user account' },
        { status: 400 }
      )
    }

    // Validate manager/supervisor assignments (if provided)
    if (managerId) {
      const manager = await prisma.staffMember.findUnique({
        where: { staffId: managerId },
      })
      
      if (!manager) {
        return NextResponse.json(
          { error: `Manager with Staff ID "${managerId}" not found` },
          { status: 400 }
        )
      }
      
      if (!manager.active || manager.employmentStatus !== 'active') {
        return NextResponse.json(
          { error: `Manager "${managerId}" is not active` },
          { status: 400 }
        )
      }

      // Prevent self-assignment
      if (managerId === staffId) {
        return NextResponse.json(
          { error: 'Cannot assign self as manager' },
          { status: 400 }
        )
      }
    }
    
    if (immediateSupervisorId) {
      const supervisor = await prisma.staffMember.findUnique({
        where: { staffId: immediateSupervisorId },
      })
      
      if (!supervisor) {
        return NextResponse.json(
          { error: `Supervisor with Staff ID "${immediateSupervisorId}" not found` },
          { status: 400 }
        )
      }
      
      if (!supervisor.active || supervisor.employmentStatus !== 'active') {
        return NextResponse.json(
          { error: `Supervisor "${immediateSupervisorId}" is not active` },
          { status: 400 }
        )
      }

      // Prevent self-assignment
      if (immediateSupervisorId === staffId) {
        return NextResponse.json(
          { error: 'Cannot assign self as supervisor' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create staff member and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create staff member with all MoFAD organizational structure fields
      const staff = await tx.staffMember.create({
        data: {
          staffId,
          firstName,
          lastName,
          email: email.toLowerCase(),
          phone,
          department,
          position,
          grade: grade.trim(),
          level: level.toString(),
          rank: rank || null,
          step: step ? step.toString() : null,
          directorate: finalDirectorate || null,
          division: division || null,
          unit: unit,
          dutyStation: dutyStation || 'HQ',
          joinDate: new Date(joinDate),
          confirmationDate: confirmationDate ? new Date(confirmationDate) : null,
          managerId: managerId || null,
          immediateSupervisorId: immediateSupervisorId || null,
          active: true,
          employmentStatus: 'active',
        },
      })

      // Create user account
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: role || 'employee',
          staffId: staff.staffId,
          active,
          emailVerified: false,
        },
        include: {
          staff: true,
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
          action: 'USER_CREATED',
          user: user.email,
          staffId: staff.staffId,
          details: `Admin ${user.email} created user account for ${email} (${staffId}) with role ${role}`,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        },
      })

      return { user: newUser, staff }
    })

    // Ghana Government Compliance: Add password to history and set expiry
    await addPasswordToHistory(result.user.id, passwordHash).catch((error) => {
      console.error('Failed to add password to history:', error)
    })
    await setPasswordExpiry(result.user.id).catch((error) => {
      console.error('Failed to set password expiry:', error)
    })

    // Calculate initial leave balances based on join date (non-blocking)
    // This ensures new staff members have correct leave balances from their join date
    calculateInitialLeaveBalances(result.staff.staffId).catch((error) => {
      console.error('Failed to calculate initial leave balances:', error)
      // Don't fail the request if balance calculation fails
    })

    // Send email with credentials (non-blocking)
    let emailSent = false
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      if (!appUrl) {
        throw new Error('NEXT_PUBLIC_APP_URL or VERCEL_URL must be set in environment variables')
      }
      const loginUrl = `${appUrl}/login`
      
      const emailHtml = generateNewUserCredentialsEmail(
        result.user.email,
        password, // Send plain password (only time it's sent)
        loginUrl,
        `${result.staff.firstName} ${result.staff.lastName}`,
        result.staff.staffId,
        result.user.role
      )

      emailSent = await sendEmail({
        to: result.user.email,
        subject: 'Your HR Leave Portal Account Credentials',
        html: emailHtml,
      })
    } catch (emailError) {
      console.error('Failed to send credentials email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        staffId: result.user.staffId,
        active: result.user.active,
        staff: {
          staffId: result.staff.staffId,
          firstName: result.staff.firstName,
          lastName: result.staff.lastName,
          department: result.staff.department,
        },
      },
      emailSent,
    })
  } catch (error) {
    console.error('Error creating user:', error)
    
    // Handle Prisma unique constraint errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        const target = (error as any).meta?.target
        if (Array.isArray(target) && target.includes('email')) {
          return NextResponse.json(
            { error: 'User with this email already exists' },
            { status: 400 }
          )
        }
        if (Array.isArray(target) && target.includes('staffId')) {
          return NextResponse.json(
            { error: 'Staff ID is already in use' },
            { status: 400 }
          )
        }
      }
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

