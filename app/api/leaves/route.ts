import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { sendEmail, generateLeaveRequestSubmittedEmail } from '@/lib/email'
import { validateLeaveBalance, checkOverlappingLeaves } from '@/lib/leave-balance-utils'
import { validateLeaveTypeRestrictions } from '@/lib/leave-type-restrictions'


// GET all leave requests
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // HR and admin can view all leaves
    // Managers can view their team's leaves
    // Employees can only view their own leaves
    let where: any = {}
    
    if (user.role === 'employee' && user.staffId) {
      where.staffId = user.staffId
    } else if (user.role === 'manager' && user.staffId) {
      // Managers see leaves from their team members (by managerId)
      // Fallback to department if managerId is not set
      const managerStaff = await prisma.staffMember.findUnique({
        where: { staffId: user.staffId },
        select: { department: true },
      })
      if (managerStaff) {
        // First try to find team members by managerId
        const teamMembers = await prisma.staffMember.findMany({
          where: { managerId: user.staffId },
          select: { staffId: true },
        })
        
        if (teamMembers.length > 0) {
          // Filter by team members
          where.staffId = {
            in: teamMembers.map(m => m.staffId),
          }
        } else {
          // Fallback to department if no team members assigned
          where.staff = {
            department: managerStaff.department,
          }
        }
      }
    }
    // HR and admin see all (no where clause)

    const leaves = await prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        staff: {
          select: {
            id: true,
            staffId: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
          },
        },
        template: true,
      },
    })
    // Transform dates to ISO strings
    const transformed = leaves.map((leave: any) => ({
      ...leave,
      startDate: leave.startDate.toISOString(),
      endDate: leave.endDate.toISOString(),
      approvalDate: leave.approvalDate?.toISOString(),
      createdAt: leave.createdAt.toISOString(),
      updatedAt: leave.updatedAt.toISOString(),
    }))
    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Error fetching leaves:', error)
    return NextResponse.json({ error: 'Failed to fetch leaves' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

// POST create new leave request
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const body = await request.json()
    
    // Employees can only create leaves for themselves
    if (user.role === 'employee' && body.staffId !== user.staffId) {
      return NextResponse.json(
        { 
          error: 'You can only create leave requests for yourself',
          errorCode: 'PERMISSION_DENIED',
          troubleshooting: [
            'You can only submit leave requests for your own account',
            'If you need to submit a leave request for someone else, contact HR',
          ],
        },
        { status: 403 }
      )
    }
    
    // Validate required fields
    if (!body.staffId || !body.leaveType || !body.startDate || !body.endDate || !body.reason) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          errorCode: 'VALIDATION_ERROR',
          troubleshooting: [
            'Ensure all required fields are filled',
            'Check that start date, end date, and reason are provided',
            'Refresh the page and try again',
          ],
        },
        { status: 400 }
      )
    }
    
    // Verify staff member exists and is active
    const staffMember = await prisma.staffMember.findUnique({
      where: { staffId: body.staffId },
      select: { id: true, active: true, employmentStatus: true } as any,
    })
    
    if (!staffMember) {
      return NextResponse.json(
        { 
          error: 'Staff member not found',
          errorCode: 'STAFF_NOT_FOUND',
          troubleshooting: [
            'Verify the staff ID is correct',
            'Check if the staff member exists in the system',
            'Contact HR if you believe this is an error',
          ],
        },
        { status: 404 }
      )
    }
    
    if (!staffMember.active || (staffMember as any).employmentStatus !== 'active') {
      return NextResponse.json(
        { 
          error: 'Cannot create leave request for inactive staff member',
          errorCode: 'STAFF_INACTIVE',
          troubleshooting: [
            'The staff member account is not active',
            'Contact HR to verify staff member status',
          ],
        },
        { status: 403 }
      )
    }
    
    // CRITICAL FIX: Check for overlapping leave requests
    const startDate = new Date(body.startDate)
    const endDate = new Date(body.endDate)
    const overlapCheck = await checkOverlappingLeaves(body.staffId, startDate, endDate)
    
    if (overlapCheck.hasOverlap) {
      return NextResponse.json(
        { 
          error: 'Overlapping leave request exists',
          errorCode: 'OVERLAPPING_LEAVE',
          overlappingLeaves: overlapCheck.overlappingLeaves.map(l => ({
            id: l.id,
            leaveType: l.leaveType,
            startDate: l.startDate.toISOString(),
            endDate: l.endDate.toISOString(),
            status: l.status,
          })),
          troubleshooting: [
            'You already have a pending or approved leave request for these dates',
            'Please cancel the existing request or choose different dates',
            'Contact HR if you need assistance',
          ],
        },
        { status: 400 }
      )
    }
    
    // CRITICAL FIX: Validate leave type restrictions
    const typeValidation = await validateLeaveTypeRestrictions(
      body.staffId,
      body.leaveType,
      body.days
    )
    
    if (!typeValidation.valid) {
      return NextResponse.json(
        { 
          error: 'Leave type restrictions not met',
          errorCode: 'LEAVE_TYPE_RESTRICTION',
          errors: typeValidation.errors,
          warnings: typeValidation.warnings,
          troubleshooting: [
            ...typeValidation.errors,
            'Please review the leave type requirements',
            'Contact HR if you have questions',
          ],
        },
        { status: 400 }
      )
    }
    
    // CRITICAL FIX: Validate leave balance before creating request
    const balanceValidation = await validateLeaveBalance(
      body.staffId,
      body.leaveType,
      body.days
    )
    
    if (!balanceValidation.valid) {
      return NextResponse.json(
        { 
          error: balanceValidation.error || 'Insufficient leave balance',
          errorCode: 'INSUFFICIENT_BALANCE',
          currentBalance: balanceValidation.currentBalance,
          requestedDays: body.days,
          troubleshooting: [
            'You do not have sufficient leave balance for this request',
            `Available: ${balanceValidation.currentBalance} days, Requested: ${body.days} days`,
            'Contact HR if you need to request leave despite insufficient balance',
          ],
        },
        { status: 400 }
      )
    }
    
    const leave = await prisma.leaveRequest.create({
      data: {
        staffId: body.staffId,
        staffName: body.staffName,
        leaveType: body.leaveType,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        days: body.days,
        reason: body.reason,
        status: body.status || 'pending',
        templateId: body.templateId,
        approvalLevels: body.approvalLevels || null,
      },
      include: {
        staff: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
    })
    
    // Send email notification to managers/HR (non-blocking)
    const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const staffEmail = leave.staff?.email
    
    if (staffEmail && leave.status === 'pending') {
      // Find managers/HR in the same department or all HR users
      prisma.user.findMany({
        where: {
          OR: [
            { role: 'hr' },
            { role: 'admin' },
            // In production, also find managers in the same department
            // { role: 'manager', staff: { department: leave.staff?.department } }
          ],
          active: true,
        },
        include: {
          staff: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }).then((recipients) => {
        // Send email to each recipient
        recipients.forEach(async (recipient) => {
          const recipientEmail = recipient.staff?.email || recipient.email
          if (recipientEmail) {
            const recipientName = recipient.staff 
              ? `${recipient.staff.firstName} ${recipient.staff.lastName}`
              : undefined
            
            const html = generateLeaveRequestSubmittedEmail(
              leave.staffName,
              leave.leaveType,
              leave.startDate.toISOString(),
              leave.endDate.toISOString(),
              leave.days,
              leave.reason,
              leave.id,
              portalUrl,
              recipientName
            )
            
            await sendEmail({
              to: recipientEmail,
              subject: `New Leave Request from ${leave.staffName}`,
              html,
            }).catch((error) => {
              console.error('Failed to send leave request notification email:', error)
              // Don't fail the request if email fails
            })
          }
        })
      }).catch((error) => {
        console.error('Error fetching email recipients:', error)
        // Don't fail the request if email fails
      })
    }
    
    const transformed = {
      ...leave,
      startDate: leave.startDate.toISOString(),
      endDate: leave.endDate.toISOString(),
      approvalDate: leave.approvalDate?.toISOString(),
      createdAt: leave.createdAt.toISOString(),
      updatedAt: leave.updatedAt.toISOString(),
    }
    return NextResponse.json(transformed, { status: 201 })
  } catch (error) {
    console.error('Error creating leave:', error)
    return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

