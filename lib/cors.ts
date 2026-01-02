import { NextRequest, NextResponse } from 'next/server'

/**
 * CORS helper for Electron and web clients
 * 
 * Electron apps making requests from app:// or file:// protocols
 * have origin 'null', which requires explicit CORS headers.
 */
export function addCorsHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
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
    // For 'null' origin (Electron app:///file://), return 'null' explicitly
    // For same-origin (no origin header), return the request origin from URL
    let corsOrigin = origin
    if (!origin) {
      // Same-origin request - try to get origin from request URL
      try {
        const url = new URL(request.url)
        corsOrigin = url.origin
      } catch {
        corsOrigin = '*'
      }
    }
    
    response.headers.set('Access-Control-Allow-Origin', corsOrigin || '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cookie')
    // Set credentials - works with specific origins (including 'null')
    // Note: '*' cannot be used with credentials, but 'null' can
    if (corsOrigin && corsOrigin !== '*') {
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }
    response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
  }
  
  return response
}

/**
 * Handle OPTIONS preflight requests for CORS
 */
export function handleCorsPreflight(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })
    return addCorsHeaders(response, request)
  }
  return null
}

