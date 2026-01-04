/**
 * POST /api/reports/export
 * 
 * Export reports in various formats (PDF, Excel, CSV)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'
import { jsPDF } from 'jspdf'

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export async function POST(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const body = await request.json()
      const { format, reportType, startDate, endDate, department, columns, filters } = body

      if (!format || !reportType) {
        return NextResponse.json(
          { error: 'format and reportType are required' },
          { status: 400 }
        )
      }

      const where: any = filters || {}

      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) {
          where.createdAt.gte = new Date(startDate)
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate)
        }
      }

      // Department filter
      if (department && department !== 'all') {
        where.staff = {
          department,
        }
      }

      // Fetch data based on report type
      let data: any[] = []
      let headers: string[] = []

      if (reportType === 'leave-requests') {
        const leaves = await prisma.leaveRequest.findMany({
          where,
          include: {
            staff: {
              select: {
                staffId: true,
                firstName: true,
                lastName: true,
                department: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })

        data = leaves.map((leave) => ({
          'Staff ID': leave.staffId,
          'Staff Name': `${leave.staff?.firstName || ''} ${leave.staff?.lastName || ''}`.trim(),
          'Department': leave.staff?.department || '',
          'Email': leave.staff?.email || '',
          'Leave Type': leave.leaveType,
          'Start Date': leave.startDate.toISOString().split('T')[0],
          'End Date': leave.endDate.toISOString().split('T')[0],
          'Days': leave.days,
          'Status': leave.status,
          'Reason': leave.reason,
          'Created At': leave.createdAt.toISOString().split('T')[0],
          'Approved By': leave.approvedBy || '',
          'Approval Date': leave.approvalDate ? leave.approvalDate.toISOString().split('T')[0] : '',
        }))

        headers = columns?.map((col: any) => col.label) || Object.keys(data[0] || {})
      }

      if (format === 'excel') {
        // Generate Excel file
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Report')

        // Add headers
        if (headers.length > 0) {
          worksheet.addRow(headers)
          worksheet.getRow(1).font = { bold: true }
        }

        // Add data
        data.forEach((row) => {
          const values = headers.map((header) => row[header] || '')
          worksheet.addRow(values)
        })

        // Auto-fit columns
        worksheet.columns.forEach((column) => {
          if (column.header) {
            column.width = 15
          }
        })

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer()

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="report_${Date.now()}.xlsx"`,
          },
        })
      } else if (format === 'pdf') {
        // Generate PDF
        const doc = new jsPDF()
        let y = 20

        // Add title
        doc.setFontSize(16)
        doc.text('Leave Requests Report', 14, y)
        y += 10

        // Add date range if provided
        if (startDate || endDate) {
          doc.setFontSize(10)
          doc.text(
            `Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}`,
            14,
            y
          )
          y += 10
        }

        // Add table headers
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        let x = 14
        headers.slice(0, 5).forEach((header, index) => {
          doc.text(header, x, y)
          x += 35
        })
        y += 8

        // Add data rows
        doc.setFont('helvetica', 'normal')
        data.slice(0, 20).forEach((row) => {
          if (y > 280) {
            doc.addPage()
            y = 20
          }
          x = 14
          headers.slice(0, 5).forEach((header) => {
            const value = String(row[header] || '').substring(0, 20)
            doc.text(value, x, y)
            x += 35
          })
          y += 8
        })

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="report_${Date.now()}.pdf"`,
          },
        })
      } else if (format === 'csv') {
        // Generate CSV
        const csvHeaders = headers.join(',')
        const csvRows = data.map((row) =>
          headers.map((header) => {
            const value = String(row[header] || '').replace(/"/g, '""')
            return `"${value}"`
          }).join(',')
        )
        const csv = [csvHeaders, ...csvRows].join('\n')

        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="report_${Date.now()}.csv"`,
          },
        })
      } else {
        return NextResponse.json(
          { error: 'Unsupported format. Use excel, pdf, or csv' },
          { status: 400 }
        )
      }
    } catch (error: any) {
      console.error('Error exporting report:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to export report' },
        { status: 500 }
      )
    }
  })(request)
}

