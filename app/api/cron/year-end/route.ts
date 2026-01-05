/**
 * Year-End Processing Endpoint (DISABLED - Manual Only)
 * 
 * This endpoint is disabled. Year-end processing must be manually triggered
 * by HR Officer or HR Director through the UI at /api/leave-rules/year-end
 * 
 * Automatic year-end processing has been removed for security and control.
 * Only authorized HR personnel can initiate year-end processing.
 */

import { NextRequest, NextResponse } from 'next/server'

// Force static export configuration (required for static export mode)
export const dynamic = 'force-static'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    error: 'Automatic year-end processing is disabled',
    message: 'Year-end processing must be manually triggered by HR Officer or HR Director',
    endpoint: '/api/leave-rules/year-end',
    method: 'POST',
    note: 'This endpoint is disabled. Use the manual endpoint with proper authentication.',
  }, { status: 403 })
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    error: 'Automatic year-end processing is disabled',
    message: 'Year-end processing must be manually triggered by HR Officer or HR Director',
    endpoint: '/api/leave-rules/year-end',
    method: 'POST',
    note: 'This endpoint is disabled. Use the manual endpoint with proper authentication.',
  }, { status: 403 })
}

