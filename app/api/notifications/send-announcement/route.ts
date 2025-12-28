import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { sendSystemAnnouncement } from '@/lib/email'


// POST send system announcement
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR and admin can send system announcements
      if (user.role !== 'hr' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const { title, message, recipientRoles, recipientEmails, actionUrl, actionText } = body

      if (!title || !message) {
        return NextResponse.json(
          { error: 'Title and message are required' },
          { status: 400 }
        )
      }

      // Determine recipient emails
      let emails: string[] = []

      if (recipientEmails && Array.isArray(recipientEmails) && recipientEmails.length > 0) {
        // Use provided email list
        emails = recipientEmails
      } else if (recipientRoles && Array.isArray(recipientRoles) && recipientRoles.length > 0) {
        // Fetch emails by roles
        const users = await prisma.user.findMany({
          where: {
            role: { in: recipientRoles },
            active: true,
          },
          include: {
            staff: {
              select: {
                email: true,
              },
            },
          },
        })

        emails = users
          .map((u) => u.staff?.email || u.email)
          .filter((email): email is string => !!email)
      } else {
        // Default: send to all active users
        const users = await prisma.user.findMany({
          where: {
            active: true,
          },
          include: {
            staff: {
              select: {
                email: true,
              },
            },
          },
        })

        emails = users
          .map((u) => u.staff?.email || u.email)
          .filter((email): email is string => !!email)
      }

      if (emails.length === 0) {
        return NextResponse.json(
          { error: 'No recipients found' },
          { status: 400 }
        )
      }

      // Send announcements
      const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const results = await sendSystemAnnouncement(
        title,
        message,
        emails,
        portalUrl,
        actionUrl,
        actionText
      )

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'SYSTEM_ANNOUNCEMENT_SENT',
          user: user.email,
          details: `System announcement sent: "${title}" to ${results.sent} recipients (${results.failed} failed)`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json({
        success: true,
        sent: results.sent,
        failed: results.failed,
        total: emails.length,
      })
    } catch (error) {
      console.error('Error sending system announcement:', error)
      return NextResponse.json(
        { error: 'Failed to send system announcement' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

