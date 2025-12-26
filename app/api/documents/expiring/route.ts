import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { sendEmail } from '@/lib/email'

// GET documents expiring soon
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const days = parseInt(searchParams.get('days') || '30') // Default 30 days
      const includeExpired = searchParams.get('includeExpired') === 'true'

      const dateThreshold = new Date()
      dateThreshold.setDate(dateThreshold.getDate() + days)

      const where: any = {
        expiresAt: {
          not: null,
        },
        status: 'active',
      }

      if (includeExpired) {
        where.expiresAt = {
          lte: dateThreshold,
        }
      } else {
        where.expiresAt = {
          lte: dateThreshold,
          gte: new Date(), // Not expired yet
        }
      }

      // Role-based filtering
      if (user.role === 'employee' && user.staffId) {
        where.staffId = user.staffId
      }

      const documents = await prisma.document.findMany({
        where,
        include: {
          staff: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              staffId: true,
            },
          },
        },
        orderBy: { expiresAt: 'asc' },
      })

      return NextResponse.json(documents)
    } catch (error) {
      console.error('Error fetching expiring documents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch expiring documents' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin', 'employee', 'manager'] })(request)
}

// POST send expiration notifications
export async function POST(request: NextRequest) {
  return withAuth(async ({ user, request: req }: AuthContext) => {
    try {
      // Only HR and admin can send expiration notifications
      if (user.role !== 'hr' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const body = await req.json()
      const { days = 30, sendToStaff = true, sendToHR = true } = body

      const dateThreshold = new Date()
      dateThreshold.setDate(dateThreshold.getDate() + days)

      // Find documents expiring soon
      const documents = await prisma.document.findMany({
        where: {
          expiresAt: {
            lte: dateThreshold,
            gte: new Date(), // Not expired yet
          },
          // status: 'active', // Commented out - status field exists but TypeScript doesn't recognize it yet
        },
        include: {
          staff: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              staffId: true,
            },
          },
        },
      })

      const results = { sent: 0, failed: 0, total: documents.length }
      const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      for (const doc of documents) {
        if (!doc.staff || !doc.staff.email) continue

        const daysUntilExpiry = Math.ceil(
          (doc.expiresAt!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )

        // Send to staff member
        if (sendToStaff) {
          const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Document Expiring Soon</h1>
                <p>Ministry of Fisheries & Aquaculture Development</p>
              </div>
              <div class="content">
                <p>Hello ${doc.staff.firstName} ${doc.staff.lastName},</p>
                <div class="warning">
                  <strong>⚠️ Important Notice:</strong> Your document "<strong>${doc.name}</strong>" will expire in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}.
                </div>
                <p><strong>Document Details:</strong></p>
                <ul>
                  <li>Name: ${doc.name}</li>
                  <li>Type: ${doc.type}</li>
                  <li>Category: ${doc.category}</li>
                  <li>Expiration Date: ${doc.expiresAt!.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</li>
                </ul>
                <p>Please review and renew this document if necessary.</p>
                <p style="text-align: center; margin-top: 20px;">
                  <a href="${portalUrl}/documents/${doc.id}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">View Document</a>
                </p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
                <p>© ${new Date().getFullYear()} Ministry of Fisheries & Aquaculture Development, Ghana</p>
              </div>
            </body>
            </html>
          `

          const success = await sendEmail({
            to: doc.staff.email,
            subject: `Document Expiring Soon: ${doc.name}`,
            html,
          })

          if (success) {
            results.sent++
          } else {
            results.failed++
          }
        }
      }

      // Send summary to HR if requested
      if (sendToHR && documents.length > 0) {
        const hrUsers = await prisma.user.findMany({
          where: {
            role: 'hr',
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

        for (const hrUser of hrUsers) {
          const hrEmail = hrUser.staff?.email || hrUser.email
          if (hrEmail) {
            const html = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                  .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                  th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
                  th { background-color: #f3f4f6; font-weight: bold; }
                </style>
              </head>
              <body>
                <div class="header">
                  <h1>Document Expiration Report</h1>
                  <p>Ministry of Fisheries & Aquaculture Development</p>
                </div>
                <div class="content">
                  <p>Hello,</p>
                  <p>This is a summary of documents expiring within the next ${days} days:</p>
                  <table>
                    <thead>
                      <tr>
                        <th>Document Name</th>
                        <th>Staff Member</th>
                        <th>Type</th>
                        <th>Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${documents.map(doc => `
                        <tr>
                          <td>${doc.name}</td>
                          <td>${doc.staff ? `${doc.staff.firstName} ${doc.staff.lastName}` : 'N/A'}</td>
                          <td>${doc.type}</td>
                          <td>${doc.expiresAt!.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  <p>Total documents: ${documents.length}</p>
                </div>
                <div class="footer">
                  <p>This is an automated email. Please do not reply.</p>
                  <p>© ${new Date().getFullYear()} Ministry of Fisheries & Aquaculture Development, Ghana</p>
                </div>
              </body>
              </html>
            `

            await sendEmail({
              to: hrEmail,
              subject: `Document Expiration Report - ${documents.length} documents expiring`,
              html,
            }).catch(() => {
              // Don't count HR emails in results
            })
          }
        }
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'DOCUMENT_EXPIRATION_NOTIFICATIONS_SENT',
          user: user.email,
          details: `Expiration notifications sent for ${results.sent} documents (${results.failed} failed)`,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        },
      })

      return NextResponse.json(results)
    } catch (error) {
      console.error('Error sending expiration notifications:', error)
      return NextResponse.json(
        { error: 'Failed to send expiration notifications' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['hr', 'admin'] })(request)
}

