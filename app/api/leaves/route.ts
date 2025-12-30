import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { calculateLeaveDays } from '@/lib/leave-calculation-utils'
import { validateLeaveBalance, checkOverlappingLeaves } from '@/lib/leave-balance-utils'
import { getNextApprovers } from '@/lib/approval-workflow'
import { 
  determineMoFAApprovalWorkflow, 
  getStaffOrganizationalInfo, 
  getNextMoFAApprovers,
  createApprovalSteps 
} from '@/lib/mofa-approval-workflow'
import { logLeaveSubmission } from '@/lib/audit-logger'
import { notifyLeaveSubmission } from '@/lib/notification-service'
import { getUserRBACContext, canCreateLeaveRequest } from '@/lib/mofa-rbac-middleware'

// GET all leave requests
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get('staffId')
    const status = searchParams.get('status')
    const leaveType = searchParams.get('leaveType')
    
    // Build where clause based on user role
    let where: any = {}
    
    // Employees can only view their own leaves
    if (user.role === 'employee' && user.staffId) {
      where.staffId = user.staffId
    } else if ((user.role === 'manager' || user.role === 'deputy_director') && user.staffId) {
      // Managers and deputy directors see their team/directorate leaves
      // In a full implementation, this would filter by managerId or department
      // For now, they see all (can be enhanced later)
    }
    // HR, HR Assistant, and admin see all (no where clause)
    
    // Apply filters from query parameters
    if (staffId) {
      where.staffId = staffId
    }
    if (status) {
      where.status = status
    }
    if (leaveType) {
      where.leaveType = leaveType
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
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
        template: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    
    return NextResponse.json(leaves)
  } catch (error) {
    console.error('Error fetching leaves:', error)
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 })
  }
}, { allowedRoles: ['HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'SYS_ADMIN', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER', 'EMPLOYEE', 'AUDITOR', 'hr', 'hr_assistant', 'admin', 'employee', 'manager', 'deputy_director', 'hr_officer', 'hr_director', 'chief_director', 'supervisor', 'unit_head', 'division_head', 'directorate_head', 'regional_manager', 'auditor', 'internal_auditor'] })

