import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

/**
 * External Payroll System Integration
 * This endpoint allows integration with external payroll systems via API
 */

// POST sync payroll data to external system
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { period, externalSystem, apiKey, webhookUrl } = body

    if (!period) {
      return NextResponse.json({ error: 'Period is required' }, { status: 400 })
    }

    // Get payroll data for the period
    const [month, year] = period.split('-').map(Number)
    const payslips = await prisma.payslip.findMany({
      where: {
        month: period,
        year: year,
      },
      include: {
        staff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
          },
        },
      },
    })

    // Format data for external system
    const payrollData = payslips.map((payslip) => ({
      employeeId: payslip.staff.staffId,
      employeeName: `${payslip.staff.firstName} ${payslip.staff.lastName}`,
      email: payslip.staff.email,
      department: payslip.staff.department,
      period: payslip.month,
      year: payslip.year,
      basicSalary: payslip.basicSalary,
      allowances: payslip.allowances,
      deductions: payslip.deductions,
      tax: payslip.tax,
      pension: payslip.pension,
      netSalary: payslip.netSalary,
    }))

    // If webhook URL is provided, send data to external system
    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
          },
          body: JSON.stringify({
            period,
            payrollData,
            timestamp: new Date().toISOString(),
            source: 'HR Leave Portal',
          }),
        })

        if (!response.ok) {
          throw new Error(`External system returned ${response.status}`)
        }

        const result = await response.json()

        // Create audit log
        await prisma.auditLog.create({
          data: {
            action: 'PAYROLL_EXPORTED',
            user: user.email || 'system',
            details: JSON.stringify({
              period,
              externalSystem: externalSystem || webhookUrl,
              recordsCount: payrollData.length,
              result,
            }),
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Payroll data exported successfully',
          recordsExported: payrollData.length,
          externalSystem: externalSystem || webhookUrl,
          result,
        })
      } catch (error: any) {
        console.error('Error exporting to external system:', error)
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to export to external system',
            details: error.message,
            data: payrollData, // Return data so it can be exported manually
          },
          { status: 500 }
        )
      }
    }

    // If no webhook, return formatted data for manual export
    return NextResponse.json({
      success: true,
      message: 'Payroll data formatted for export',
      recordsExported: payrollData.length,
      externalSystem: null,
      result: {
        recordsCount: payrollData.length,
        data: payrollData,
        formats: {
          json: payrollData,
          csv: convertToCSV(payrollData),
        },
      },
    })
  } catch (error) {
    console.error('Error integrating payroll:', error)
    return NextResponse.json({ error: 'Failed to integrate payroll' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin'] })

// GET fetch payroll data from external system
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const externalSystem = searchParams.get('externalSystem')
    const apiUrl = searchParams.get('apiUrl')
    const apiKey = searchParams.get('apiKey')
    const period = searchParams.get('period')

    if (!apiUrl) {
      return NextResponse.json({ error: 'API URL is required' }, { status: 400 })
    }

    try {
      const response = await fetch(`${apiUrl}${period ? `?period=${period}` : ''}`, {
        headers: {
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
      })

      if (!response.ok) {
        throw new Error(`External system returned ${response.status}`)
      }

      const data = await response.json()

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'PAYROLL_IMPORTED',
          user: user.email || 'system',
          details: JSON.stringify({
            externalSystem: externalSystem || apiUrl,
            period,
            recordsCount: Array.isArray(data) ? data.length : 1,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Payroll data imported successfully',
        data,
      })
    } catch (error: any) {
      console.error('Error importing from external system:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to import from external system',
          details: error.message,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error fetching payroll data:', error)
    return NextResponse.json({ error: 'Failed to fetch payroll data' }, { status: 500 })
  }
}, { allowedRoles: ['hr', 'admin'] })

/**
 * Convert payroll data to CSV format
 */
function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const csvRows = [headers.join(',')]

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header]
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
    })
    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
}

