import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET single document template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const template = await (prisma as any).documentTemplate.findUnique({
        where: { id },
      })

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(template)
    } catch (error) {
      console.error('Error fetching document template:', error)
      return NextResponse.json(
        { error: 'Failed to fetch document template' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })(request)
}

// PATCH update document template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR and admin can update templates
      if (user.role !== 'hr' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const { name, description, category, type, fileUrl, fields, isActive } = body

      const existing = await (prisma as any).documentTemplate.findUnique({
        where: { id },
      })

      if (!existing) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      const template = await (prisma as any).documentTemplate.update({
        where: { id },
        data: {
          name: name || existing.name,
          description: description !== undefined ? description : existing.description,
          category: category || existing.category,
          type: type || existing.type,
          fileUrl: fileUrl !== undefined ? fileUrl : existing.fileUrl,
          fields: fields !== undefined ? fields : existing.fields,
          isActive: isActive !== undefined ? isActive : existing.isActive,
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'DOCUMENT_TEMPLATE_UPDATED',
          user: user.email,
          details: `Document template updated: ${template.name}`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json(template)
    } catch (error) {
      console.error('Error updating document template:', error)
      return NextResponse.json(
        { error: 'Failed to update document template' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

// DELETE document template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR and admin can delete templates
      if (user.role !== 'hr' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const template = await (prisma as any).documentTemplate.findUnique({
        where: { id },
      })

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      await (prisma as any).documentTemplate.delete({
        where: { id },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'DOCUMENT_TEMPLATE_DELETED',
          user: user.email,
          details: `Document template deleted: ${template.name}`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error deleting document template:', error)
      return NextResponse.json(
        { error: 'Failed to delete document template' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

