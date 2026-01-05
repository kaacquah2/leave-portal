import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/auth'
import { calculateLeaveDays } from '@/lib/leave-calculation-utils'
import { READ_ONLY_ROLES } from '@/lib/roles'

// Force static export configuration (required for static export mode)

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export async function GET(request: NextRequest) {
  return withAuth(async ({ user }: AuthContext) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const startDateStr = searchParams.get('startDate')
      const endDateStr = searchParams.get('endDate')
      const excludeHolidays = searchParams.get('excludeHolidays') !== 'false'
      
      if (!startDateStr || !endDateStr) {
        return NextResponse.json(
          { error: 'startDate and endDate are required' },
          { status: 400 }
        )
      }
      
      const startDate = new Date(startDateStr)
      const endDate = new Date(endDateStr)
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        )
      }
      
      if (startDate > endDate) {
        return NextResponse.json(
          { error: 'Start date must be before end date' },
          { status: 400 }
        )
      }
      
      const result = await calculateLeaveDays(startDate, endDate, excludeHolidays)
      
      return NextResponse.json(result)
    } catch (error) {
      console.error('Error calculating leave days:', error)
      return NextResponse.json(
        { error: 'Failed to calculate leave days' },
        { status: 500 }
      )
    }
  }, { allowedRoles: READ_ONLY_ROLES })(request)
}

