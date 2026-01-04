/**
 * In-Memory Cache Implementation
 * 
 * Provides caching functionality without external dependencies.
 * Can be upgraded to Redis later without code changes.
 * 
 * Features:
 * - TTL (Time To Live) support
 * - Automatic expiration
 * - Memory-efficient cleanup
 * - Thread-safe operations
 */

interface CacheItem<T> {
  data: T
  expiresAt: number | null
  createdAt: number
}

class InMemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly DEFAULT_TTL = 3600 // 1 hour in seconds

  constructor() {
    // Start cleanup interval (runs every 5 minutes)
    this.startCleanup()
  }

  /**
   * Start automatic cleanup of expired items
   */
  private startCleanup() {
    if (this.cleanupInterval) return

    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  /**
   * Clean up expired cache items
   */
  private cleanup() {
    const now = Date.now()
    let cleaned = 0

    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && item.expiresAt < now) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`[Cache] Cleaned up ${cleaned} expired items`)
    }
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // Check if expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  /**
   * Set value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttlSeconds?: number): boolean {
    try {
      const now = Date.now()
      const expiresAt = ttlSeconds 
        ? now + (ttlSeconds * 1000)
        : null

      this.cache.set(key, {
        data: value,
        expiresAt,
        createdAt: now,
      })

      return true
    } catch (error) {
      console.error(`[Cache] Error setting key ${key}:`, error)
      return false
    }
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Delete multiple keys matching pattern
   */
  deletePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    let deleted = 0

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        deleted++
      }
    }

    return deleted
  }

  /**
   * Check if key exists
   */
  exists(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false

    // Check if expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Get TTL for key (in seconds)
   */
  getTTL(key: string): number {
    const item = this.cache.get(key)
    if (!item) return -1

    if (!item.expiresAt) return -1 // No expiration

    const remaining = Math.floor((item.expiresAt - Date.now()) / 1000)
    return remaining > 0 ? remaining : -1
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now()
    let expired = 0
    let active = 0

    for (const item of this.cache.values()) {
      if (item.expiresAt && item.expiresAt < now) {
        expired++
      } else {
        active++
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      memoryUsage: this.estimateMemoryUsage(),
    }
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  private estimateMemoryUsage(): number {
    let size = 0
    for (const [key, item] of this.cache.entries()) {
      size += key.length * 2 // UTF-16
      size += JSON.stringify(item.data).length * 2
      size += 24 // Object overhead
    }
    return size
  }

  /**
   * Stop cleanup interval
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
  }
}

// Singleton instance
let cacheInstance: InMemoryCache | null = null

/**
 * Get cache instance (singleton)
 */
function getCacheInstance(): InMemoryCache {
  if (!cacheInstance) {
    cacheInstance = new InMemoryCache()
  }
  return cacheInstance
}

/**
 * Cache operations (in-memory)
 */
export const Cache = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    return getCacheInstance().get<T>(key)
  },

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    return getCacheInstance().set(key, value, ttlSeconds)
  },

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    return getCacheInstance().delete(key)
  },

  /**
   * Delete multiple keys matching pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    return getCacheInstance().deletePattern(pattern)
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    return getCacheInstance().exists(key)
  },

  /**
   * Get TTL for key
   */
  async getTTL(key: string): Promise<number> {
    return getCacheInstance().getTTL(key)
  },

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    getCacheInstance().clear()
  },

  /**
   * Get cache statistics
   */
  async getStats() {
    return getCacheInstance().getStats()
  },
}

/**
 * Session operations (in-memory)
 */
export class SessionStore {
  private static readonly SESSION_PREFIX = 'session:'
  private static readonly DEFAULT_TTL = 1800 // 30 minutes

  /**
   * Get session data
   */
  static async get(sessionId: string): Promise<any | null> {
    const key = `${this.SESSION_PREFIX}${sessionId}`
    return Cache.get(key)
  }

  /**
   * Set session data with TTL
   */
  static async set(sessionId: string, data: any, ttlSeconds: number = this.DEFAULT_TTL): Promise<boolean> {
    const key = `${this.SESSION_PREFIX}${sessionId}`
    return Cache.set(key, data, ttlSeconds)
  }

  /**
   * Delete session
   */
  static async delete(sessionId: string): Promise<boolean> {
    const key = `${this.SESSION_PREFIX}${sessionId}`
    return Cache.delete(key)
  }

  /**
   * Refresh session TTL
   */
  static async refresh(sessionId: string, ttlSeconds: number = this.DEFAULT_TTL): Promise<boolean> {
    const session = await this.get(sessionId)
    if (!session) return false

    return this.set(sessionId, session, ttlSeconds)
  }
}

/**
 * Rate limiting operations (in-memory)
 */
export class RateLimiter {
  private static readonly RATE_LIMIT_PREFIX = 'ratelimit:'

  /**
   * Check rate limit
   */
  static async checkLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const cacheKey = `${this.RATE_LIMIT_PREFIX}${key}`
    const now = Date.now()

    // Get current count
    const entry = await Cache.get<{ count: number; resetAt: number }>(cacheKey)

    if (!entry) {
      // First request in window
      await Cache.set(cacheKey, { count: 1, resetAt: now + windowSeconds * 1000 }, windowSeconds)
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowSeconds * 1000,
      }
    }

    // Check if window expired
    if (entry.resetAt < now) {
      // New window
      await Cache.set(cacheKey, { count: 1, resetAt: now + windowSeconds * 1000 }, windowSeconds)
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowSeconds * 1000,
      }
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      }
    }

    // Increment count
    const newCount = entry.count + 1
    await Cache.set(cacheKey, { count: newCount, resetAt: entry.resetAt }, windowSeconds)

    return {
      allowed: true,
      remaining: maxRequests - newCount,
      resetAt: entry.resetAt,
    }
  }

  /**
   * Reset rate limit
   */
  static async reset(key: string): Promise<boolean> {
    const cacheKey = `${this.RATE_LIMIT_PREFIX}${key}`
    return Cache.delete(cacheKey)
  }
}

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  // TTLs (in seconds)
  STAFF_PROFILE_TTL: 3600, // 1 hour
  LEAVE_BALANCE_TTL: 1800, // 30 minutes
  QUERY_RESULT_TTL: 300, // 5 minutes
  SESSION_TTL: 1800, // 30 minutes

  // Cache key generators
  STAFF_PROFILE_KEY: (staffId: string) => `staff:${staffId}`,
  LEAVE_BALANCE_KEY: (staffId: string) => `balance:${staffId}`,
  LEAVE_REQUEST_KEY: (leaveRequestId: string) => `leave:${leaveRequestId}`,
  QUERY_KEY: (query: string, params: any) => `query:${query}:${JSON.stringify(params)}`,
}

