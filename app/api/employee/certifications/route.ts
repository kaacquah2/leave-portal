import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'


// GET certifications for current user
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (!user.staffId) {
      return NextResponse.json({ error: 'Staff ID not found' }, { status: 400 })
    }

    // Get certifications from Document table
    const certifications = await prisma.document.findMany({
      where: {
        staffId: user.staffId,
        category: 'certification',
        type: 'certificate',
      },
      orderBy: { uploadedAt: 'desc' },
    })

    // Parse certification data from fileUrl or description
    const parsedCertifications = certifications.map((doc) => {
      try {
        const data = JSON.parse(doc.fileUrl)
        return {
          id: doc.id,
          name: doc.name,
          ...data,
          fileUrl: data.certificateUrl || doc.fileUrl,
          uploadedAt: doc.uploadedAt,
          expiresAt: data.expiresAt || doc.expiresAt,
        }
      } catch {
        return {
          id: doc.id,
          name: doc.name,
          fileUrl: doc.fileUrl,
          uploadedAt: doc.uploadedAt,
          expiresAt: doc.expiresAt,
          description: doc.description,
        }
      }
    })

    return NextResponse.json(parsedCertifications)
  } catch (error) {
    console.error('Error fetching certifications:', error)
    return NextResponse.json({ error: 'Failed to fetch certifications' }, { status: 500 })
  }
}, { allowedRoles: ['employee'] })

// POST add or update certification
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (!user.staffId) {
      return NextResponse.json({ error: 'Staff ID not found' }, { status: 400 })
    }

    const body = await request.json()
    const { name, issuingOrganization, issueDate, expiryDate, certificateNumber, fileUrl, description } = body

    if (!name || !issuingOrganization) {
      return NextResponse.json(
        { error: 'Name and issuing organization are required' },
        { status: 400 }
      )
    }

    const certData = {
      name,
      issuingOrganization,
      issueDate: issueDate || new Date().toISOString(),
      expiryDate: expiryDate || null,
      certificateNumber: certificateNumber || null,
      certificateUrl: fileUrl || null,
      description: description || null,
    }

    // Create or update document
    const doc = await prisma.document.upsert({
      where: {
        id: body.id || `cert_${user.staffId}_${name}`,
      },
      update: {
        name,
        fileUrl: fileUrl || JSON.stringify(certData),
        description: description || `Certification: ${name} from ${issuingOrganization}`,
        expiresAt: expiryDate ? new Date(expiryDate) : null,
        updatedAt: new Date(),
      },
      create: {
        staffId: user.staffId,
        name,
        type: 'certificate',
        category: 'certification',
        fileUrl: fileUrl || JSON.stringify(certData),
        fileSize: 0,
        mimeType: fileUrl ? 'application/pdf' : 'application/json',
        uploadedBy: user.email || 'system',
        description: description || `Certification: ${name} from ${issuingOrganization}`,
        expiresAt: expiryDate ? new Date(expiryDate) : null,
        isPublic: false,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CERTIFICATION_ADDED',
        user: user.email || 'system',
        staffId: user.staffId,
        details: `Certification added: ${name}`,
      },
    })

    return NextResponse.json({ success: true, certification: { ...certData, id: doc.id } })
  } catch (error) {
    console.error('Error saving certification:', error)
    return NextResponse.json({ error: 'Failed to save certification' }, { status: 500 })
  }
}, { allowedRoles: ['employee'] })

// DELETE certification
export const DELETE = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (!user.staffId) {
      return NextResponse.json({ error: 'Staff ID not found' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const certId = searchParams.get('id')

    if (!certId) {
      return NextResponse.json({ error: 'Certification ID is required' }, { status: 400 })
    }

    await prisma.document.deleteMany({
      where: {
        id: certId,
        staffId: user.staffId,
        category: 'certification',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting certification:', error)
    return NextResponse.json({ error: 'Failed to delete certification' }, { status: 500 })
  }
}, { allowedRoles: ['employee'] })

