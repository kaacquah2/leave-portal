import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { calculateLeaveDays } from '@/lib/leave-calculation-utils'
import { validateLeaveBalance } from '@/lib/leave-balance-utils'
import { getNextApprovers } from '@/lib/approval-workflow'

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
}, { allowedRoles: ['hr', 'hr_assistant', 'admin', 'employee', 'manager', 'deputy_director'] })

// POST create leave request
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.staffId || !body.leaveType || !body.startDate || !body.endDate || !body.reason) {
      return NextResponse.json(
        { error: 'Missing required fields: staffId, leaveType, startDate, endDate, reason' },
        { status: 400 }
      )
    }

    // Employees can only create leaves for themselves
    if (user.role === 'employee' && body.staffId !== user.staffId) {
      return NextResponse.json(
        { error: 'Forbidden - You can only create leave requests for yourself' },
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

    // Get leave policy to determine approval levels
    const policy = await prisma.leavePolicy.findFirst({
      where: {
        leaveType: body.leaveType,
        active: true,
      },
    })

    // Build approval levels based on policy
    let approvalLevels: any = undefined
    if (policy && policy.approvalLevels > 0) {
      approvalLevels = Array.from({ length: policy.approvalLevels }, (_, i) => ({
        level: i + 1,
        approverRole: i === 0 ? 'manager' : 'hr',
        status: 'pending',
      }))
    }

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
        approvalLevels: approvalLevels ? approvalLevels : undefined,
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

    // Create notification for approvers
    if (approvalLevels && approvalLevels.length > 0) {
      const nextApprovers = getNextApprovers(approvalLevels)
      // In a full implementation, create notifications for approvers
      // For now, we'll skip this to keep it simple
    }

    return NextResponse.json(leave, { status: 201 })
  } catch (error) {
    console.error('Error creating leave request:', error)
    return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'hr_assistant', 'admin', 'employee', 'manager', 'deputy_director'] })

