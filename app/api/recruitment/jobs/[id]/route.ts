/**
 * GET /api/recruitment/jobs/[id]
 * PATCH /api/recruitment/jobs/[id]
 * DELETE /api/recruitment/jobs/[id]
 * 
 * Get, update, or delete a job posting
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext, isHR, isAdmin } from '@/lib/auth'
import { HR_ROLES, ADMIN_ROLES } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

// Force static export configuration (required for static export mode)
// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

// GET - Get single job posting
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const jobPosting = await prisma.jobPosting.findUnique({
        where: { id },
        include: {
          candidates: {
            orderBy: { appliedDate: 'desc' },
            include: {
              interviews: {
                orderBy: { scheduledDate: 'asc' },
              },
            },
          },
          _count: {
            select: {
              candidates: true,
            },
          },
        },
      })

      if (!jobPosting) {
        return NextResponse.json(
          { error: 'Job posting not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: jobPosting,
      })
    } catch (error: any) {
      console.error('Error fetching job posting:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch job posting' },
        { status: 500 }
      )
    }
  })(request)
}

// PATCH - Update job posting
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
        title,
        department,
        position,
        description,
        requirements,
        status,
        closingDate,
      } = body

      const updateData: any = {}

      if (title !== undefined) updateData.title = title
      if (department !== undefined) updateData.department = department
      if (position !== undefined) updateData.position = position
      if (description !== undefined) updateData.description = description
      if (requirements !== undefined) updateData.requirements = requirements
      if (status !== undefined) updateData.status = status
      if (closingDate !== undefined) {
        updateData.closingDate = closingDate ? new Date(closingDate) : null
      }

      const jobPosting = await prisma.jobPosting.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: {
              candidates: true,
            },
          },
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'JOB_POSTING_UPDATED',
          user: user.email,
          userRole: user.role,
          details: `Job posting updated: ${id}`,
          metadata: {
            jobPostingId: id,
            changes: body,
          },
        },
      })

      return NextResponse.json({
        success: true,
        data: jobPosting,
      })
    } catch (error: any) {
      console.error('Error updating job posting:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update job posting' },
        { status: 500 }
      )
    }
  }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES] })(request)
}

// DELETE - Delete job posting
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

      const jobPosting = await prisma.jobPosting.findUnique({
        where: { id },
      })

      if (!jobPosting) {
        return NextResponse.json(
          { error: 'Job posting not found' },
          { status: 404 }
        )
      }

      await prisma.jobPosting.delete({
        where: { id },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'JOB_POSTING_DELETED',
          user: user.email,
          userRole: user.role,
          details: `Job posting deleted: ${id}`,
          metadata: {
            jobPostingId: id,
            title: jobPosting.title,
          },
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Job posting deleted successfully',
      })
    } catch (error: any) {
      console.error('Error deleting job posting:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to delete job posting' },
        { status: 500 }
      )
    }
  }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES] })(request)
}

