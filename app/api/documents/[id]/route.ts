import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET single document
export async function GET(
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

    // Check access permissions
    if (user.role === 'employee' && user.staffId !== document.staffId && !document.isPublic) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

      return NextResponse.json(document)
    } catch (error) {
      console.error('Error fetching document:', error)
      return NextResponse.json(
        { error: 'Failed to fetch document' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })(request)
}

// PATCH update document
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request }: AuthContext) => {
    try {

    const body = await request.json()
    const { name, type, category, description, isPublic, expiresAt, tags, status } = body

    const existing = await prisma.document.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (user.role === 'employee' && user.staffId !== existing.staffId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Rebuild search text if relevant fields changed
    const updatedName = name || existing.name
    const updatedDescription = description !== undefined ? description : existing.description
    const updatedTags = tags !== undefined ? tags : (existing as any).tags
    const updatedCategory = category || existing.category
    const updatedType = type || existing.type

    const searchText = [
      updatedName,
      updatedDescription,
      ...(updatedTags || []),
      updatedCategory,
      updatedType,
    ].filter(Boolean).join(' ').toLowerCase()

    const document = await prisma.document.update({
      where: { id },
      data: {
        name: updatedName,
        type: updatedType,
        category: updatedCategory,
        description: updatedDescription,
        isPublic: isPublic !== undefined ? isPublic : existing.isPublic,
        expiresAt: expiresAt ? new Date(expiresAt) : existing.expiresAt,
        tags: updatedTags,
        status: status !== undefined ? status : (existing as any).status,
        searchText,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DOCUMENT_UPDATED',
        user: user.email,
        staffId: existing.staffId || undefined,
        details: `Document updated: ${document.name}`,
      },
    })

      return NextResponse.json(document)
    } catch (error) {
      console.error('Error updating document:', error)
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })(request)
}

// DELETE document
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

    // Check permissions
    if (user.role === 'employee' && user.staffId !== document.staffId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    await prisma.document.delete({
      where: { id },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DOCUMENT_DELETED',
        user: user.email,
        staffId: document.staffId || undefined,
        details: `Document deleted: ${document.name}`,
      },
    })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error deleting document:', error)
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })(request)
}

