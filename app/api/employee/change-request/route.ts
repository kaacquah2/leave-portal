import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// POST create profile change request
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const body = await request.json()
    const { staffId, section, requestedChanges, currentData } = body

    // Employees can only create change requests for themselves
    if (user.role === 'employee' && staffId !== user.staffId) {
      return NextResponse.json(
        { error: 'You can only create change requests for yourself' },
        { status: 403 }
      )
    }

    // Validate required fields
    if (!staffId || !section || !requestedChanges) {
      return NextResponse.json(
        { error: 'Missing required fields: staffId, section, requestedChanges' },
        { status: 400 }
      )
    }

    // Validate section
    const validSections = ['personal', 'bank', 'tax', 'certifications', 'training']
    if (!validSections.includes(section)) {
      return NextResponse.json(
        { error: `Invalid section. Must be one of: ${validSections.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify staff member exists
    const staffMember = await prisma.staffMember.findUnique({
      where: { staffId },
      select: { id: true, active: true },
    })

    if (!staffMember) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    if (!staffMember.active) {
      return NextResponse.json(
        { error: 'Cannot create change request for inactive staff member' },
        { status: 403 }
      )
    }

    // Create change request
    const changeRequest = await prisma.profileChangeRequest.create({
      data: {
        staffId,
        section,
        requestedChanges,
        currentData: currentData || null,
        status: 'pending',
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PROFILE_CHANGE_REQUESTED',
        user: user.email || 'system',
        staffId,
        details: `Profile change request created for ${section} section`,
      },
    })

    return NextResponse.json(changeRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating change request:', error)
    return NextResponse.json(
      { error: 'Failed to create change request' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['employee', 'hr', 'admin'] })

// GET list change requests
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staffId')
    const status = searchParams.get('status')

    // Employees can only see their own requests
    if (user.role === 'employee') {
      if (!user.staffId) {
        return NextResponse.json(
          { error: 'No staff ID associated with this account' },
          { status: 400 }
        )
      }
      const requests = await prisma.profileChangeRequest.findMany({
        where: {
          staffId: user.staffId,
          ...(status && { status }),
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(requests)
    }

    // HR/Admin can see all requests
    const requests = await prisma.profileChangeRequest.findMany({
      where: {
        ...(staffId && { staffId }),
        ...(status && { status }),
      },
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching change requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch change requests' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['employee', 'hr', 'admin'] })

