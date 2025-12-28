import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { generateExcelReport } from '@/lib/report-generator'


// POST export report
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    const body = await request.json()
    const { format, reportType, startDate, endDate, department, columns, filters } = body

    // Build query filters
    const dateFilter: any = {}
    if (startDate) dateFilter.startDate = { gte: new Date(startDate) }
    if (endDate) dateFilter.startDate = { ...dateFilter.startDate, lte: new Date(endDate) }

    const staffFilter: any = {}
    if (department && department !== 'all') {
      staffFilter.department = department
    }

    let where: any = { ...dateFilter }
    if (Object.keys(staffFilter).length > 0) {
      where.staff = staffFilter
    }

    // Role-based access
    if (user.role === 'employee' && user.staffId) {
      where.staffId = user.staffId
    } else if (user.role === 'manager' && user.staffId) {
      const managerStaff = await prisma.staffMember.findUnique({
        where: { staffId: user.staffId },
        select: { department: true },
      })
      if (managerStaff) {
        where.staff = { ...where.staff, department: managerStaff.department }
      }
    }

    // Apply additional filters
    if (filters?.status) where.status = filters.status
    if (filters?.leaveType) where.leaveType = filters.leaveType

    // Fetch data based on report type
    let reportData: any = {
      title: '',
      period: startDate && endDate ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}` : 'All Time',
      generatedAt: new Date().toLocaleString(),
      data: [],
      columns: [],
      summary: {},
    }

    if (reportType === 'leave-requests') {
      const leaves = await prisma.leaveRequest.findMany({
        where,
        include: {
          staff: {
            select: {
              firstName: true,
              lastName: true,
              department: true,
              position: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      reportData.title = 'Leave Requests Report'
      reportData.columns = columns || [
        { key: 'staffName', label: 'Staff Name' },
        { key: 'department', label: 'Department' },
        { key: 'leaveType', label: 'Leave Type' },
        { key: 'startDate', label: 'Start Date' },
        { key: 'endDate', label: 'End Date' },
        { key: 'days', label: 'Days' },
        { key: 'status', label: 'Status' },
        { key: 'reason', label: 'Reason' },
      ]

      reportData.data = leaves.map((leave) => ({
        staffName: `${leave.staff.firstName} ${leave.staff.lastName}`,
        department: leave.staff.department,
        leaveType: leave.leaveType,
        startDate: leave.startDate.toLocaleDateString(),
        endDate: leave.endDate.toLocaleDateString(),
        days: leave.days,
        status: leave.status,
        reason: leave.reason,
      }))

      reportData.summary = {
        'Total Requests': leaves.length,
        'Approved': leaves.filter((l) => l.status === 'approved').length,
        'Pending': leaves.filter((l) => l.status === 'pending').length,
        'Rejected': leaves.filter((l) => l.status === 'rejected').length,
        'Total Days': leaves.filter((l) => l.status === 'approved').reduce((sum, l) => sum + l.days, 0),
      }
    } else if (reportType === 'staff-directory') {
      const staffWhere: any = { active: true }
      if (department && department !== 'all') {
        staffWhere.department = department
      }

      const staff = await prisma.staffMember.findMany({
        where: staffWhere,
        orderBy: { lastName: 'asc' },
      })

      reportData.title = 'Staff Directory Report'
      reportData.columns = columns || [
        { key: 'staffId', label: 'Staff ID' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'department', label: 'Department' },
        { key: 'position', label: 'Position' },
        { key: 'grade', label: 'Grade' },
        { key: 'joinDate', label: 'Join Date' },
      ]

      reportData.data = staff.map((s) => ({
        staffId: s.staffId,
        name: `${s.firstName} ${s.lastName}`,
        email: s.email,
        department: s.department,
        position: s.position,
        grade: s.grade,
        joinDate: s.joinDate.toLocaleDateString(),
      }))

      reportData.summary = {
        'Total Staff': staff.length,
        'Departments': new Set(staff.map((s) => s.department)).size,
      }
    } else if (reportType === 'leave-utilization') {
      const leaves = await prisma.leaveRequest.findMany({
        where: { ...where, status: 'approved' },
        include: {
          staff: {
            select: {
              firstName: true,
              lastName: true,
              department: true,
            },
          },
        },
        orderBy: { startDate: 'desc' },
      })

      reportData.title = 'Leave Utilization Report'
      reportData.columns = columns || [
        { key: 'staffName', label: 'Staff Name' },
        { key: 'department', label: 'Department' },
        { key: 'leaveType', label: 'Leave Type' },
        { key: 'startDate', label: 'Start Date' },
        { key: 'endDate', label: 'End Date' },
        { key: 'days', label: 'Days' },
      ]

      reportData.data = leaves.map((leave) => ({
        staffName: `${leave.staff.firstName} ${leave.staff.lastName}`,
        department: leave.staff.department,
        leaveType: leave.leaveType,
        startDate: leave.startDate.toLocaleDateString(),
        endDate: leave.endDate.toLocaleDateString(),
        days: leave.days,
      }))

      const totalDays = leaves.reduce((sum, l) => sum + l.days, 0)
      const byDepartment = leaves.reduce((acc: Record<string, number>, l) => {
        acc[l.staff.department] = (acc[l.staff.department] || 0) + l.days
        return acc
      }, {})

      reportData.summary = {
        'Total Days': totalDays,
        'Total Leaves': leaves.length,
        'Average Days per Leave': leaves.length > 0 ? (totalDays / leaves.length).toFixed(2) : 0,
        'Departments': Object.keys(byDepartment).length,
      }
    }

    // Generate file based on format
    if (format === 'pdf') {
      // For PDF, we'll return the data and let the client generate it
      // since jsPDF needs to run in the browser
      return NextResponse.json({
        success: true,
        reportData,
        format: 'pdf',
      })
    } else if (format === 'excel') {
      // For Excel, generate server-side using XLSX directly
      const XLSX = await import('xlsx')
      const workbook = XLSX.utils.book_new()

      // Create summary sheet if available
      if (reportData.summary) {
        const summaryData = Object.entries(reportData.summary).map(([key, value]) => ({
          Metric: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          Value: value,
        }))
        const summarySheet = XLSX.utils.json_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
      }

      // Create main data sheet
      const worksheetData = reportData.data.map((row: any) => {
        const obj: Record<string, any> = {}
        reportData.columns.forEach((col: any) => {
          obj[col.label] = row[col.key]
        })
        return obj
      })
      const worksheet = XLSX.utils.json_to_sheet(worksheetData)
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')

      // Generate buffer
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
      
      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${reportData.title.replace(/\s+/g, '_')}_${Date.now()}.xlsx"`,
        },
      })
    } else {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error exporting report:', error)
    return NextResponse.json({ error: 'Failed to export report' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin', 'manager'] })

