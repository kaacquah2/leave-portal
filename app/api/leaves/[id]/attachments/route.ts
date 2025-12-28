import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// POST upload attachment for leave request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request }: AuthContext) => {
    try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const attachmentType = formData.get('attachmentType') as string || 'other'
    const description = formData.get('description') as string || ''

    if (!file || !name) {
      return NextResponse.json(
        { error: 'File and name are required' },
        { status: 400 }
      )
    }

    // Find leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      select: { staffId: true, status: true },
    })

    if (!leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      )
    }

    // Employees can only upload attachments to their own leave requests
    if (user.role === 'employee' && leaveRequest.staffId !== user.staffId) {
      return NextResponse.json(
        { error: 'You can only upload attachments to your own leave requests' },
        { status: 403 }
      )
    }

    // Validate file size (max 10MB for attachments)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX' },
        { status: 400 }
      )
    }

    // Validate attachment type
    const validTypes = ['medical', 'training', 'memo', 'other']
    if (!validTypes.includes(attachmentType)) {
      return NextResponse.json(
        { error: `Invalid attachment type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'leave-attachments')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileExtension = file.name.split('.').pop()
    const filename = `${id}_${timestamp}_${sanitizedName}.${fileExtension}`
    const filePath = join(uploadsDir, filename)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create file URL
    const fileUrl = `/uploads/leave-attachments/${filename}`

    // Create attachment record
    const attachment = await prisma.leaveAttachment.create({
      data: {
        leaveRequestId: id,
        name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        attachmentType,
        uploadedBy: user.email || 'system',
        description: description || null,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'LEAVE_ATTACHMENT_UPLOADED',
        user: user.email || 'system',
        staffId: leaveRequest.staffId,
        details: `Attachment uploaded for leave request: ${name} (${attachmentType})`,
      },
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    console.error('Error uploading attachment:', error)
    return NextResponse.json(
      { error: 'Failed to upload attachment' },
      { status: 500 }
    )
  }
  }, { allowedRoles: ['employee', 'hr', 'manager', 'admin'] })(request)
}

// GET list attachments for leave request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request }: AuthContext) => {
    try {

    // Find leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      select: { staffId: true },
    })

    if (!leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      )
    }

    // Employees can only see attachments for their own leave requests
    if (user.role === 'employee' && leaveRequest.staffId !== user.staffId) {
      return NextResponse.json(
        { error: 'You can only view attachments for your own leave requests' },
        { status: 403 }
      )
    }

    const attachments = await prisma.leaveAttachment.findMany({
      where: { leaveRequestId: id },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json(attachments)
  } catch (error) {
    console.error('Error fetching attachments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 }
    )
  }
  }, { allowedRoles: ['employee', 'hr', 'manager', 'admin'] })(request)
}

