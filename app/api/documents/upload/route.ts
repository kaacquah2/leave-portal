import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'


// POST upload document file
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const type = formData.get('type') as string || 'other'
    const category = formData.get('category') as string || 'personal'
    const description = formData.get('description') as string || ''
    const staffId = formData.get('staffId') as string || user.staffId

    if (!file || !name) {
      return NextResponse.json(
        { error: 'File and name are required' },
        { status: 400 }
      )
    }

    // Employees can only upload documents for themselves
    if (user.role === 'employee' && staffId && staffId !== user.staffId) {
      return NextResponse.json(
        { error: 'You can only upload documents for yourself' },
        { status: 403 }
      )
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
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

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'documents')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileExtension = file.name.split('.').pop()
    const filename = `${staffId}_${timestamp}_${sanitizedName}.${fileExtension}`
    const filePath = join(uploadsDir, filename)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create file URL
    const fileUrl = `/uploads/documents/${filename}`

    // Create document record
    const document = await prisma.document.create({
      data: {
        staffId: staffId || user.staffId,
        name,
        type,
        category,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy: user.email || 'system',
        description: description || null,
        isPublic: false,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DOCUMENT_UPLOADED',
        user: user.email || 'system',
        staffId: staffId || user.staffId,
        details: `Document uploaded: ${name} (${category})`,
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })

