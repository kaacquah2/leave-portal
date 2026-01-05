import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { READ_ONLY_ROLES } from '@/lib/roles'
import { calculateLeaveDays } from '@/lib/leave-calculation-utils'
import { validateLeaveBalance, checkOverlappingLeaves } from '@/lib/leave-balance-utils'
import { getNextApprovers } from '@/lib/approval-workflow'
import { 
  determineCivilServiceApprovalWorkflow, 
  getStaffOrganizationalInfo, 
  getNextCivilServiceApprovers
} from '@/lib/ghana-civil-service-approval-workflow'
import { createApprovalSteps } from '@/lib/ghana-civil-service-approval-workflow-db'
import { logLeaveSubmission } from '@/lib/audit-logger'
import { notifyLeaveSubmission } from '@/lib/notification-service'
import { getUserRBACContext, canCreateLeaveRequest } from '@/lib/roles'
import { parsePaginationParams, createPaginatedResponse, validatePaginationParams } from '@/lib/pagination-utils'

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


// GET all leave requests
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get('staffId')
    const status = searchParams.get('status')
    const leaveType = searchParams.get('leaveType')
    
    // Parse pagination parameters
    const paginationParams = parsePaginationParams(searchParams)
    const validation = validatePaginationParams(paginationParams)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid pagination parameters' },
        { status: 400 }
      )
    }
    
    // Build where clause based on user role with proper data scoping
    // SECURITY FIX: This ensures managers only see their team's leaves
    const { buildLeaveWhereClause } = await import('@/lib/data-scoping-utils')
    const { where: scopedWhere, hasAccess } = await buildLeaveWhereClause(user)
    
    if (!hasAccess) {
      return NextResponse.json(createPaginatedResponse([], 0, paginationParams))
    }
    
    let where: any = { ...scopedWhere }
    
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

    // PERFORMANCE FIX: Add pagination and reduce overfetching
    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        select: {
          id: true,
          staffId: true,
          staffName: true,
          leaveType: true,
          startDate: true,
          endDate: true,
          days: true,
          reason: true,
          status: true,
          approvedBy: true,
          approvalDate: true,
          createdAt: true,
          updatedAt: true,
          staff: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              department: true,
              position: true,
              // Removed email - not needed for list view
            },
          },
          // Removed template - not needed for list view, only ID if needed
          templateId: true,
        },
        orderBy: { createdAt: 'desc' },
        take: paginationParams.limit,
        skip: paginationParams.offset,
      }),
      prisma.leaveRequest.count({ where }),
    ])
    
    const response = NextResponse.json(createPaginatedResponse(leaves, total, paginationParams))
    
    // Add cache headers for GET requests (5 minutes)
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600')
    
    return response
  } catch (error) {
    console.error('Error fetching leaves:', error)
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 })
  }
}, { allowedRoles: READ_ONLY_ROLES })

// POST create leave request
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const body = await request.json()
    
    // Check if this is a draft (draft has relaxed validation)
    const isDraft = body.status === 'draft'
    
    // Validate required fields (Ghana Civil Service Compliance) - relaxed for drafts
    if (!isDraft) {
      if (!body.staffId || !body.leaveType || !body.startDate || !body.endDate || !body.reason) {
        return NextResponse.json(
          { error: 'Missing required fields: staffId, leaveType, startDate, endDate, reason' },
          { status: 400 }
        )
      }

      // Validate Ghana Civil Service compliance fields (not required for drafts)
      if (!body.declarationAccepted) {
        return NextResponse.json(
          { error: 'Missing required Ghana Civil Service compliance field: declarationAccepted' },
          { status: 400 }
        )
      }

      // Validate reason length (minimum 20 characters) - not required for drafts
      if (body.reason.trim().length < 20) {
        return NextResponse.json(
          { error: 'Reason for leave must be at least 20 characters long' },
          { status: 400 }
        )
      }
    } else {
      // For drafts, only staffId and leaveType are required
      if (!body.staffId || !body.leaveType) {
        return NextResponse.json(
          { error: 'Missing required fields for draft: staffId, leaveType' },
          { status: 400 }
        )
      }
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

    // Calculate days (excluding holidays) - handle drafts with missing dates
    let startDate: Date
    let endDate: Date
    let days: number
    
    if (isDraft && (!body.startDate || !body.endDate)) {
      // For drafts, use default dates if not provided
      const today = new Date()
      startDate = body.startDate ? new Date(body.startDate) : today
      endDate = body.endDate ? new Date(body.endDate) : today
      days = body.days || 1
    } else {
      startDate = new Date(body.startDate)
      endDate = new Date(body.endDate)
      
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
      days = body.days || daysCalculation.workingDays
    }

    // Get staff organizational info for MoFA workflow (skip approval workflow for drafts)
    let approvalLevels: any[] = []
    if (!isDraft) {
      const staffOrgInfo = await getStaffOrganizationalInfo(body.staffId)
      if (!staffOrgInfo) {
        return NextResponse.json(
          { error: 'Staff organizational information not found' },
          { status: 404 }
        )
      }

      // Determine Ghana Civil Service approval workflow based on organizational structure
      approvalLevels = await determineCivilServiceApprovalWorkflow(
        staffOrgInfo,
        body.leaveType,
        days
      )
    }

    // Validate leave balance (for paid leave types) - skip for drafts
    if (!isDraft && body.leaveType !== 'Unpaid') {
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

    // CRITICAL FIX: Check for overlapping leave requests (skip for drafts)
    if (!isDraft && body.startDate && body.endDate) {
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
        reason: body.reason || (isDraft ? 'Draft leave request' : ''),
        status: isDraft ? 'draft' : 'pending',
        templateId: body.templateId,
        approvalLevels: approvalLevels.length > 0 ? (approvalLevels as any) : undefined, // Legacy support
        // Ghana Civil Service Compliance fields (optional for drafts)
        officerTakingOver: body.officerTakingOver || (isDraft ? undefined : null),
        handoverNotes: body.handoverNotes || (isDraft ? undefined : null),
        declarationAccepted: isDraft ? false : (body.declarationAccepted || false),
        // PSC/OHCS Compliance: External clearance for special leave types
        requiresExternalClearance: body.requiresExternalClearance || false,
        externalClearanceStatus: body.externalClearanceStatus || null,
        pscReferenceNumber: body.pscReferenceNumber || null,
        ohcsReferenceNumber: body.ohcsReferenceNumber || null,
        // HR Validation (will be set when HR Officer validates)
        hrValidated: false,
        hrValidatedBy: null,
        hrValidatedAt: null,
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

    // Create notifications for approvers using Ghana Civil Service notification service (skip for drafts)
    if (!isDraft && approvalLevels && approvalLevels.length > 0) {
      const nextApprovers = getNextCivilServiceApprovers(approvalLevels)
      
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
}, { allowedRoles: READ_ONLY_ROLES })

