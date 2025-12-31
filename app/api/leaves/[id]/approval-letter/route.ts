/**
 * GET /api/leaves/[id]/approval-letter
 * 
 * Generate approval letter PDF for an approved leave request
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

      // Generate HTML content for the letter
      const letterContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Leave Approval Letter</title>
  <style>
    body {
      font-family: 'Times New Roman', serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .header p {
      font-size: 14px;
      margin: 5px 0;
    }
    .date {
      text-align: right;
      margin-bottom: 30px;
    }
    .content {
      margin-bottom: 30px;
    }
    .content p {
      margin-bottom: 15px;
      text-align: justify;
    }
    .details {
      margin: 30px 0;
      padding: 20px;
      background-color: #f9f9f9;
      border-left: 4px solid #2563eb;
    }
    .details table {
      width: 100%;
      border-collapse: collapse;
    }
    .details td {
      padding: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    .details td:first-child {
      font-weight: bold;
      width: 40%;
    }
    .signature {
      margin-top: 50px;
    }
    .signature-line {
      border-top: 1px solid #000;
      width: 300px;
      margin-top: 60px;
    }
    .footer {
      margin-top: 40px;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>MINISTRY OF FISHERIES AND AQUACULTURE DEVELOPMENT</h1>
    <p>Human Resource Management Unit</p>
    <p>Leave Approval Letter</p>
  </div>

  <div class="date">
    <p>Date: ${approvalDate}</p>
  </div>

  <div class="content">
    <p><strong>To:</strong> ${leave.staff.firstName} ${leave.staff.lastName}</p>
    <p><strong>Staff ID:</strong> ${leave.staff.staffId}</p>
    <p><strong>Department/Unit:</strong> ${leave.staff.unit || leave.staff.department}</p>
    <p><strong>Position:</strong> ${leave.staff.position}</p>
  </div>

  <div class="content">
    <p><strong>Subject: Approval of ${leave.leaveType} Leave</strong></p>
    
    <p>This letter serves to confirm that your application for ${leave.leaveType} leave has been reviewed and <strong>APPROVED</strong> by the appropriate authorities.</p>
    
    <div class="details">
      <table>
        <tr>
          <td>Leave Type:</td>
          <td>${leave.leaveType}</td>
        </tr>
        <tr>
          <td>Start Date:</td>
          <td>${startDate}</td>
        </tr>
        <tr>
          <td>End Date:</td>
          <td>${endDate}</td>
        </tr>
        <tr>
          <td>Number of Days:</td>
          <td>${leave.days} day(s)</td>
        </tr>
        ${leave.officerTakingOver ? `
        <tr>
          <td>Officer Taking Over:</td>
          <td>${leave.officerTakingOver}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <p>You are hereby granted approval to proceed on ${leave.leaveType} leave from ${startDate} to ${endDate}, inclusive.</p>
    
    ${leave.handoverNotes ? `
    <p><strong>Handover Notes:</strong></p>
    <p>${leave.handoverNotes}</p>
    ` : ''}

    <p>Please ensure that all pending work is properly handed over before proceeding on leave. You are expected to resume duty on ${new Date(leave.endDate.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>

    <p>We wish you a restful and productive leave period.</p>
  </div>

  <div class="signature">
    <p><strong>Yours faithfully,</strong></p>
    <div class="signature-line"></div>
    <p><strong>${finalApprover.approverName || 'HR Officer'}</strong></p>
    <p>${finalApprover.approverRole || 'HR Officer'}</p>
    <p>Human Resource Management Unit</p>
    <p>Ministry of Fisheries and Aquaculture Development</p>
  </div>

  <div class="footer">
    <p>This is a system-generated document. For queries, please contact HR at ${leave.staff.user?.email || 'hr@mofad.gov.gh'}</p>
    <p>Reference: Leave Request #${leave.id}</p>
  </div>
</body>
</html>
      `

      // Return HTML content (component will handle printing/downloading)
      return NextResponse.json({
        success: true,
        letterContent,
        leaveRequestId: leave.id,
      })
    } catch (error: any) {
      console.error('Error generating approval letter:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to generate approval letter' },
        { status: 500 }
      )
    }
  }, { allowedRoles: ['HR_OFFICER', 'HR_DIRECTOR', 'CHIEF_DIRECTOR', 'SYS_ADMIN', 'EMPLOYEE', 'hr', 'hr_officer', 'hr_director', 'chief_director', 'employee', 'admin'] })(request)
}

