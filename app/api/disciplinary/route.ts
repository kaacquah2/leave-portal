import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET all disciplinary actions
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {

    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get('staffId')
    const actionType = searchParams.get('actionType')
    const status = searchParams.get('status')

    const where: any = {}

    // Role-based filtering
    if (user.role === 'employee' && user.staffId) {
      where.staffId = user.staffId
    } else if (staffId) {
      where.staffId = staffId
    }

    if (actionType) where.actionType = actionType
    if (status) where.status = status

    const actions = await prisma.disciplinaryAction.findMany({
      where,
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
      orderBy: { issuedDate: 'desc' },
    })

    return NextResponse.json(actions)
  } catch (error) {
    console.error('Error fetching disciplinary actions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch disciplinary actions' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

// POST create disciplinary action
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {

    const body = await request.json()
    const { staffId, actionType, severity, title, description, incidentDate, documentUrl } = body

    if (!staffId || !actionType || !severity || !title || !description || !incidentDate) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    const action = await prisma.disciplinaryAction.create({
      data: {
        staffId,
        actionType,
        severity,
        title,
        description,
        incidentDate: new Date(incidentDate),
        issuedBy: user.email,
        documentUrl: documentUrl || null,
      },
      include: { staff: true },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        staffId,
        type: 'disciplinary_action',
        title: `Disciplinary Action: ${title}`,
        message: `A ${actionType} has been issued. Please review the details.`,
        link: `/disciplinary/${action.id}`,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DISCIPLINARY_ACTION_CREATED',
        user: user.email,
        staffId,
        details: `Disciplinary action created: ${title} (${actionType})`,
      },
    })

    return NextResponse.json(action, { status: 201 })
  } catch (error) {
    console.error('Error creating disciplinary action:', error)
    return NextResponse.json(
      { error: 'Failed to create disciplinary action' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin', 'manager'] })

