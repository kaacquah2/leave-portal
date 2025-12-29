import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-proxy'

// GET payslips - Stub endpoint (feature not yet implemented)
export async function GET(request: NextRequest) {
  return withAuth(async () => {
    // Return empty array until feature is implemented
    return NextResponse.json([])
  })(request)
}

