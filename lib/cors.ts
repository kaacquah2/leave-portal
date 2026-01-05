import { NextRequest, NextResponse } from 'next/server'

/**
 * CORS helper for Electron and web clients
 * 
 * Electron apps making requests from app:// or file:// protocols
 * have origin 'null', which requires explicit CORS headers.
 * 
 * Security: Only allows specific, validated origins to prevent CORS attacks.
 */

/**
 * Get allowed origins from environment or use defaults
 * Format: comma-separated list of origins (e.g., "https://app1.com,https://app2.com")
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_CORS_ORIGINS
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim()).filter(Boolean)
  }
  
  // Default allowed origins based on environment
  const defaults: string[] = []
  
  if (process.env.NODE_ENV === 'development') {
    // Development: allow localhost and local network (with restrictions)
    defaults.push(
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost',
      'http://127.0.0.1'
    )
  }
  
  // Production: only allow specific production domains
  const productionDomain = process.env.NEXT_PUBLIC_API_URL || 'https://hr-leave-portal.vercel.app'
  if (productionDomain) {
    try {
      const url = new URL(productionDomain)
      defaults.push(url.origin)
    } catch {
      // Invalid URL, skip
    }
  }
  
  // Always allow Vercel preview deployments
  defaults.push('https://hr-leave-portal.vercel.app')
  
  return defaults
}

/**
 * Check if an origin is allowed
 * Uses strict matching to prevent CORS attacks
 */
function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  // Exact match check
  if (allowedOrigins.includes(origin)) {
    return true
  }
  
  // For development: allow localhost with any port
  if (process.env.NODE_ENV === 'development') {
    try {
      const originUrl = new URL(origin)
      if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') {
        return true
      }
    } catch {
      // Invalid URL, reject
      return false
    }
  }
  
  // For Vercel: allow any vercel.app subdomain (for preview deployments)
  try {
    const originUrl = new URL(origin)
    if (originUrl.hostname.endsWith('.vercel.app')) {
      return true
    }
  } catch {
    // Invalid URL, reject
    return false
  }
  
  return false
}

export function addCorsHeaders<T = any>(
  response: NextResponse<T> | NextResponse<{ error: string }>,
  request: NextRequest
): NextResponse<T> | NextResponse<{ error: string }> {
  const origin = request.headers.get('origin')
  const allowedOrigins = getAllowedOrigins()
  
  // Determine the appropriate CORS origin value
  let corsOrigin: string
  let allowCredentials = false
  
  // IMPORTANT: Distinguish between:
  // 1. Missing origin header (same-origin request) → origin === null
  // 2. Origin header with value "null" (file:// or app:// protocol) → origin === 'null'
  
  if (origin === null) {
    // No origin header - same-origin request (browser doesn't send Origin for same-origin)
    // Try to get origin from request URL
    try {
      const url = new URL(request.url)
      corsOrigin = url.origin
      allowCredentials = true
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[CORS] Same-origin request detected, using origin: ${corsOrigin}`)
      }
    } catch {
      // Fallback to wildcard if URL parsing fails (shouldn't happen in production)
      corsOrigin = '*'
      allowCredentials = false
      if (process.env.NODE_ENV === 'development') {
        console.warn('[CORS] Failed to parse request URL, using wildcard')
      }
    }
  } else if (origin === 'null') {
    // Origin header is the string 'null' - this is from file:// or app:// protocol (Electron)
    // We must return 'null' as the Access-Control-Allow-Origin value to match the request origin.
    // This is required by CORS spec - the header must match the request origin exactly.
    corsOrigin = 'null'
    allowCredentials = true
    
    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[CORS] Null origin detected (file:///app:// protocol), returning null as CORS origin')
    }
  } else {
    // Check if origin is allowed using strict validation
    if (isOriginAllowed(origin, allowedOrigins)) {
      // Specific allowed origin - echo it back and enable credentials
      corsOrigin = origin
      allowCredentials = true
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[CORS] Allowed origin: ${origin}`)
      }
    } else {
      // Unknown origin - reject in production, warn in development
      if (process.env.NODE_ENV === 'production') {
        // In production, reject unknown origins
        corsOrigin = 'null' // Return null to effectively block
        allowCredentials = false
        console.warn(`[CORS] Rejected origin in production: ${origin}`)
      } else {
        // In development, use wildcard but log warning
        corsOrigin = '*'
        allowCredentials = false
        console.warn(`[CORS] Unknown origin in development: ${origin}`)
      }
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