// POST create leave request
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const body = await request.json()
    
    // Validate required fields (MoFA Compliance)
    if (!body.staffId || !body.leaveType || !body.startDate || !body.endDate || !body.reason) {
      return NextResponse.json(
        { error: 'Missing required fields: staffId, leaveType, startDate, endDate, reason' },
        { status: 400 }
      )
    }

    // Validate MoFA compliance fields
    if (!body.officerTakingOver || !body.handoverNotes || !body.declarationAccepted) {
      return NextResponse.json(
        { error: 'Missing required MoFA compliance fields: officerTakingOver, handoverNotes, declarationAccepted' },
        { status: 400 }
      )
    }

    // Validate reason length (minimum 20 characters)
    if (body.reason.trim().length < 20) {
      return NextResponse.json(
        { error: 'Reason for leave must be at least 20 characters long' },
        { status: 400 }
      )
    }

    // RBAC: Check if user can create leave request for this staff member
    const rbacContext = await getUserRBACContext(user)
    if (!rbacContext) {
      return NextResponse.json(
        { error: 'Unable to verify user permissions' },
        { status: 500 }
      )
    }

    const createPermission = await canCreateLeaveRequest(rbacContext, body.staffId)
    if (!createPermission.allowed) {
      return NextResponse.json(
        { 
          error: createPermission.reason || 'Permission denied',
          errorCode: createPermission.errorCode 
        },
        { status: 403 }
      )
    }

    // Get staff member to get name
    const staff = await prisma.staffMember.findUnique({
      where: { staffId: body.staffId },
      select: {
        firstName: true,
        lastName: true,
        department: true,
        grade: true,
      },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Calculate days (excluding holidays)
    const startDate = new Date(body.startDate)
    const endDate = new Date(body.endDate)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      )
    }

    const daysCalculation = await calculateLeaveDays(startDate, endDate, true)
    const days = body.days || daysCalculation.workingDays

    // Get staff organizational info for MoFA workflow
    const staffOrgInfo = await getStaffOrganizationalInfo(body.staffId)
    if (!staffOrgInfo) {
      return NextResponse.json(
        { error: 'Staff organizational information not found' },
        { status: 404 }
      )
    }

    // Determine MoFA approval workflow based on organizational structure
    const approvalLevels = await determineMoFAApprovalWorkflow(
      staffOrgInfo,
      body.leaveType,
      days
    )

    // Validate leave balance (for paid leave types)
    if (body.leaveType !== 'Unpaid') {
      const balanceValidation = await validateLeaveBalance(
        body.staffId,
        body.leaveType,
        days
      )
      
      if (!balanceValidation.valid) {
        return NextResponse.json(
          {
            error: balanceValidation.error || 'Insufficient leave balance',
            currentBalance: balanceValidation.currentBalance,
            requestedDays: days,
          },
          { status: 400 }
        )
      }
    }

    // CRITICAL FIX: Check for overlapping leave requests
    const overlapCheck = await checkOverlappingLeaves(
      body.staffId,
      startDate,
      endDate
    )
    
    if (overlapCheck.hasOverlap) {
      return NextResponse.json(
        {
          error: 'Overlapping leave request exists. You already have a pending or approved leave request for these dates.',
          errorCode: 'OVERLAPPING_LEAVE',
          overlappingLeaves: overlapCheck.overlappingLeaves.map(leave => ({
            id: leave.id,
            leaveType: leave.leaveType,
            startDate: leave.startDate,
            endDate: leave.endDate,
            days: leave.days,
            status: leave.status,
          })),
          troubleshooting: [
            'You cannot have multiple leave requests with overlapping dates',
            'Please cancel or modify your existing leave request first',
            'Or choose different dates that do not overlap',
            'Contact HR if you need assistance',
          ],
        },
        { status: 400 }
      )
    }

    // Flag unpaid leave for payroll impact
    const payrollImpactFlag = body.leaveType === 'Unpaid'

    // Create leave request
    const leave = await prisma.leaveRequest.create({
      data: {
        staffId: body.staffId,
        staffName: `${staff.firstName} ${staff.lastName}`,
        leaveType: body.leaveType,
        startDate,
        endDate,
        days,
        reason: body.reason,
        status: 'pending',
        templateId: body.templateId,
        approvalLevels: approvalLevels.length > 0 ? (approvalLevels as any) : undefined, // Legacy support
        // MoFA Compliance fields
        officerTakingOver: body.officerTakingOver,
        handoverNotes: body.handoverNotes,
        declarationAccepted: body.declarationAccepted,
        payrollImpactFlag,
        locked: false, // Will be locked after final approval
      },
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
        template: true,
      },
    })

    // Create ApprovalSteps in database for persistent tracking
    if (approvalLevels.length > 0) {
      try {
        await createApprovalSteps(leave.id, approvalLevels)
      } catch (error) {
        console.error('[Leave API] Error creating approval steps:', error)
        // Continue - fallback to JSON approvalLevels
      }
    }

    // Create audit log for submission
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    await logLeaveSubmission({
      leaveRequestId: leave.id,
      staffId: body.staffId,
      staffName: `${staff.firstName} ${staff.lastName}`,
      leaveType: body.leaveType,
      days,
      userId: user.id,
      userRole: user.role,
      ip,
      userAgent,
    })

    // Create notifications for approvers using MoFA notification service
    if (approvalLevels && approvalLevels.length > 0) {
      const nextApprovers = getNextMoFAApprovers(approvalLevels)
      
      // Find users with the approver roles
      const approverUserIds: string[] = []
      for (const approver of nextApprovers) {
        const approverUsers = await prisma.user.findMany({
          where: {
            role: approver.approverRole,
            active: true,
          },
          select: { id: true, staffId: true },
        })
        approverUserIds.push(...approverUsers.map(u => u.id))
      }

      // Send notifications
      if (approverUserIds.length > 0) {
        await notifyLeaveSubmission({
          leaveRequestId: leave.id,
          staffId: body.staffId,
          staffName: `${staff.firstName} ${staff.lastName}`,
          leaveType: body.leaveType,
          days,
          approverIds: approverUserIds,
        })
      }
    }

    return NextResponse.json(leave, { status: 201 })
  } catch (error) {
    console.error('Error creating leave request:', error)
    return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 })
  }
}, { allowedRoles: ['HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'SYS_ADMIN', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER', 'EMPLOYEE', 'hr', 'hr_assistant', 'admin', 'employee', 'manager', 'deputy_director', 'hr_officer', 'hr_director', 'chief_director', 'supervisor', 'unit_head', 'division_head', 'directorate_head', 'regional_manager'] })

