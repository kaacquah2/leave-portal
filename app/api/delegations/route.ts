/**
 * GET /api/delegations
 * POST /api/delegations
 * 
 * List and create approval delegations
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, type UserRole } from '@/lib/roles'

// GET all delegations for the current user

// Force static export configuration (required for static export mode)

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Get current user's staff record
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { staff: true },
      })

      if (!currentUser || !currentUser.staff) {
        return NextResponse.json(
          { error: 'User staff record not found' },
          { status: 404 }
        )
      }

      const delegatorId = currentUser.staff.staffId

      // Fetch delegations where user is delegator or delegatee
      const delegations = await prisma.approvalDelegation.findMany({
        where: {
          OR: [
            { delegatorId },
            { delegateeId: delegatorId },
          ],
        },
        include: {
          delegator: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          delegatee: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return NextResponse.json(delegations)
    } catch (error: any) {
      console.error('Error fetching delegations:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch delegations' },
        { status: 500 }
      )
    }
  })(request)
}

// POST create new delegation
export async function POST(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Check permission
      if (!hasPermission(user.role as UserRole, 'leave:approve:team') && 
          !hasPermission(user.role as UserRole, 'leave:approve:all')) {
        return NextResponse.json(
          { error: 'You do not have permission to create delegations' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const { delegateeId, startDate, endDate, leaveTypes, notes } = body

      if (!delegateeId || !startDate || !endDate) {
        return NextResponse.json(
          { 
            error: 'delegateeId, startDate, and endDate are required',
            errorCode: 'MISSING_FIELDS',
          },
          { status: 400 }
        )
      }

      // Get current user's staff record
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { staff: true },
      })

      if (!currentUser || !currentUser.staff) {
        return NextResponse.json(
          { error: 'User staff record not found' },
          { status: 404 }
        )
      }

      const delegatorId = currentUser.staff.staffId

      // Verify delegatee exists
      const delegatee = await prisma.staffMember.findUnique({
        where: { staffId: delegateeId },
      })

      if (!delegatee) {
        return NextResponse.json(
          { error: 'Delegatee not found' },
          { status: 404 }
        )
      }

      // Prevent self-delegation
      if (delegatorId === delegateeId) {
        return NextResponse.json(
          { 
            error: 'Cannot delegate to yourself',
            errorCode: 'SELF_DELEGATION_NOT_ALLOWED',
          },
          { status: 400 }
        )
      }

      // Validate dates
      const start = new Date(startDate)
      const end = new Date(endDate)
      const now = new Date()

      if (start >= end) {
        return NextResponse.json(
          { error: 'Start date must be before end date' },
          { status: 400 }
        )
      }

      if (end < now) {
        return NextResponse.json(
          { error: 'End date must be in the future' },
          { status: 400 }
        )
      }

      // Check for overlapping active delegations
      const overlapping = await prisma.approvalDelegation.findFirst({
        where: {
          delegatorId,
          delegateeId,
          status: 'active',
          OR: [
            {
              startDate: { lte: end },
              endDate: { gte: start },
            },
          ],
        },
      })

      if (overlapping) {
        return NextResponse.json(
          { 
            error: 'An active delegation already exists for this period',
            errorCode: 'OVERLAPPING_DELEGATION',
          },
          { status: 400 }
        )
      }

      // Create delegation
      const delegation = await prisma.approvalDelegation.create({
        data: {
          delegatorId,
          delegateeId,
          startDate: start,
          endDate: end,
          leaveTypes: leaveTypes || [],
          notes: notes || null,
          status: 'active',
        },
        include: {
          delegator: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          delegatee: {
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
          action: 'APPROVAL_DELEGATION_CREATED',
          user: user.email,
          userRole: user.role,
          details: JSON.stringify({
            delegatorId,
            delegateeId,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            leaveTypes,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        delegation,
        message: 'Approval delegation created successfully',
      }, { status: 201 })
    } catch (error: any) {
      console.error('Error creating approval delegation:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create approval delegation' },
        { status: 500 }
      )
    }
  })(request)
}

