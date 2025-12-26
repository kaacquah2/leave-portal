import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET single disciplinary action
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {

      const action = await prisma.disciplinaryAction.findUnique({
        where: { id },
        include: { staff: true },
      })

      if (!action) {
        return NextResponse.json(
          { error: 'Disciplinary action not found' },
          { status: 404 }
        )
      }

      // Check access permissions
      if (user.role === 'employee' && user.staffId !== action.staffId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }

      return NextResponse.json(action)
    } catch (error) {
      console.error('Error fetching disciplinary action:', error)
      return NextResponse.json(
        { error: 'Failed to fetch disciplinary action' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })(request)
}

// PATCH update disciplinary action
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {

      const body = await request.json()
      const { status, resolvedDate, documentUrl } = body

      const existing = await prisma.disciplinaryAction.findUnique({
        where: { id },
      })

      if (!existing) {
        return NextResponse.json(
          { error: 'Disciplinary action not found' },
          { status: 404 }
        )
      }

      const updateData: any = {}
      if (status) updateData.status = status
      if (resolvedDate) {
        updateData.resolvedDate = new Date(resolvedDate)
        updateData.resolvedBy = user.email
      }
      if (documentUrl !== undefined) updateData.documentUrl = documentUrl

      const action = await prisma.disciplinaryAction.update({
        where: { id },
        data: updateData,
        include: { staff: true },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'DISCIPLINARY_ACTION_UPDATED',
          user: user.email,
          staffId: action.staffId,
          details: `Disciplinary action updated: ${action.title}`,
        },
      })

      return NextResponse.json(action)
    } catch (error) {
      console.error('Error updating disciplinary action:', error)
      return NextResponse.json(
        { error: 'Failed to update disciplinary action' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

