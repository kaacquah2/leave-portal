/**
 * GET /api/documents
 * POST /api/documents
 * 
 * List and create documents
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'

// GET - List documents
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const staffId = searchParams.get('staffId')
      const type = searchParams.get('type')
      const category = searchParams.get('category')
      const status = searchParams.get('status')
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')

      const where: any = {}

      // Staff filter - employees can only see their own or public documents
      if (staffId) {
        where.staffId = staffId
      } else if (!user.role.includes('HR') && !user.role.includes('ADMIN') && user.role !== 'admin') {
        // Non-HR users can only see their own or public documents
        const staff = await prisma.staffMember.findUnique({
          where: { staffId: user.staffId || '' },
        })
        if (staff) {
          where.OR = [
            { staffId: staff.staffId },
            { isPublic: true },
          ]
        } else {
          where.isPublic = true
        }
      }

      if (type && type !== 'all') {
        where.type = type
      }

      if (category && category !== 'all') {
        where.category = category
      }

      if (status && status !== 'all') {
        where.status = status
      }

      const [data, total] = await Promise.all([
        prisma.document.findMany({
          where,
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
          orderBy: { uploadedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.document.count({ where }),
      ])

      return NextResponse.json({
        success: true,
        data,
        total,
        limit,
        offset,
      })
    } catch (error: any) {
      console.error('Error fetching documents:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch documents' },
        { status: 500 }
      )
    }
  })(request)
}

// POST - Create document (upload handled separately, this is for metadata)
export async function POST(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const body = await request.json()
      const {
        staffId,
        name,
        type,
        category,
        fileUrl,
        fileSize,
        mimeType,
        description,
        isPublic,
        tags,
        templateId,
      } = body

      if (!name || !type || !category || !fileUrl || !fileSize || !mimeType) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        )
      }

      // If staffId not provided, use current user's staffId
      let finalStaffId = staffId
      if (!finalStaffId && user.staffId) {
        finalStaffId = user.staffId
      }

      // Verify staff exists if staffId provided
      if (finalStaffId) {
        const staff = await prisma.staffMember.findUnique({
          where: { staffId: finalStaffId },
        })

        if (!staff) {
          return NextResponse.json(
            { error: 'Staff member not found' },
            { status: 404 }
          )
        }
      }

      const document = await prisma.document.create({
        data: {
          staffId: finalStaffId || null,
          name,
          type,
          category,
          fileUrl,
          fileSize,
          mimeType,
          uploadedBy: user.email,
          description: description || null,
          isPublic: isPublic || false,
          tags: tags || [],
          templateId: templateId || null,
          searchText: `${name} ${description || ''} ${(tags || []).join(' ')}`.toLowerCase(),
        },
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
          action: 'DOCUMENT_UPLOADED',
          user: user.email,
          userRole: user.role,
          staffId: finalStaffId || undefined,
          details: `Document uploaded: ${name}`,
          metadata: {
            documentId: document.id,
            type,
            category,
          },
        },
      })

      return NextResponse.json({
        success: true,
        data: document,
      })
    } catch (error: any) {
      console.error('Error creating document:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create document' },
        { status: 500 }
      )
    }
  })(request)
}

