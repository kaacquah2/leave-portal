/**
 * GET /api/leaves/[id]/attachments
 * POST /api/leaves/[id]/attachments
 * DELETE /api/leaves/[id]/attachments
 * 
 * Manage leave request attachments
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'attachments')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

// GET - List attachments for a leave request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id },
      })

      if (!leaveRequest) {
        return NextResponse.json(
          { error: 'Leave request not found' },
          { status: 404 }
        )
      }

      // Check permissions - user must be the requester, approver, or HR
      const isRequester = leaveRequest.staffId === user.staffId
      const isHR = ['HR_OFFICER', 'HR_DIRECTOR', 'hr', 'hr_officer', 'hr_director'].includes(user.role)

      if (!isRequester && !isHR) {
        return NextResponse.json(
          { error: 'Forbidden - Access denied' },
          { status: 403 }
        )
      }

      const attachments = await prisma.leaveAttachment.findMany({
        where: { leaveRequestId: id },
        orderBy: { uploadedAt: 'desc' },
      })

      return NextResponse.json({
        success: true,
        attachments,
      })
    } catch (error: any) {
      console.error('Error fetching attachments:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch attachments' },
        { status: 500 }
      )
    }
  })(request)
}

// POST - Upload attachment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      await ensureUploadDir()

      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id },
      })

      if (!leaveRequest) {
        return NextResponse.json(
          { error: 'Leave request not found' },
          { status: 404 }
        )
      }

      // Check permissions - only requester can upload attachments
      if (leaveRequest.staffId !== user.staffId) {
        return NextResponse.json(
          { error: 'Forbidden - Only the requester can upload attachments' },
          { status: 403 }
        )
      }

      // Parse form data
      const formData = await request.formData()
      const file = formData.get('file') as File
      const attachmentType = formData.get('attachmentType') as string || 'other'
      const description = formData.get('description') as string || null

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

      // Generate unique filename
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filename = `${id}_${timestamp}_${sanitizedName}`
      const filepath = join(UPLOAD_DIR, filename)

      // Save file
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filepath, buffer)

      // Create database record
      const attachment = await prisma.leaveAttachment.create({
        data: {
          leaveRequestId: id,
          name: file.name,
          fileUrl: `/uploads/attachments/${filename}`,
          fileSize: file.size,
          mimeType: file.type,
          attachmentType,
          uploadedBy: user.email,
          description,
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'LEAVE_ATTACHMENT_UPLOADED',
          user: user.email,
          userRole: user.role,
          details: JSON.stringify({
            leaveRequestId: id,
            attachmentId: attachment.id,
            fileName: file.name,
            fileSize: file.size,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        attachment,
        message: 'Attachment uploaded successfully',
      })
    } catch (error: any) {
      console.error('Error uploading attachment:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to upload attachment' },
        { status: 500 }
      )
    }
  })(request)
}

// DELETE - Delete attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const attachmentId = searchParams.get('attachmentId')

      if (!attachmentId) {
        return NextResponse.json(
          { error: 'attachmentId is required' },
          { status: 400 }
        )
      }

      const attachment = await prisma.leaveAttachment.findUnique({
        where: { id: attachmentId },
        include: {
          leaveRequest: true,
        },
      })

      if (!attachment) {
        return NextResponse.json(
          { error: 'Attachment not found' },
          { status: 404 }
        )
      }

      // Check permissions - only requester or HR can delete
      const isRequester = attachment.leaveRequest.staffId === user.staffId
      const isHR = ['HR_OFFICER', 'HR_DIRECTOR', 'hr', 'hr_officer', 'hr_director'].includes(user.role)

      if (!isRequester && !isHR) {
        return NextResponse.json(
          { error: 'Forbidden - Access denied' },
          { status: 403 }
        )
      }

      // Delete file from filesystem
      const filename = attachment.fileUrl.split('/').pop()
      if (filename) {
        const filepath = join(UPLOAD_DIR, filename)
        try {
          if (existsSync(filepath)) {
            await unlink(filepath)
          }
        } catch (fileError) {
          console.error('Error deleting file:', fileError)
          // Continue with database deletion even if file deletion fails
        }
      }

      // Delete database record
      await prisma.leaveAttachment.delete({
        where: { id: attachmentId },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'LEAVE_ATTACHMENT_DELETED',
          user: user.email,
          userRole: user.role,
          details: JSON.stringify({
            leaveRequestId: id,
            attachmentId,
            fileName: attachment.name,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Attachment deleted successfully',
      })
    } catch (error: any) {
      console.error('Error deleting attachment:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to delete attachment' },
        { status: 500 }
      )
    }
  })(request)
}

