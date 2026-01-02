import { NextRequest, NextResponse } from 'next/server'

/**
 * CORS helper for Electron and web clients
 * 
 * Electron apps making requests from app:// or file:// protocols
 * have origin 'null', which requires explicit CORS headers.
 */
export function addCorsHeaders<T = any>(
  response: NextResponse<T> | NextResponse<{ error: string }>,
  request: NextRequest
): NextResponse<T> | NextResponse<{ error: string }> {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  // Always set CORS headers to allow cross-origin requests
  // This is especially important for Electron apps using file:// protocol (null origin)
  
  // Determine the appropriate CORS origin value
  let corsOrigin: string
  let allowCredentials = false
  
  // Check for null origin (Electron file:// or app:// protocol)
  // The browser sends the string 'null' as the origin for these protocols
  if (origin === 'null' || origin === null) {
    // For null origins (file:// or app:// protocol from Electron), we must return
    // 'null' as the Access-Control-Allow-Origin value to match the request origin.
    // This is required by CORS spec - the header must match the request origin exactly.
    // We can still allow credentials with null origin.
    corsOrigin = 'null'
    allowCredentials = true
    
    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[CORS] Null origin detected, returning null as CORS origin')
    }
  } else if (!origin) {
    // No origin header - same-origin request
    // Try to get origin from request URL
    try {
      const url = new URL(request.url)
      corsOrigin = url.origin
      allowCredentials = true
    } catch {
      // Fallback to wildcard if URL parsing fails
      corsOrigin = '*'
      allowCredentials = false
    }
  } else {
    // Check if origin is allowed
    const isAllowed = 
      origin.includes('vercel.app') || // Vercel deployments
      origin.includes('localhost') || // Development
      origin.includes('127.0.0.1') || // Development
      origin.includes('192.168.') || // Local network
      origin.includes('10.') || // Local network
      origin.startsWith('http://localhost') || // Local development
      origin.startsWith('https://hr-leave-portal.vercel.app') // Production
    
    if (isAllowed) {
      // Specific allowed origin - echo it back and enable credentials
      corsOrigin = origin
      allowCredentials = true
    } else {
      // Unknown origin - use wildcard but no credentials
      corsOrigin = '*'
      allowCredentials = false
    }
  }
  
  // Always set CORS headers (required for preflight requests to work)
  response.headers.set('Access-Control-Allow-Origin', corsOrigin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cookie, Accept')
  response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
  
  // Set credentials only for non-wildcard origins (CORS spec requirement)
  if (allowCredentials && corsOrigin !== '*') {
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  
  return response
}

/**
 * Handle OPTIONS preflight requests for CORS
 */
export function handleCorsPreflight(request: NextRequest): NextResponse<{ error: string }> | null {
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 }) as NextResponse<{ error: string }>
    return addCorsHeaders(response, request)
  }
  return null
}

