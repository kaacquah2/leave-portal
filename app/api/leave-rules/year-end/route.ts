import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { processYearEndForAllStaff, processYearEndLeave, type YearEndProcessingResult } from '@/lib/leave-rules'

// POST process year-end leave for all staff or specific staff
export const POST = withAuth(async ({ user, request }: AuthContext): Promise<NextResponse<YearEndProcessingResult | { message: string; results: YearEndProcessingResult[] } | { error: string }>> => {
  try {
    // Only HR and Admin can process year-end leave
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only HR and Admin can process year-end leave' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { staffId, processAll } = body

    if (processAll) {
      // Process for all staff
      const results = await processYearEndForAllStaff()

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'YEAR_END_LEAVE_PROCESSED',
          user: user.email || 'system',
          details: `Year-end leave processing completed for ${results.length} staff members`,
        },
      })

      return NextResponse.json({
        message: `Year-end processing completed for ${results.length} staff members`,
        results,
      })
    } else if (staffId) {
      // Process for specific staff
      const result = await processYearEndLeave(staffId)

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'YEAR_END_LEAVE_PROCESSED',
          user: user.email || 'system',
          staffId,
          details: `Year-end leave processing completed for staff ${staffId}`,
        },
      })

      return NextResponse.json(result)
    } else {
      return NextResponse.json(
        { error: 'Either staffId or processAll must be provided' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error processing year-end leave:', error)
    return NextResponse.json(
      { error: 'Failed to process year-end leave' },
      { status: 500 }
    )
  }
}, { allowedRoles: ['hr', 'admin'] })

