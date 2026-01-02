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
  
  // Allow requests from:
  // 1. Same origin (web browsers)
  // 2. null origin (Electron app:// and file:// protocols)
  // 3. Vercel deployment domains
  const allowedOrigins = [
    'null', // Electron app:// and file:// protocols
    'https://hr-leave-portal.vercel.app',
    'https://*.vercel.app',
  ]
  
  // Check if origin is allowed
  const isAllowed = 
    !origin || // Same-origin request (no origin header)
    origin === 'null' || // Electron app:///file:// protocols
    origin.includes('vercel.app') || // Vercel deployments
    origin.includes('localhost') || // Development
    origin.includes('127.0.0.1') // Development
  
  if (isAllowed) {
    // Set CORS headers
    // For 'null' origin (Electron app:///file://), we need special handling
    // The CORS spec doesn't allow returning 'null' as Access-Control-Allow-Origin
    // For null origins, we return '*' but cannot use credentials
    // For same-origin (no origin header), return the request origin from URL
    let corsOrigin: string
    let allowCredentials = false
    
    if (origin === 'null') {
      // For null origins (file:// protocol), use '*' but don't allow credentials
      // This is a limitation of CORS - null origins can't use credentials
      corsOrigin = '*'
      allowCredentials = false
    } else if (!origin) {
      // Same-origin request - try to get origin from request URL
      try {
        const url = new URL(request.url)
        corsOrigin = url.origin
        allowCredentials = true
      } catch {
        corsOrigin = '*'
        allowCredentials = false
      }
    } else {
      // Specific origin - allow it and enable credentials
      corsOrigin = origin
      allowCredentials = true
    }
    
    response.headers.set('Access-Control-Allow-Origin', corsOrigin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cookie')
    // Set credentials only for non-null, non-wildcard origins
    if (allowCredentials && corsOrigin !== '*') {
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }
    response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
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

