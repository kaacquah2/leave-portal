/**
 * GET /api/disciplinary
 * POST /api/disciplinary
 * 
 * List and create disciplinary actions
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext, isHR, isAdmin } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'

// GET - List disciplinary actions
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const staffId = searchParams.get('staffId')
      const status = searchParams.get('status')
      const actionType = searchParams.get('actionType')
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')

      const where: any = {}

      // Staff filter - employees can only see their own
      if (staffId) {
        where.staffId = staffId
      } else if (!isHR(user) && !isAdmin(user)) {
        // Non-HR users can only see their own disciplinary actions
        const staff = await prisma.staffMember.findUnique({
          where: { staffId: user.staffId || '' },
        })
        if (staff) {
          where.staffId = staff.staffId
        } else {
          return NextResponse.json({ data: [], total: 0 })
        }
      }

      if (status && status !== 'all') {
        where.status = status
      }

      if (actionType && actionType !== 'all') {
        where.actionType = actionType
      }

      const [data, total] = await Promise.all([
        prisma.disciplinaryAction.findMany({
          where,
          include: {
            staff: {
              select: {
                staffId: true,
                firstName: true,
                lastName: true,
                email: true,
                department: true,
                position: true,
              },
            },
          },
          orderBy: { issuedDate: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.disciplinaryAction.count({ where }),
      ])

      return NextResponse.json({
        data,
        total,
      })
    } catch (error: any) {
      console.error('Error fetching disciplinary actions:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch disciplinary actions' },
        { status: 500 }
      )
    }
  })(request)
}

// POST - Create disciplinary action
export async function POST(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only HR and Admin can create disciplinary actions
      if (!isHR(user) && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'Forbidden - HR or Admin access required' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const {
        staffId,
        actionType,
        severity,
        title,
        description,
        incidentDate,
        documentUrl,
      } = body

      if (!staffId || !actionType || !severity || !title || !description || !incidentDate) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        )
      }

      // Validate staff exists
      const staff = await prisma.staffMember.findUnique({
        where: { staffId },
      })

      if (!staff) {
        return NextResponse.json(
          { error: 'Staff member not found' },
          { status: 404 }
        )
      }

      // Get issuer name
      const issuer = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          staff: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      const issuedBy = issuer?.staff
        ? `${issuer.staff.firstName} ${issuer.staff.lastName}`
        : user.email

      const disciplinaryAction = await prisma.disciplinaryAction.create({
        data: {
          staffId,
          actionType,
          severity,
          title,
          description,
          incidentDate: new Date(incidentDate),
          issuedBy,
          documentUrl: documentUrl || null,
        },
        include: {
          staff: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              email: true,
              department: true,
              position: true,
            },
          },
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'DISCIPLINARY_ACTION_CREATED',
          user: user.email,
          userRole: user.role,
          staffId,
          details: `Disciplinary action created: ${actionType} - ${title}`,
          metadata: {
            disciplinaryActionId: disciplinaryAction.id,
            actionType,
            severity,
          },
        },
      })

      return NextResponse.json({
        success: true,
        data: disciplinaryAction,
      })
    } catch (error: any) {
      console.error('Error creating disciplinary action:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create disciplinary action' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['HR_OFFICER', 'HR_DIRECTOR', 'SYS_ADMIN', 'hr', 'hr_officer', 'hr_director', 'admin'] })(request)
}

