import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { createHash } from 'crypto'

// POST digitally sign a document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      const body = await req.json()
      const { signatureHash, signatureData } = body

      const document = await prisma.document.findUnique({
        where: { id },
      })

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }

      // Check permissions - employees can only sign their own documents
      if (user.role === 'employee' && user.staffId !== document.staffId) {
        return NextResponse.json(
          { error: 'You can only sign your own documents' },
          { status: 403 }
        )
      }

      // Generate signature hash if not provided
      let finalHash = signatureHash
      if (!finalHash && signatureData) {
        // Create hash from signature data + document ID + timestamp
        const hashInput = `${document.id}-${signatureData}-${new Date().toISOString()}`
        finalHash = createHash('sha256').update(hashInput).digest('hex')
      }

      if (!finalHash) {
        return NextResponse.json(
          { error: 'Signature hash or signature data is required' },
          { status: 400 }
        )
      }

      // Update document with signature
      const updateData: any = {
        signedBy: user.email,
        signedAt: new Date(),
        signatureHash: finalHash,
      }
      const updated = await prisma.document.update({
        where: { id },
        data: updateData,
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'DOCUMENT_SIGNED',
          user: user.email,
          staffId: document.staffId || undefined,
          details: `Document signed: ${document.name} (Hash: ${finalHash.substring(0, 16)}...)`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json(updated)
    } catch (error) {
      console.error('Error signing document:', error)
      return NextResponse.json(
        { error: 'Failed to sign document' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })(request)
}

// GET verify document signature
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const document = await prisma.document.findUnique({
        where: { id },
        include: {
          staff: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      })

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }

      // Check permissions
      if (user.role === 'employee' && user.staffId !== document.staffId && !document.isPublic) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }

      const isSigned = !!(document as any).signatureHash && !!(document as any).signedAt
      const isValid = isSigned // In production, you'd verify the hash against the document content

      return NextResponse.json({
        isSigned,
        isValid,
        signedBy: (document as any).signedBy,
        signedAt: (document as any).signedAt?.toISOString(),
        signatureHash: (document as any).signatureHash,
        signerName: document.staff 
          ? `${document.staff.firstName} ${document.staff.lastName}`
          : (document as any).signedBy,
      })
    } catch (error) {
      console.error('Error verifying document signature:', error)
      return NextResponse.json(
        { error: 'Failed to verify document signature' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })(request)
}

