import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext, isAdmin } from '@/lib/auth'
import { ADMIN_ROLES } from '@/lib/roles'

// API routes are dynamic by default - explicitly mark as dynamic to prevent prerendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET export data (CSV/JSON)
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    // Only admin can access this route
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'staff' // staff, users, leaves, policies
    const format = searchParams.get('format') || 'json' // json, csv
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let data: any[] = []

    switch (type) {
      case 'staff':
        data = await prisma.staffMember.findMany({
          where: {
            ...(startDate && endDate ? {
              createdAt: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            } : {}),
          },
          orderBy: { createdAt: 'desc' },
        })
        break
      case 'users':
        data = await prisma.user.findMany({
          include: {
            staff: {
              select: {
                staffId: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
        break
      case 'leaves':
        data = await prisma.leaveRequest.findMany({
          include: {
            staff: {
              select: {
                staffId: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          where: {
            ...(startDate && endDate ? {
              createdAt: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            } : {}),
          },
          orderBy: { createdAt: 'desc' },
        })
        break
      case 'policies':
        data = await prisma.leavePolicy.findMany({
          orderBy: { createdAt: 'desc' },
        })
        break
      default:
        return NextResponse.json(
          { error: `Invalid export type: ${type}` },
          { status: 400 }
        )
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DATA_EXPORT',
        user: user.email,
        userRole: user.role,
        details: `Exported ${type} data in ${format} format by ${user.email}`,
        timestamp: new Date(),
      },
    })

    if (format === 'csv') {
      // Convert to CSV
      if (data.length === 0) {
        return NextResponse.json({ error: 'No data to export' }, { status: 404 })
      }

      const headers = Object.keys(data[0])
      const csvRows = [
        headers.join(','),
        ...data.map(row =>
          headers.map(header => {
            const value = row[header]
            if (value === null || value === undefined) return ''
            if (typeof value === 'object') return JSON.stringify(value)
            return String(value).replace(/"/g, '""')
          }).join(',')
        ),
      ]

      const csv = csvRows.join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // JSON format
    return NextResponse.json({
      type,
      format,
      count: data.length,
      exportedAt: new Date().toISOString(),
      exportedBy: user.email,
      data,
    })
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}, { allowedRoles: ADMIN_ROLES })

