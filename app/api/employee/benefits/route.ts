import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'

// GET benefits enrollment for current user
export const GET = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (!user.staffId) {
      return NextResponse.json({ error: 'Staff ID not found' }, { status: 400 })
    }

    const benefits = await prisma.systemSettings.findUnique({
      where: { key: `benefits_${user.staffId}` },
    })

    if (benefits) {
      return NextResponse.json(JSON.parse(benefits.value))
    }

    return NextResponse.json({ enrolled: [], pending: [] })
  } catch (error) {
    console.error('Error fetching benefits:', error)
    return NextResponse.json({ error: 'Failed to fetch benefits' }, { status: 500 })
  }
}, { allowedRoles: ['employee'] })

// POST enroll in or update benefits
export const POST = withAuth(async ({ user, request }: AuthContext) => {
  try {
    if (!user.staffId) {
      return NextResponse.json({ error: 'Staff ID not found' }, { status: 400 })
    }

    const body = await request.json()
    const { benefitType, action, details } = body

    if (!benefitType || !action) {
      return NextResponse.json(
        { error: 'Benefit type and action are required' },
        { status: 400 }
      )
    }

    // Get current benefits
    const currentBenefits = await prisma.systemSettings.findUnique({
      where: { key: `benefits_${user.staffId}` },
    })

    let benefitsData: any = currentBenefits
      ? JSON.parse(currentBenefits.value)
      : { enrolled: [], pending: [], history: [] }

    if (action === 'enroll') {
      // Add to pending if requires approval, otherwise to enrolled
      const requiresApproval = ['health_insurance', 'life_insurance', 'provident_fund'].includes(benefitType)
      
      if (requiresApproval) {
        benefitsData.pending = benefitsData.pending || []
        benefitsData.pending.push({
          benefitType,
          details: details || {},
          requestedAt: new Date().toISOString(),
          status: 'pending',
        })
      } else {
        benefitsData.enrolled = benefitsData.enrolled || []
        benefitsData.enrolled.push({
          benefitType,
          details: details || {},
          enrolledAt: new Date().toISOString(),
          status: 'active',
        })
      }
    } else if (action === 'update') {
      // Update existing enrollment
      const enrolledIndex = benefitsData.enrolled?.findIndex(
        (b: any) => b.benefitType === benefitType
      )
      if (enrolledIndex >= 0) {
        benefitsData.enrolled[enrolledIndex] = {
          ...benefitsData.enrolled[enrolledIndex],
          ...details,
          updatedAt: new Date().toISOString(),
        }
      }
    } else if (action === 'cancel') {
      // Remove from enrolled
      benefitsData.enrolled = benefitsData.enrolled?.filter(
        (b: any) => b.benefitType !== benefitType
      ) || []
      
      // Add to history
      benefitsData.history = benefitsData.history || []
      benefitsData.history.push({
        benefitType,
        action: 'cancelled',
        cancelledAt: new Date().toISOString(),
      })
    }

    await prisma.systemSettings.upsert({
      where: { key: `benefits_${user.staffId}` },
      update: {
        value: JSON.stringify(benefitsData),
        type: 'json',
        category: 'employee',
        updatedBy: user.email || 'system',
      },
      create: {
        key: `benefits_${user.staffId}`,
        value: JSON.stringify(benefitsData),
        type: 'json',
        category: 'employee',
        description: 'Employee benefits enrollment',
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'BENEFITS_UPDATED',
        user: user.email || 'system',
        staffId: user.staffId,
        details: `${action} ${benefitType}`,
      },
    })

    return NextResponse.json({ success: true, benefits: benefitsData })
  } catch (error) {
    console.error('Error updating benefits:', error)
    return NextResponse.json({ error: 'Failed to update benefits' }, { status: 500 })
  }
}, { allowedRoles: ['employee'] })

