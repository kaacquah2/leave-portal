/**
 * Employee Document Upload (Self-Service) API
 * 
 * Ghana Government Compliance:
 * - Data Protection Act 843: All document uploads logged
 * - File validation and security checks required
 * - Document metadata stored for audit trail
 * - File size and type restrictions per government standards
 * 
 * Legal References:
 * - Data Protection Act, 2012 (Act 843), Section 24 (Data Access)
 * - Government ICT Security Standards - File Upload Security
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isHR, isAdmin } from '@/lib/auth-proxy'
import { logDataAccess } from '@/lib/data-access-logger'

// Force static export configuration (required for static export mode)
// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ staffId: 'dummy' }]
}
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Government compliance: File upload restrictions
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB maximum
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const ALLOWED_DOCUMENT_TYPES = [
  'certificate',
  'qualification',
  'identification',
  'contract',
  'medical',
  'training',
  'other',
]

/**
 * GET /api/employees/[staffId]/documents
 * Get employee documents (self-service view)
 * 
 * Government Compliance:
 * - Employees can only view their own documents
 * - Data access logged per Data Protection Act 843
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  const { staffId } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Verify employee can only access their own documents
      if (user.staffId !== staffId) {
        // Only HR and admin can view other documents
        if (!isHR(user) && !isAdmin(user)) {
          return NextResponse.json(
            { error: 'Forbidden - You can only view your own documents' },
            { status: 403 }
          )
        }
      }

      // Get IP and user agent for data access logging
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Get staff member
      const staff = await prisma.staffMember.findUnique({
        where: { staffId },
      })

      if (!staff) {
        return NextResponse.json(
          { error: 'Staff member not found' },
          { status: 404 }
        )
      }

      // Get documents using Prisma Document model
      const documents = await prisma.document.findMany({
        where: { staffId },
        orderBy: { uploadedAt: 'desc' },
      })

      // Log data access (Data Protection Act 843 compliance)
      await logDataAccess({
        userId: user.id,
        userRole: user.role,
        staffId: staff.staffId,
        dataType: 'staff_profile',
        action: 'view',
        ip,
        userAgent,
        metadata: { documentCount: Array.isArray(documents) ? documents.length : 0 },
      })

      return NextResponse.json({ documents: documents || [] })
    } catch (error) {
      console.error('Error fetching employee documents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }
  })(request)
}

/**
 * POST /api/employees/[staffId]/documents
 * Upload employee document (self-service)
 * 
 * Government Compliance:
 * - File validation (size, type, security)
 * - Document metadata stored
 * - Upload logged in audit trail
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  const { staffId } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Verify employee can only upload to their own profile
      if (user.staffId !== staffId) {
        return NextResponse.json(
          { error: 'Forbidden - You can only upload documents to your own profile' },
          { status: 403 }
        )
      }

      // Get form data
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const documentType = formData.get('documentType') as string
      const description = formData.get('description') as string | null
      const title = formData.get('title') as string | null

      // Validate required fields
      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        )
      }

      if (!documentType || !ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
        return NextResponse.json(
          { error: `Invalid document type. Must be one of: ${ALLOWED_DOCUMENT_TYPES.join(', ')}` },
          { status: 400 }
        )
      }

      // Validate file size (Government compliance)
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        )
      }

      // Validate MIME type (Government compliance)
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` },
          { status: 400 }
        )
      }

      // Get staff member
      const staff = await prisma.staffMember.findUnique({
        where: { staffId },
      })

      if (!staff) {
        return NextResponse.json(
          { error: 'Staff member not found' },
          { status: 404 }
        )
      }

      // Generate unique filename
      const timestamp = Date.now()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `${staffId}_${timestamp}_${sanitizedFileName}`
      const uploadDir = join(process.cwd(), 'uploads', 'documents', staffId)

      // Create upload directory if it doesn't exist
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }

      // Save file
      const filePath = join(uploadDir, fileName)
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      // Get IP and user agent
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      const userAgent = req.headers.get('user-agent') || undefined

      // Create document record using Prisma Document model
      const document = await prisma.document.create({
        data: {
          staffId,
          name: title || file.name,
          type: documentType === 'certificate' ? 'certificate' : 
                documentType === 'qualification' ? 'certificate' :
                documentType === 'identification' ? 'other' :
                documentType === 'contract' ? 'contract' :
                documentType === 'medical' ? 'other' :
                documentType === 'training' ? 'certificate' : 'other',
          category: documentType,
          fileUrl: `/uploads/documents/${staffId}/${fileName}`,
          fileSize: file.size,
          mimeType: file.type,
          uploadedBy: user.email,
          description: description || null,
          status: 'active',
        },
      })

      // Log data access (Data Protection Act 843 compliance)
      await logDataAccess({
        userId: user.id,
        userRole: user.role,
        staffId: staff.staffId,
        dataType: 'staff_profile',
        action: 'edit',
        ip,
        userAgent,
        metadata: {
          documentId: document.id,
          documentType,
          fileName: file.name,
          fileSize: file.size,
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'DOCUMENT_UPLOAD',
          user: user.email,
          staffId: staff.staffId,
          details: `Employee ${staff.firstName} ${staff.lastName} (${staff.staffId}) uploaded document: ${title || file.name} (${documentType})`,
          ip,
        },
      })

      return NextResponse.json({
        success: true,
        document,
        message: 'Document uploaded successfully.',
      })
    } catch (error) {
      console.error('Error uploading document:', error)
      return NextResponse.json(
        { error: 'Failed to upload document' },
        { status: 500 }
      )
    }
  })(request)
}

