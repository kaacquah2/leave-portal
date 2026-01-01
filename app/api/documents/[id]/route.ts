/**
 * GET /api/documents/[id]
 * PATCH /api/documents/[id]
 * DELETE /api/documents/[id]
 * 
 * Get, update, or delete a document
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext, isHR, isAdmin } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { HR_ROLES, ADMIN_ROLES } from '@/lib/role-utils'

// Force static export configuration (required for static export mode)

// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

// GET - Get single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const document = await prisma.document.findUnique({
        where: { id },
        include: {
          staff: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              email: true,
              department: true,
            },
          },
        },
      })

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }

      // Check permissions - employees can only see their own or public documents
      if (!isHR(user) && !isAdmin(user)) {
        if (document.staffId && document.staffId !== user.staffId) {
          if (!document.isPublic) {
            return NextResponse.json(
              { error: 'Forbidden' },
              { status: 403 }
            )
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: document,
      })
    } catch (error: any) {
      console.error('Error fetching document:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch document' },
        { status: 500 }
      )
    }
  })(request)
}

// PATCH - Update document
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const document = await prisma.document.findUnique({
        where: { id },
      })

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }

      // Check permissions - employees can only update their own documents
      if (!isHR(user) && !isAdmin(user)) {
        if (document.staffId !== user.staffId) {
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          )
        }
      }

      const body = await request.json()
      const {
        name,
        description,
        category,
        isPublic,
        tags,
        status,
      } = body

      const updateData: any = {}

      if (name !== undefined) {
        updateData.name = name
        // Update search text
        updateData.searchText = `${name} ${document.description || ''} ${(document.tags || []).join(' ')}`.toLowerCase()
      }

      if (description !== undefined) {
        updateData.description = description
        // Update search text
        updateData.searchText = `${document.name} ${description} ${(document.tags || []).join(' ')}`.toLowerCase()
      }

      if (category !== undefined) updateData.category = category
      if (isPublic !== undefined) updateData.isPublic = isPublic
      if (tags !== undefined) {
        updateData.tags = tags
        // Update search text
        updateData.searchText = `${document.name} ${document.description || ''} ${tags.join(' ')}`.toLowerCase()
      }
      if (status !== undefined) updateData.status = status

      const updatedDocument = await prisma.document.update({
        where: { id },
        data: updateData,
        include: {
          staff: {
            select: {
              staffId: true,
              firstName: true,
              lastName: true,
              email: true,
              department: true,
            },
          },
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'DOCUMENT_UPDATED',
          user: user.email,
          userRole: user.role,
          staffId: document.staffId || undefined,
          details: `Document updated: ${id}`,
          metadata: {
            documentId: id,
            changes: body,
          },
        },
      })

      return NextResponse.json({
        success: true,
        data: updatedDocument,
      })
    } catch (error: any) {
      console.error('Error updating document:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update document' },
        { status: 500 }
      )
    }
  })(request)
}

// DELETE - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const document = await prisma.document.findUnique({
        where: { id },
      })

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }

      // Check permissions - employees can only delete their own documents
      if (!isHR(user) && !isAdmin(user)) {
        if (document.staffId !== user.staffId) {
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          )
        }
      }

      // Delete file from filesystem if it's a local file
      if (document.fileUrl && document.fileUrl.startsWith('/uploads/')) {
        try {
          const filePath = join(process.cwd(), 'public', document.fileUrl)
          await unlink(filePath)
        } catch (fileError) {
          console.error('Error deleting file:', fileError)
          // Continue with database deletion even if file deletion fails
        }
      }

      await prisma.document.delete({
        where: { id },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'DOCUMENT_DELETED',
          user: user.email,
          userRole: user.role,
          staffId: document.staffId || undefined,
          details: `Document deleted: ${id}`,
          metadata: {
            documentId: id,
            name: document.name,
          },
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Document deleted successfully',
      })
    } catch (error: any) {
      console.error('Error deleting document:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to delete document' },
        { status: 500 }
      )
    }
  })(request)
}

