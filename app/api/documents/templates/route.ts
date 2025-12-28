import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'


// GET all document templates
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const category = searchParams.get('category')
      const type = searchParams.get('type')
      const activeOnly = searchParams.get('activeOnly') !== 'false'

      const where: any = {}
      if (category) where.category = category
      if (type) where.type = type
      if (activeOnly) where.isActive = true

      const templates = await (prisma as any).documentTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json(templates)
    } catch (error) {
      console.error('Error fetching document templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch document templates' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })(request)
}

// POST create document template
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR and admin can create templates
      if (user.role !== 'hr' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const { name, description, category, type, fileUrl, fields } = body

      if (!name || !category || !type) {
        return NextResponse.json(
          { error: 'Name, category, and type are required' },
          { status: 400 }
        )
      }

      const template = await (prisma as any).documentTemplate.create({
        data: {
          name,
          description: description || null,
          category,
          type,
          fileUrl: fileUrl || null,
          fields: fields || null,
          createdBy: user.email,
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'DOCUMENT_TEMPLATE_CREATED',
          user: user.email,
          details: `Document template created: ${name}`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json(template, { status: 201 })
    } catch (error) {
      console.error('Error creating document template:', error)
      return NextResponse.json(
        { error: 'Failed to create document template' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

