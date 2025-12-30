import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth-proxy'
import { processYearEndForAllStaff, processYearEndLeave } from '@/lib/leave-rules'
import { prisma } from '@/lib/prisma'

/**
 * Year-End Leave Processing API Endpoint
 * 
 * Processes leave carry-forward and forfeiture for all staff or single staff member.
 * Only accessible to HR roles.
 * 
 * POST /api/leave-rules/year-end
 * 
 * Body:
 *   - processAll: boolean (true = process all staff, false = process single staff)
 *   - staffId?: string (required if processAll is false)
 * 
 * Returns:
 *   - success: boolean
 *   - results: YearEndProcessingResult[]
 *   - processedAt: string (ISO date)
 */
export async function POST(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      // Only HR roles can trigger year-end processing
      const allowedRoles = [
        'HR_OFFICER',
        'HR_DIRECTOR',
        'CHIEF_DIRECTOR',
        'hr',
        'hr_officer',
        'hr_director',
        'hr_assistant',
        'chief_director'
      ]
      
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.json(
          {
            error: 'Forbidden - HR access required',
            errorCode: 'PERMISSION_DENIED',
            troubleshooting: [
              'Only HR Officers, HR Directors, and Chief Directors can process year-end leave',
              'Contact your system administrator if you need access',
            ],
          },
          { status: 403 }
        )
      }

      const body = await request.json()
      const { processAll, staffId } = body

      // Validate request body
      if (processAll === undefined) {
        return NextResponse.json(
          {
            error: 'processAll is required',
            errorCode: 'VALIDATION_ERROR',
          },
          { status: 400 }
        )
      }

      if (!processAll && !staffId) {
        return NextResponse.json(
          {
            error: 'staffId is required when processAll is false',
            errorCode: 'VALIDATION_ERROR',
          },
          { status: 400 }
        )
      }

      let results: any[] = []

      if (processAll) {
        // Process all active staff
        console.log(`[Year-End Processing] Processing all staff - Initiated by ${user.email}`)
        results = await processYearEndForAllStaff()
        console.log(`[Year-End Processing] Completed: ${results.length} staff members processed`)
      } else if (staffId) {
        // Process single staff member
        console.log(`[Year-End Processing] Processing staff ${staffId} - Initiated by ${user.email}`)
        
        // Verify staff member exists
        const staff = await prisma.staffMember.findUnique({
          where: { staffId },
          select: { staffId: true, active: true },
        })

        if (!staff) {
          return NextResponse.json(
            {
              error: `Staff member ${staffId} not found`,
              errorCode: 'STAFF_NOT_FOUND',
            },
            { status: 404 }
          )
        }

        if (!staff.active) {
          return NextResponse.json(
            {
              error: `Staff member ${staffId} is not active`,
              errorCode: 'STAFF_INACTIVE',
            },
            { status: 400 }
          )
        }

        const result = await processYearEndLeave(staffId)
        results = [result]
        console.log(`[Year-End Processing] Completed for staff ${staffId}`)
      }

      // Calculate summary statistics
      let totalCarryForward = 0
      let totalForfeited = 0

      if (results && results.length > 0) {
        results.forEach((result) => {
          if (result.results && Array.isArray(result.results)) {
            result.results.forEach((r: any) => {
              totalCarryForward += r.carryForwardDays || 0
              totalForfeited += r.forfeitedDays || 0
            })
          }
        })
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'YEAR_END_PROCESSING_COMPLETED',
          user: user.email || 'system',
          userRole: user.role,
          details: JSON.stringify({
            processedBy: user.email,
            processAll,
            staffId: processAll ? null : staffId,
            staffProcessed: results.length,
            totalCarryForward,
            totalForfeited,
            timestamp: new Date().toISOString(),
          }),
        },
      })

      return NextResponse.json({
        success: true,
        results,
        summary: {
          staffProcessed: results.length,
          totalCarryForward,
          totalForfeited,
        },
        processedAt: new Date().toISOString(),
      } as any)
    } catch (error: any) {
      console.error('[Year-End Processing] Error:', error)
      
      // Get body for error logging
      let requestBody: any = {}
      try {
        requestBody = await request.json()
      } catch {
        // Body already consumed or invalid
      }
      
      // Create error audit log
      await prisma.auditLog.create({
        data: {
          action: 'YEAR_END_PROCESSING_FAILED',
          user: user.email || 'system',
          userRole: user.role,
          details: JSON.stringify({
            error: error.message,
            processAll: requestBody?.processAll,
            staffId: requestBody?.staffId,
            timestamp: new Date().toISOString(),
          }),
        },
      })

      return NextResponse.json(
        {
          error: error.message || 'Failed to process year-end leave',
          errorCode: 'PROCESSING_ERROR',
          troubleshooting: [
            'Check that all leave policies are correctly configured',
            'Verify staff members have leave balance records',
            'Check server logs for detailed error information',
            'Contact IT support if the issue persists',
          ],
        },
        { status: 500 }
      )
    }
  }, {
    allowedRoles: [
      'HR_OFFICER',
      'HR_DIRECTOR',
      'CHIEF_DIRECTOR',
      'hr',
      'hr_officer',
      'hr_director',
      'hr_assistant',
      'chief_director'
    ]
  })(request)
}

