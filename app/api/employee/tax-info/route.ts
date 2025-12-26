import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET tax information for current user
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (!user.staffId) {
      return NextResponse.json({ error: 'Staff ID not found' }, { status: 400 })
    }

    const taxInfo = await prisma.systemSettings.findUnique({
      where: { key: `tax_info_${user.staffId}` },
    })

    if (taxInfo) {
      return NextResponse.json(JSON.parse(taxInfo.value))
    }

    return NextResponse.json(null)
  } catch (error) {
    console.error('Error fetching tax info:', error)
    return NextResponse.json({ error: 'Failed to fetch tax information' }, { status: 500 })
  }
}, { allowedRoles: ['employee'] })

// POST create or update tax information
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (!user.staffId) {
      return NextResponse.json({ error: 'Staff ID not found' }, { status: 400 })
    }

    const body = await request.json()
    const {
      tin, // Tax Identification Number
      ssnitNumber,
      taxRelief,
      dependents,
      additionalInfo,
    } = body

    if (!tin) {
      return NextResponse.json(
        { error: 'Tax Identification Number (TIN) is required' },
        { status: 400 }
      )
    }

    const taxData = {
      tin,
      ssnitNumber: ssnitNumber || null,
      taxRelief: taxRelief || 0,
      dependents: dependents || 0,
      additionalInfo: additionalInfo || null,
      updatedAt: new Date().toISOString(),
    }

    await prisma.systemSettings.upsert({
      where: { key: `tax_info_${user.staffId}` },
      update: {
        value: JSON.stringify(taxData),
        type: 'json',
        category: 'employee',
        updatedBy: user.email || 'system',
      },
      create: {
        key: `tax_info_${user.staffId}`,
        value: JSON.stringify(taxData),
        type: 'json',
        category: 'employee',
        description: 'Employee tax information',
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'TAX_INFO_UPDATED',
        user: user.email || 'system',
        staffId: user.staffId,
        details: `Tax information updated: TIN ${tin}`,
      },
    })

    return NextResponse.json({ success: true, taxInfo: taxData })
  } catch (error) {
    console.error('Error saving tax info:', error)
    return NextResponse.json({ error: 'Failed to save tax information' }, { status: 500 })
  }
}, { allowedRoles: ['employee'] })

