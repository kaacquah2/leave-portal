/**
 * Employee Profile Update (Self-Service) API
 * 
 * Ghana Government Compliance:
 * - Data Protection Act 843: All profile changes logged
 * - Audit trail required for all employee data modifications
 * - Profile changes require HR approval (workflow)
 * 
 * Legal References:
 * - Data Protection Act, 2012 (Act 843), Section 24 (Data Access)
 * - Labour Act, 2003 (Act 651) - Employee rights
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { logDataAccess } from '@/lib/data-access-logger'
import { mapToMoFARole } from '@/lib/role-mapping'

/**
 * GET /api/employees/[staffId]/profile
 * Get employee profile (self-service view)
 * 
 * Government Compliance:
 * - Employees can only view their own profile
 * - Data access logged per Data Protection Act 843
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  const { staffId } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Get IP and user agent for data access logging
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Verify employee can only access their own profile
      if (user.staffId !== staffId) {
        const normalizedRole = mapToMoFARole(user.role)
        // Only HR and admin can view other profiles
        if (normalizedRole !== 'HR_OFFICER' && normalizedRole !== 'HR_DIRECTOR' && 
            normalizedRole !== 'SYS_ADMIN' && user.role !== 'admin' && user.role !== 'hr') {
          return NextResponse.json(
            { error: 'Forbidden - You can only view your own profile' },
            { status: 403 }
          )
        }
      }

      // Get staff member
      const staff = await prisma.staffMember.findUnique({
        where: { staffId },
        include: {
          user: {
            select: {
              email: true,
              emailVerified: true,
              lastLogin: true,
            },
          },
          changeRequests: {
            where: {
              status: { in: ['pending', 'approved'] },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      })

      if (!staff) {
        return NextResponse.json(
          { error: 'Staff member not found' },
          { status: 404 }
        )
      }

      // Log data access (Data Protection Act 843 compliance)
      await logDataAccess({
        userId: user.id,
        userRole: user.role,
        staffId: staff.staffId,
        dataType: 'staff_profile',
        action: 'view',
        ip,
        userAgent,
      })

      return NextResponse.json(staff)
    } catch (error) {
      console.error('Error fetching employee profile:', error)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }
  })(request)
}

/**
 * POST /api/employees/[staffId]/profile
 * Submit profile change request (self-service)
 * 
 * Government Compliance:
 * - All changes require HR approval (workflow)
 * - Current data snapshot stored for audit
 * - Change request logged in audit trail
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  const { staffId } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Verify employee can only update their own profile
      if (user.staffId !== staffId) {
        return NextResponse.json(
          { error: 'Forbidden - You can only update your own profile' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const { section, requestedChanges, currentData } = body

      // Validate required fields
      if (!section || !requestedChanges) {
        return NextResponse.json(
          { error: 'Missing required fields: section, requestedChanges' },
          { status: 400 }
        )
      }

      // Validate section
      const validSections = ['personal', 'bank', 'tax', 'certifications', 'training', 'emergency_contacts']
      if (!validSections.includes(section)) {
        return NextResponse.json(
          { error: `Invalid section. Must be one of: ${validSections.join(', ')}` },
          { status: 400 }
        )
      }

      // Get current staff data for snapshot
      const staff = await prisma.staffMember.findUnique({
        where: { staffId },
      })

      if (!staff) {
        return NextResponse.json(
          { error: 'Staff member not found' },
          { status: 404 }
        )
      }

      // Get IP and user agent
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Create profile change request
      const changeRequest = await prisma.profileChangeRequest.create({
        data: {
          staffId: staff.staffId,
          section,
          requestedChanges,
          currentData: currentData || {
            section,
            timestamp: new Date().toISOString(),
            staffId: staff.staffId,
          },
          status: 'pending',
        },
      })

      // Log data access (Data Protection Act 843 compliance)
      await logDataAccess({
        userId: user.id,
        userRole: user.role,
        staffId: staff.staffId,
        dataType: 'staff_profile',
        action: 'edit',
        ip,
        userAgent,
        metadata: {
          changeRequestId: changeRequest.id,
          section,
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'PROFILE_CHANGE_REQUEST',
          user: user.email,
          staffId: staff.staffId,
          details: `Employee ${staff.firstName} ${staff.lastName} (${staff.staffId}) requested profile change in ${section} section: ${requestedChanges.substring(0, 100)}`,
          ip,
        },
      })

      return NextResponse.json({
        success: true,
        changeRequest,
        message: 'Profile change request submitted successfully. HR will review and process your request.',
      })
    } catch (error) {
      console.error('Error creating profile change request:', error)
      return NextResponse.json(
        { error: 'Failed to submit profile change request' },
        { status: 500 }
      )
    }
  })(request)
}

