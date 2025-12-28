import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'


// GET emergency contacts for current user
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (!user.staffId) {
      return NextResponse.json({ error: 'Staff ID not found' }, { status: 400 })
    }

    // Get emergency contacts from Document table with category 'emergency_contact'
    const contactDocs = await prisma.document.findMany({
      where: {
        staffId: user.staffId,
        category: 'emergency_contact',
        type: 'other',
      },
      orderBy: { uploadedAt: 'desc' },
    })

    // Parse contacts from document fileUrl (stored as JSON)
    const contacts = contactDocs
      .map((doc) => {
        try {
          const contactData = JSON.parse(doc.fileUrl)
          return {
            id: doc.id,
            ...contactData,
          }
        } catch {
          return null
        }
      })
      .filter((c) => c !== null)

    return NextResponse.json(contacts)
  } catch (error) {
    console.error('Error fetching emergency contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch emergency contacts' }, { status: 500 })
  }
}, { allowedRoles: ['employee'] })

// POST create or update emergency contact
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (!user.staffId) {
      return NextResponse.json({ error: 'Staff ID not found' }, { status: 400 })
    }

    const body = await request.json()
    const { name, relationship, phone, email, address, isPrimary } = body

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      )
    }

    const staff = await prisma.staffMember.findUnique({
      where: { staffId: user.staffId },
      select: { id: true },
    })

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    const contactData = {
      name,
      relationship: relationship || 'Other',
      phone,
      email: email || null,
      address: address || null,
      isPrimary: isPrimary || false,
      createdAt: new Date().toISOString(),
    }

    // Check if contact with same name exists
    const existingDoc = await prisma.document.findFirst({
      where: {
        staffId: user.staffId,
        category: 'emergency_contact',
        name: `Emergency Contact: ${name}`,
      },
    })

    if (existingDoc) {
      // Update existing contact
      await prisma.document.update({
        where: { id: existingDoc.id },
        data: {
          fileUrl: JSON.stringify(contactData),
          updatedAt: new Date(),
        },
      })
    } else {
      // Create new contact
      await prisma.document.create({
        data: {
          staffId: user.staffId,
          name: `Emergency Contact: ${name}`,
          type: 'other',
          category: 'emergency_contact',
          fileUrl: JSON.stringify(contactData),
          fileSize: 0,
          mimeType: 'application/json',
          uploadedBy: user.email || 'system',
          description: `Emergency contact: ${name}`,
          isPublic: false,
        },
      })
    }

    return NextResponse.json({ success: true, contact: { ...contactData, id: existingDoc?.id } })
  } catch (error) {
    console.error('Error saving emergency contact:', error)
    return NextResponse.json({ error: 'Failed to save emergency contact' }, { status: 500 })
  }
}, { allowedRoles: ['employee'] })

// DELETE emergency contact
export const DELETE = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (!user.staffId) {
      return NextResponse.json({ error: 'Staff ID not found' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('id')

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 })
    }

    // Delete from Document table
    await prisma.document.deleteMany({
      where: {
        id: contactId,
        staffId: user.staffId,
        category: 'emergency_contact',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting emergency contact:', error)
    return NextResponse.json({ error: 'Failed to delete emergency contact' }, { status: 500 })
  }
}, { allowedRoles: ['employee'] })

