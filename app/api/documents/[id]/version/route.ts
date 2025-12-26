import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// POST create new version of document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      const body = await req.json()
      const { fileUrl, fileSize, mimeType, description, tags } = body

      // Get parent document
      const parent = await prisma.document.findUnique({
        where: { id },
      })

      if (!parent) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }

      // Check permissions
      if (user.role === 'employee' && user.staffId !== parent.staffId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }

      // Calculate new version number
      const latestVersion = await prisma.document.findFirst({
        where: {
          OR: [
            { id },
            { parentId: id } as any,
          ],
        },
        orderBy: { version: 'desc' } as any,
        select: { version: true } as any,
      })

      const newVersion = ((latestVersion as any)?.version || (parent as any).version) + 1

      // Build search text
      const searchText = [
        parent.name,
        description || parent.description,
        ...(tags || (parent as any).tags || []),
        parent.category,
        parent.type,
      ].filter(Boolean).join(' ').toLowerCase()

      // Create new version
      const newVersionDoc = await prisma.document.create({
        data: {
          staffId: parent.staffId,
          name: parent.name,
          type: parent.type,
          category: parent.category,
          fileUrl: fileUrl || parent.fileUrl,
          fileSize: fileSize || parent.fileSize,
          mimeType: mimeType || parent.mimeType,
          uploadedBy: user.email,
          description: description || parent.description,
          isPublic: parent.isPublic,
          expiresAt: parent.expiresAt,
          tags: tags || parent.tags || [],
          templateId: (parent as any).templateId,
          parentId: id,
          version: newVersion,
          searchText,
          status: 'active',
        },
      })

      // Archive old version (optional - you might want to keep all versions active)
      // await prisma.document.update({
      //   where: { id },
      //   data: { status: 'archived' },
      // })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'DOCUMENT_VERSION_CREATED',
          user: user.email,
          staffId: parent.staffId || undefined,
          details: `New version ${newVersion} created for document: ${parent.name}`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json(newVersionDoc, { status: 201 })
    } catch (error) {
      console.error('Error creating document version:', error)
      return NextResponse.json(
        { error: 'Failed to create document version' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })(request)
}

// GET all versions of a document
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

      // Check permissions
      if (user.role === 'employee' && user.staffId !== document.staffId && !document.isPublic) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }

      // Get all versions (parent and children)
      const parentId = (document as any).parentId || document.id
      
      const versions = await prisma.document.findMany({
        where: {
          OR: [
            { id: parentId },
            { parentId: parentId } as any,
          ],
        },
        orderBy: { version: 'asc' } as any,
      })

      return NextResponse.json(versions)
    } catch (error) {
      console.error('Error fetching document versions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch document versions' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })(request)
}

