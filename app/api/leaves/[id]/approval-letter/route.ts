import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth'

// GET approval letter for a leave request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        staff: true,
      },
    })

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    // Check if user has permission to view this leave
    if (user.role === 'employee' && user.staffId !== leaveRequest.staffId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only approved leaves can have approval letters
    if (leaveRequest.status !== 'approved') {
      return NextResponse.json(
        { error: 'Approval letter is only available for approved leave requests' },
        { status: 400 }
      )
    }

    // Generate approval letter content (HTML format for PDF conversion)
    const approvalLetter = generateApprovalLetter(leaveRequest)

    return NextResponse.json({
      leaveId: leaveRequest.id,
      staffName: leaveRequest.staffName,
      leaveType: leaveRequest.leaveType,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      days: leaveRequest.days,
      approvalDate: leaveRequest.approvalDate,
      approvedBy: leaveRequest.approvedBy,
      letterContent: approvalLetter,
    })
  } catch (error) {
    console.error('Error generating approval letter:', error)
    return NextResponse.json(
      { error: 'Failed to generate approval letter' },
      { status: 500 }
    )
  }
}

function generateApprovalLetter(leaveRequest: any): string {
  const startDate = new Date(leaveRequest.startDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const endDate = new Date(leaveRequest.endDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const approvalDate = leaveRequest.approvalDate
    ? new Date(leaveRequest.approvalDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        .content {
          margin-bottom: 30px;
        }
        .signature {
          margin-top: 60px;
        }
        .date {
          text-align: right;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>MINISTRY OF FISHERIES & AQUACULTURE DEVELOPMENT</h1>
        <h2>LEAVE APPROVAL LETTER</h2>
      </div>
      
      <div class="date">
        <p>Date: ${approvalDate}</p>
      </div>
      
      <div class="content">
        <p><strong>To:</strong> ${leaveRequest.staffName}</p>
        <p><strong>Staff ID:</strong> ${leaveRequest.staffId}</p>
        <p><strong>Department:</strong> ${leaveRequest.staff?.department || 'N/A'}</p>
      </div>
      
      <div class="content">
        <p>Dear ${leaveRequest.staffName},</p>
        
        <p>This is to confirm that your application for <strong>${leaveRequest.leaveType} Leave</strong> has been approved.</p>
        
        <p><strong>Leave Details:</strong></p>
        <ul>
          <li>Leave Type: ${leaveRequest.leaveType}</li>
          <li>Start Date: ${startDate}</li>
          <li>End Date: ${endDate}</li>
          <li>Number of Days: ${leaveRequest.days} day(s)</li>
        </ul>
        
        <p>You are hereby granted permission to proceed on leave as indicated above. Please ensure that all pending work is completed and properly handed over before your departure.</p>
        
        <p>We wish you a restful and productive leave period.</p>
      </div>
      
      <div class="signature">
        <p>Yours sincerely,</p>
        <br><br>
        <p><strong>${leaveRequest.approvedBy || 'Authorized Signatory'}</strong></p>
        <p>Human Resources Department</p>
        <p>Ministry of Fisheries & Aquaculture Development</p>
      </div>
    </body>
    </html>
  `
}

