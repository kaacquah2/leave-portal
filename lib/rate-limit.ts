/**
 * Rate Limiting Utility
 * 
 * Implements in-memory rate limiting for API endpoints
 * Uses sliding window algorithm
 */

import { NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// In production, consider using Redis for distributed systems
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  maxRequests: number // Maximum requests allowed
  windowMs: number // Time window in milliseconds
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
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const key = `${identifier}:${config.windowMs}`
  const entry = rateLimitStore.get(key)

  // If no entry exists or window has expired, create new entry
  if (!entry || entry.resetTime < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(key, newEntry)
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
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
  return checkRateLimit(identifier, config)
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

