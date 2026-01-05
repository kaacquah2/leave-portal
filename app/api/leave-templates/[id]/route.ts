import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth'
import { HR_ROLES, ADMIN_ROLES } from '@/lib/roles'

// Force static export configuration (required for static export mode)
// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

// PATCH update leave template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user, request }: AuthContext) => {
    try {
      const body = await request.json()
      const template = await prisma.leaveRequestTemplate.update({
        where: { id },
        data: {
          ...(body.name && { name: body.name }),
          ...(body.leaveType && { leaveType: body.leaveType }),
          ...(body.defaultDays !== undefined && { defaultDays: body.defaultDays }),
          ...(body.defaultReason && { defaultReason: body.defaultReason }),
          ...(body.department !== undefined && { department: body.department }),
          ...(body.active !== undefined && { active: body.active }),
        },
      })
      return NextResponse.json(template)
    } catch (error) {
      console.error('Error updating leave template:', error)
      return NextResponse.json({ error: 'Failed to update leave template' }, { status: 500 })
    }
  }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES] })(request)
}

