import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { READ_ONLY_ROLES } from '@/lib/role-utils'

// Force static export configuration (required for static export mode)

// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

// PATCH mark notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {

    const notification = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (notification.userId !== user.id && notification.staffId !== user.staffId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    })

      return NextResponse.json(updated)
    } catch (error) {
      console.error('Error updating notification:', error)
      return NextResponse.json(
        { error: 'Failed to update notification' },
        { status: 500 }
      )
    }
  }, { allowedRoles: READ_ONLY_ROLES })(request)
}

// DELETE notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAuth(async ({ user }: AuthContext) => {
    try {

    const notification = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (notification.userId !== user.id && notification.staffId !== user.staffId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    await prisma.notification.delete({
      where: { id },
    })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error deleting notification:', error)
      return NextResponse.json(
        { error: 'Failed to delete notification' },
        { status: 500 }
      )
    }
  }, { allowedRoles: READ_ONLY_ROLES })(request)
}

