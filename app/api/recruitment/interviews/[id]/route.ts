/**
 * PATCH /api/recruitment/interviews/[id]
 * DELETE /api/recruitment/interviews/[id]
 * 
 * Update or delete an interview
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext, isHR, isAdmin } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'
import { HR_ROLES, ADMIN_ROLES } from '@/lib/role-utils'

// Force static export configuration (required for static export mode)
// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

// PATCH - Update interview
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only HR and Admin can update
      if (!isHR(user) && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'Forbidden - HR or Admin access required' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const {
        scheduledDate,
        interviewType,
        interviewers,
        location,
        notes,
        rating,
        status,
      } = body

      const updateData: any = {}

      if (scheduledDate !== undefined) updateData.scheduledDate = new Date(scheduledDate)
      if (interviewType !== undefined) updateData.interviewType = interviewType
      if (interviewers !== undefined) updateData.interviewers = interviewers
      if (location !== undefined) updateData.location = location
      if (notes !== undefined) updateData.notes = notes
      if (rating !== undefined) updateData.rating = rating
      if (status !== undefined) updateData.status = status

      const interview = await prisma.interview.update({
        where: { id },
        data: updateData,
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              jobPosting: {
                select: {
                  id: true,
                  title: true,
                  department: true,
                  position: true,
                },
              },
            },
          },
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'INTERVIEW_UPDATED',
          user: user.email,
          userRole: user.role,
          details: `Interview updated: ${id}`,
          metadata: {
            interviewId: id,
            changes: body,
          },
        },
      })

      return NextResponse.json({
        success: true,
        data: interview,
      })
    } catch (error: any) {
      console.error('Error updating interview:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update interview' },
        { status: 500 }
      )
    }
  }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES] })(request)
}

// DELETE - Delete interview
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only HR and Admin can delete
      if (!isHR(user) && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'Forbidden - HR or Admin access required' },
          { status: 403 }
        )
      }

      const interview = await prisma.interview.findUnique({
        where: { id },
      })

      if (!interview) {
        return NextResponse.json(
          { error: 'Interview not found' },
          { status: 404 }
        )
      }

      await prisma.interview.delete({
        where: { id },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'INTERVIEW_DELETED',
          user: user.email,
          userRole: user.role,
          details: `Interview deleted: ${id}`,
          metadata: {
            interviewId: id,
          },
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Interview deleted successfully',
      })
    } catch (error: any) {
      console.error('Error deleting interview:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to delete interview' },
        { status: 500 }
      )
    }
  }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES] })(request)
}

