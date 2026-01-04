/**
 * GET /api/leaves/[id]/approval-letter
 * 
 * Generate approval letter PDF for an approved leave request
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'
import { HR_ROLES, ADMIN_ROLES, READ_ONLY_ROLES } from '@/lib/role-utils'

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'

// Generate static params for dynamic route (empty array = skip static generation)
export function generateStaticParams() {
  return [{ id: 'dummy' }]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  // During static export build, return early without accessing cookies
  const isBuild = typeof process !== 'undefined' && 
                  process.env.ELECTRON === '1' && 
                  (process.env.NEXT_PHASE === 'phase-production-build' || !globalThis.window)
  
  if (isBuild) {
    return NextResponse.json({
      error: 'Static export build - approval letter generation requires runtime',
    }, { status: 503 })
  }
  
  // At runtime, dynamically import withAuth
  const runtimeHandler = async () => {
    const { withAuth } = await import('@/lib/auth-proxy')
    return withAuth(async ({ user }: AuthContext) => {
    try {
      // Get leave request with all related data
      const leave = await prisma.leaveRequest.findUnique({
        where: { id },
        include: {
          staff: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
          approvalSteps: {
            where: {
              status: 'approved',
            },
            orderBy: {
              level: 'desc',
            },
            take: 1,
          },
        },
      })

      if (!leave) {
        return NextResponse.json(
          { error: 'Leave request not found' },
          { status: 404 }
        )
      }

      if (leave.status !== 'approved') {
        return NextResponse.json(
          { error: 'Leave request must be approved to generate approval letter' },
          { status: 400 }
        )
      }

      // Get final approver (HR Officer)
      const finalApprover = leave.approvalSteps[0]
      if (!finalApprover) {
        return NextResponse.json(
          { error: 'Approval information not found' },
          { status: 404 }
        )
      }

      // Format dates
      const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(new Date(date))
      }

      const startDate = formatDate(leave.startDate)
      const endDate = formatDate(leave.endDate)
      const approvalDate = finalApprover.approvalDate 
        ? formatDate(finalApprover.approvalDate)
        : formatDate(leave.approvalDate || leave.updatedAt)
      const resumeDate = new Date(leave.endDate.getTime() + 24 * 60 * 60 * 1000)
      const resumeDateFormatted = formatDate(resumeDate)

      // Generate PDF using jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      // Set font
      doc.setFont('times', 'normal')
      let yPosition = 20

      // Header
      doc.setFontSize(16)
      doc.setFont('times', 'bold')
      doc.text('MINISTRY OF FISHERIES AND AQUACULTURE DEVELOPMENT', 105, yPosition, { align: 'center' })
      yPosition += 8
      doc.setFontSize(12)
      doc.setFont('times', 'normal')
      doc.text('Human Resource Management Unit', 105, yPosition, { align: 'center' })
      yPosition += 6
      doc.setFont('times', 'bold')
      doc.text('Leave Approval Letter', 105, yPosition, { align: 'center' })
      yPosition += 15

      // Date
      doc.setFontSize(10)
      doc.setFont('times', 'normal')
      doc.text(`Date: ${approvalDate}`, 160, yPosition, { align: 'right' })
      yPosition += 15

      // Recipient details
      doc.setFont('times', 'normal')
      doc.text(`To: ${leave.staff.firstName} ${leave.staff.lastName}`, 20, yPosition)
      yPosition += 7
      doc.text(`Staff ID: ${leave.staff.staffId}`, 20, yPosition)
      yPosition += 7
      doc.text(`Department/Unit: ${leave.staff.unit || leave.staff.department}`, 20, yPosition)
      yPosition += 7
      doc.text(`Position: ${leave.staff.position}`, 20, yPosition)
      yPosition += 12

      // Subject
      doc.setFont('times', 'bold')
      doc.text(`Subject: Approval of ${leave.leaveType} Leave`, 20, yPosition)
      yPosition += 10

      // Body
      doc.setFont('times', 'normal')
      doc.setFontSize(11)
      const bodyText = `This letter serves to confirm that your application for ${leave.leaveType} leave has been reviewed and APPROVED by the appropriate authorities.`
      const bodyLines = doc.splitTextToSize(bodyText, 170)
      doc.text(bodyLines, 20, yPosition)
      yPosition += bodyLines.length * 7 + 8

      // Leave details box
      const detailsStartY = yPosition
      doc.setDrawColor(200, 200, 200)
      doc.setFillColor(249, 249, 249)
      doc.rect(20, yPosition - 5, 170, 30, 'FD')
      yPosition += 5
      
      doc.setFont('times', 'bold')
      doc.text('Leave Type:', 25, yPosition)
      doc.setFont('times', 'normal')
      doc.text(leave.leaveType, 70, yPosition)
      yPosition += 7

      doc.setFont('times', 'bold')
      doc.text('Start Date:', 25, yPosition)
      doc.setFont('times', 'normal')
      doc.text(startDate, 70, yPosition)
      yPosition += 7

      doc.setFont('times', 'bold')
      doc.text('End Date:', 25, yPosition)
      doc.setFont('times', 'normal')
      doc.text(endDate, 70, yPosition)
      yPosition += 7

      doc.setFont('times', 'bold')
      doc.text('Number of Days:', 25, yPosition)
      doc.setFont('times', 'normal')
      doc.text(`${leave.days} day(s)`, 70, yPosition)
      yPosition += 7

      if (leave.officerTakingOver) {
        yPosition += 2
        doc.setFont('times', 'bold')
        doc.text('Officer Taking Over:', 25, yPosition)
        doc.setFont('times', 'normal')
        doc.text(leave.officerTakingOver, 70, yPosition)
        yPosition += 7
      }

      yPosition = detailsStartY + 35

      // Approval text
      const approvalText = `You are hereby granted approval to proceed on ${leave.leaveType} leave from ${startDate} to ${endDate}, inclusive.`
      const approvalLines = doc.splitTextToSize(approvalText, 170)
      doc.text(approvalLines, 20, yPosition)
      yPosition += approvalLines.length * 7 + 8

      // Handover notes if available
      if (leave.handoverNotes) {
        doc.setFont('times', 'bold')
        doc.text('Handover Notes:', 20, yPosition)
        yPosition += 7
        doc.setFont('times', 'normal')
        const handoverLines = doc.splitTextToSize(leave.handoverNotes, 170)
        doc.text(handoverLines, 20, yPosition)
        yPosition += handoverLines.length * 7 + 8
      }

      // Resume date
      const resumeText = `Please ensure that all pending work is properly handed over before proceeding on leave. You are expected to resume duty on ${resumeDateFormatted}.`
      const resumeLines = doc.splitTextToSize(resumeText, 170)
      doc.text(resumeLines, 20, yPosition)
      yPosition += resumeLines.length * 7 + 8

      // Closing
      doc.text('We wish you a restful and productive leave period.', 20, yPosition)
      yPosition += 20

      // Signature section
      doc.setFont('times', 'bold')
      doc.text('Yours faithfully,', 20, yPosition)
      yPosition += 15

      // Signature line
      doc.setDrawColor(0, 0, 0)
      doc.line(20, yPosition, 80, yPosition)
      yPosition += 10

      doc.setFont('times', 'bold')
      doc.text(finalApprover.approverName || 'HR Officer', 20, yPosition)
      yPosition += 7
      doc.setFont('times', 'normal')
      doc.text(finalApprover.approverRole || 'HR Officer', 20, yPosition)
      yPosition += 7
      doc.text('Human Resource Management Unit', 20, yPosition)
      yPosition += 7
      doc.text('Ministry of Fisheries and Aquaculture Development', 20, yPosition)
      yPosition += 15

      // Footer
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      const footerText1 = `This is a system-generated document. For queries, please contact HR at ${leave.staff.user?.email || 'hr@mofad.gov.gh'}`
      const footerText2 = `Reference: Leave Request #${leave.id}`
      doc.text(footerText1, 105, yPosition, { align: 'center' })
      yPosition += 5
      doc.text(footerText2, 105, yPosition, { align: 'center' })

      // Generate PDF buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

      // Return PDF with proper headers
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="leave-approval-${leave.id}.pdf"`,
          'Content-Length': String(pdfBuffer.length),
        },
      })
    } catch (error: any) {
      console.error('Error generating approval letter:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to generate approval letter' },
        { status: 500 }
      )
    }
    }, { allowedRoles: [...HR_ROLES, ...ADMIN_ROLES, 'EMPLOYEE', 'employee', 'CHIEF_DIRECTOR', 'chief_director'] })(request)
  }
  
  return runtimeHandler()
}

