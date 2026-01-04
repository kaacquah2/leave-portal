/**
 * GET /api/recruitment/candidates/[id]
 * PATCH /api/recruitment/candidates/[id]
 * DELETE /api/recruitment/candidates/[id]
 * 
 * Get, update, or delete a candidate
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext, isHR, isAdmin } from '@/lib/auth-proxy'
import { HR_ROLES, ADMIN_ROLES } from '@/lib/role-utils'
import { prisma } from '@/lib/prisma'

// Force static export configuration (required for static export mode)
// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

// GET - Get single candidate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const candidate = await prisma.candidate.findUnique({
        where: { id },
        include: {
          jobPosting: true,
          interviews: {
            orderBy: { scheduledDate: 'desc' },
          },
        },
      })

      if (!candidate) {
        return NextResponse.json(
          { error: 'Candidate not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: candidate,
      })
    } catch (error: any) {
      console.error('Error fetching candidate:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch candidate' },
        { status: 500 }
      )
    }
  })(request)
}

// PATCH - Update candidate
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only HR and Admin can update candidates
      if (!isHR(user) && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'Forbidden - HR or Admin access required' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const {
        status,
        notes,
        resumeUrl,
        coverLetter,
      } = body

      const updateData: any = {}

      if (status !== undefined) updateData.status = status
      if (notes !== undefined) updateData.notes = notes
      if (resumeUrl !== undefined) updateData.resumeUrl = resumeUrl
      if (coverLetter !== undefined) updateData.coverLetter = coverLetter

      const candidate = await prisma.candidate.update({
        where: { id },
        data: updateData,
        include: {
          jobPosting: {
            select: {
              id: true,
              title: true,
              department: true,
              position: true,
            },
          },
          interviews: {
            orderBy: { scheduledDate: 'desc' },
          },
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'CANDIDATE_UPDATED',
          user: user.email,
          userRole: user.role,
          details: `Candidate updated: ${id}`,
          metadata: {
            candidateId: id,
            changes: body,
          },
        },
      })

      return NextResponse.json({
        success: true,
        data: candidate,
      })
    } catch (error: any) {
      console.error('Error updating candidate:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update candidate' },
        { status: 500 }
      )
    }
  }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES] })(request)
}

// DELETE - Delete candidate
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

      const candidate = await prisma.candidate.findUnique({
        where: { id },
      })

      if (!candidate) {
        return NextResponse.json(
          { error: 'Candidate not found' },
          { status: 404 }
        )
      }

      await prisma.candidate.delete({
        where: { id },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'CANDIDATE_DELETED',
          user: user.email,
          userRole: user.role,
          details: `Candidate deleted: ${id}`,
          metadata: {
            candidateId: id,
            name: `${candidate.firstName} ${candidate.lastName}`,
          },
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Candidate deleted successfully',
      })
    } catch (error: any) {
      console.error('Error deleting candidate:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to delete candidate' },
        { status: 500 }
      )
    }
  }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES] })(request)
}

