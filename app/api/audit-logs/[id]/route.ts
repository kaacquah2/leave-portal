import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET single audit log
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only HR and admin can view audit logs
      if (user.role !== 'hr' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const log = await prisma.auditLog.findUnique({
        where: { id },
      })

      if (!log) {
        return NextResponse.json(
          { error: 'Audit log not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(log)
    } catch (error) {
      console.error('Error fetching audit log:', error)
      return NextResponse.json(
        { error: 'Failed to fetch audit log' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

// DELETE audit log - IMMUTABLE: Audit logs cannot be deleted
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    // Audit logs are immutable - they cannot be deleted
    return NextResponse.json(
      {
        error: 'Audit logs are immutable and cannot be deleted',
        errorCode: 'IMMUTABLE_RECORD',
        troubleshooting: [
          'Audit logs are permanent records for compliance',
          'They cannot be modified or deleted by any user',
          'Contact system administrator if you believe there is an error',
        ],
      },
      { status: 403 }
    )
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

// PATCH audit log - IMMUTABLE: Audit logs cannot be modified
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    // Audit logs are immutable - they cannot be modified
    return NextResponse.json(
      {
        error: 'Audit logs are immutable and cannot be modified',
        errorCode: 'IMMUTABLE_RECORD',
        troubleshooting: [
          'Audit logs are permanent records for compliance',
          'They cannot be modified or deleted by any user',
          'Contact system administrator if you believe there is an error',
        ],
      },
      { status: 403 }
    )
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

