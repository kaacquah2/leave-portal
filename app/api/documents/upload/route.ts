/**
 * POST /api/documents/upload
 * 
 * Upload a document file
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'documents')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

export async function POST(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Ensure upload directory exists
      try {
        await ensureUploadDir()
      } catch (dirError: any) {
        console.error('Error creating upload directory:', dirError)
        return NextResponse.json(
          { error: 'Failed to initialize upload directory. Please contact system administrator.' },
          { status: 500 }
        )
      }

      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const staffId = formData.get('staffId') as string | null
      const type = formData.get('type') as string | null
      const category = formData.get('category') as string | null
      const description = formData.get('description') as string | null
      const isPublic = formData.get('isPublic') === 'true'

      if (!file) {
        return NextResponse.json(
          { error: 'File is required' },
          { status: 400 }
        )
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { 
            error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            errorCode: 'FILE_TOO_LARGE',
          },
          { status: 400 }
        )
      }

      // If staffId not provided, use current user's staffId
      let finalStaffId = staffId
      if (!finalStaffId && user.staffId) {
        finalStaffId = user.staffId
      }

      // Generate unique filename
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filename = `${timestamp}_${sanitizedName}`
      const filepath = join(UPLOAD_DIR, filename)

      // Save file with error handling
      try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filepath, buffer)
      } catch (writeError: any) {
        console.error('Error writing file:', writeError)
        return NextResponse.json(
          { error: `Failed to save file: ${writeError.message || 'Unknown error'}` },
          { status: 500 }
        )
      }

      // Create document record
      const { prisma } = await import('@/lib/prisma')
      const document = await prisma.document.create({
        data: {
          staffId: finalStaffId || null,
          name: file.name,
          type: type || 'other',
          category: category || 'general',
          fileUrl: `/uploads/documents/${filename}`,
          fileSize: file.size,
          mimeType: file.type,
          uploadedBy: user.email,
          description: description || null,
          isPublic: isPublic || false,
          tags: [],
          searchText: `${file.name} ${description || ''}`.toLowerCase(),
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
          details: `Document uploaded: ${file.name}`,
          metadata: {
            documentId: document.id,
            type: type || 'other',
            category: category || 'general',
            fileSize: file.size,
          },
        },
      })

      return NextResponse.json({
        success: true,
        data: document,
        message: 'Document uploaded successfully',
      })
    } catch (error: any) {
      console.error('Error uploading document:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to upload document' },
        { status: 500 }
      )
    }
  })(request)
}

