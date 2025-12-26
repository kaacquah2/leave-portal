import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET bank account details for current user
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (!user.staffId) {
      return NextResponse.json({ error: 'Staff ID not found' }, { status: 400 })
    }

    // Get bank account from SystemSettings or Document table
    const bankAccount = await prisma.systemSettings.findUnique({
      where: { key: `bank_account_${user.staffId}` },
    })

    if (bankAccount) {
      return NextResponse.json(JSON.parse(bankAccount.value))
    }

    // Try Document table as fallback
    const doc = await prisma.document.findFirst({
      where: {
        staffId: user.staffId,
        category: 'bank_account',
        type: 'other',
      },
    })

    if (doc) {
      return NextResponse.json(JSON.parse(doc.fileUrl))
    }

    return NextResponse.json(null)
  } catch (error) {
    console.error('Error fetching bank account:', error)
    return NextResponse.json({ error: 'Failed to fetch bank account' }, { status: 500 })
  }
}, { allowedRoles: ['employee'] })

// POST create or update bank account
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (!user.staffId) {
      return NextResponse.json({ error: 'Staff ID not found' }, { status: 400 })
    }

    const body = await request.json()
    const { bankName, accountNumber, accountName, branch, accountType, swiftCode } = body

    if (!bankName || !accountNumber || !accountName) {
      return NextResponse.json(
        { error: 'Bank name, account number, and account name are required' },
        { status: 400 }
      )
    }

    const bankData = {
      bankName,
      accountNumber,
      accountName,
      branch: branch || null,
      accountType: accountType || 'Savings',
      swiftCode: swiftCode || null,
      updatedAt: new Date().toISOString(),
    }

    // Store in SystemSettings
    await prisma.systemSettings.upsert({
      where: { key: `bank_account_${user.staffId}` },
      update: {
        value: JSON.stringify(bankData),
        type: 'json',
        category: 'employee',
        updatedBy: user.email || 'system',
      },
      create: {
        key: `bank_account_${user.staffId}`,
        value: JSON.stringify(bankData),
        type: 'json',
        category: 'employee',
        description: 'Employee bank account details',
      },
    })

    // Also store in Document table for backup
    const existingDoc = await prisma.document.findFirst({
      where: {
        staffId: user.staffId,
        category: 'bank_account',
      },
    })
    
    if (existingDoc) {
      await prisma.document.update({
        where: { id: existingDoc.id },
        data: {
          fileUrl: JSON.stringify(bankData),
          updatedAt: new Date(),
        },
      })
    } else {
      await prisma.document.create({
        data: {
          staffId: user.staffId,
          name: 'Bank Account Details',
          type: 'other',
          category: 'bank_account',
          fileUrl: JSON.stringify(bankData),
          fileSize: 0,
          mimeType: 'application/json',
          uploadedBy: user.email || 'system',
          description: 'Bank account information',
          isPublic: false,
        },
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'BANK_ACCOUNT_UPDATED',
        user: user.email || 'system',
        staffId: user.staffId,
        details: `Bank account updated: ${bankName} - ${accountNumber}`,
      },
    })

    return NextResponse.json({ success: true, bankAccount: bankData })
  } catch (error) {
    console.error('Error saving bank account:', error)
    return NextResponse.json({ error: 'Failed to save bank account' }, { status: 500 })
  }
}, { allowedRoles: ['employee'] })

