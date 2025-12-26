import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET all documents
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {

    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get('staffId')
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const search = searchParams.get('search') // Full-text search
    const tag = searchParams.get('tag') // Filter by tag
    const status = searchParams.get('status') || 'active' // Filter by status
    const expired = searchParams.get('expired') === 'true' // Show expired documents
    const includeVersions = searchParams.get('includeVersions') === 'true'

    const where: any = {}

    // Role-based filtering
    if (user.role === 'employee' && user.staffId) {
      where.staffId = user.staffId
      where.isPublic = true // Employees can only see public documents
    } else if (staffId) {
      where.staffId = staffId
    }

    if (type) where.type = type
    if (category) where.category = category
    
    // Tag filtering
    if (tag) {
      where.tags = { has: tag }
    }
    
    // Full-text search (search in name, description, and tags)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { searchText: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    // Expiration filtering
    if (expired) {
      where.expiresAt = { lte: new Date() }
    } else if (!expired) {
      // By default, exclude expired documents unless explicitly requested
      // Use AND with OR for expiration: (expiresAt is null OR expiresAt > now)
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      ]
    }

    const documents = await prisma.document.findMany({
      where,
      include: includeVersions ? {
        versions: {
          orderBy: { version: 'desc' } as any,
        },
        parent: true,
      } as any : undefined,
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

// POST create document record (file upload handled separately)
export const POST = withAuth(async ({ user, request }: AuthContext) => {
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
      expiresAt,
      tags,
      templateId,
      parentId, // For versioning
    } = body

    // Employees can only upload documents for themselves
    if (user.role === 'employee' && staffId && staffId !== user.staffId) {
      return NextResponse.json(
        { error: 'You can only upload documents for yourself' },
        { status: 403 }
      )
    }

    // Handle versioning - if parentId is provided, create a new version
    let version = 1
    if (parentId) {
      const parent = await prisma.document.findUnique({
        where: { id: parentId },
        select: { version: true } as any,
      })
      if (parent) {
        version = (parent as any).version + 1
      }
    }

    // Build search text for full-text search
    const searchText = [
      name,
      description,
      ...(tags || []),
      category,
      type,
    ].filter(Boolean).join(' ').toLowerCase()

    const document = await prisma.document.create({
      data: {
        staffId: staffId || null,
        name,
        type,
        category,
        fileUrl,
        fileSize,
        mimeType,
        uploadedBy: user.email,
        description: description || null,
        isPublic: isPublic || false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        tags: tags || [],
        templateId: templateId || null,
        parentId: parentId || null,
        version,
        searchText,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DOCUMENT_UPLOADED',
        user: user.email,
        staffId: staffId || undefined,
        details: `Document uploaded: ${name}`,
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

