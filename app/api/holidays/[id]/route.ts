import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { HR_ROLES, ADMIN_ROLES } from '@/lib/role-utils'

// Generate static params for dynamic route
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

// PATCH update holiday
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request }: AuthContext) => {
    try {
      const body = await request.json()
      const holiday = await prisma.holiday.update({
        where: { id },
        data: {
          ...(body.name && { name: body.name }),
          ...(body.date && { date: new Date(body.date) }),
          ...(body.type && { type: body.type }),
          ...(body.recurring !== undefined && { recurring: body.recurring }),
          ...(body.year !== undefined && { year: body.year }),
        },
      })
      return NextResponse.json(holiday)
    } catch (error) {
      console.error('Error updating holiday:', error)
      return NextResponse.json({ error: 'Failed to update holiday' }, { status: 500 })
    }
  }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES] })(request)
}

// DELETE holiday
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {
      await prisma.holiday.delete({
        where: { id },
      })
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error deleting holiday:', error)
      return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 })
    }
  }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES] })(request)
}

