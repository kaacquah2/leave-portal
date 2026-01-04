/**
 * Rate Limiting Utility
 * 
 * Implements in-memory rate limiting for API endpoints
 * Uses sliding window algorithm
 */

import { NextResponse } from 'next/server'

// Using in-memory cache for rate limiting
// Can be upgraded to Redis later without code changes
import { RateLimiter } from './cache'

export interface RateLimitConfig {
  readonly maxRequests: number // Maximum requests allowed
  readonly windowMs: number // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number // Seconds until retry is allowed
}

/**
 * Check if request should be rate limited
 * 
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const windowSeconds = Math.floor(config.windowMs / 1000)
  const result = await RateLimiter.checkLimit(identifier, config.maxRequests, windowSeconds)
  
  const retryAfter = result.allowed ? undefined : Math.ceil((result.resetAt - Date.now()) / 1000)
  
  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetTime: result.resetAt,
    retryAfter,
  }
}

/**
 * Get client identifier from request
 * Uses IP address as primary identifier
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from headers (for proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'
  
  return ip
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Authentication endpoints - stricter limits
  login: {
    maxRequests: 5, // 5 attempts
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  forgotPassword: {
    maxRequests: 3, // 3 attempts
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  resetPassword: {
    maxRequests: 5, // 5 attempts
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  register: {
    maxRequests: 3, // 3 attempts
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // General API endpoints - more lenient
  default: {
    maxRequests: 100, // 100 requests
    windowMs: 60 * 1000, // 1 minute
  },
} as const

/**
 * Rate limit middleware for Next.js API routes
 * 
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await rateLimit(request, RATE_LIMITS.login)
 *   if (!rateLimitResult.allowed) {
 *     return NextResponse.json(
 *       { error: 'Too many requests', retryAfter: rateLimitResult.retryAfter },
 *       { 
 *         status: 429,
 *         headers: {
 *           'Retry-After': String(rateLimitResult.retryAfter),
 *           'X-RateLimit-Limit': String(RATE_LIMITS.login.maxRequests),
 *           'X-RateLimit-Remaining': String(rateLimitResult.remaining),
 *           'X-RateLimit-Reset': String(rateLimitResult.resetTime),
 *         }
 *       }
 *     )
 *   }
 *   // Continue with request handling
 * }
 * ```
 */
export async function rateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const identifier = getClientIdentifier(request)
  return await checkRateLimit(identifier, config)
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(result: RateLimitResult, maxRequests: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfter || 0),
        'X-RateLimit-Limit': String(maxRequests),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
      },
    }
  )
}

