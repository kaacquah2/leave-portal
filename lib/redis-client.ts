/**
 * Redis Client Wrapper
 * 
 * Provides Redis connection and operations for caching, sessions, and job queues.
 * 
 * Usage:
 * - Caching: Store frequently accessed data
 * - Sessions: Store user sessions
 * - Rate Limiting: Distributed rate limiting
 * - Job Queue: Bull/BullMQ backend
 */

// Conditional import for Redis (optional dependency)
type RedisClientType = any

let redisClient: RedisClientType | null = null

/**
 * Get or create Redis client
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient
  }

  try {
    const { createClient } = await import('redis' as any)
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    const redisPassword = process.env.REDIS_PASSWORD

    redisClient = createClient({
    url: redisUrl,
    password: redisPassword || undefined,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            console.error('[Redis] Max reconnection attempts reached')
            return new Error('Max reconnection attempts reached')
          }
          return Math.min(retries * 100, 3000)
        },
      },
    })

    redisClient.on('error', (err: any) => {
      console.error('[Redis] Client error:', err)
    })

    redisClient.on('connect', () => {
      console.log('[Redis] Client connected')
    })

    redisClient.on('disconnect', () => {
      console.log('[Redis] Client disconnected')
    })

    await redisClient.connect()

    return redisClient
  } catch (error) {
    console.error('[Redis] Failed to initialize Redis client:', error)
    throw new Error('Redis is not available. Please install the redis package: npm install redis')
  }
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = await getRedisClient()
    await client.ping()
    return true
  } catch (error) {
    console.warn('[Redis] Not available:', error)
    return false
  }
}

/**
 * Close Redis connection
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit()
    redisClient = null
  }
}

/**
 * Cache operations
 */
export class Cache {
  /**
   * Get value from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const client = await getRedisClient()
      const value = await client.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error(`[Cache] Error getting key ${key}:`, error)
      return null
    }
  }

  /**
   * Set value in cache with TTL
   */
  static async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const client = await getRedisClient()
      const serialized = JSON.stringify(value)
      
      if (ttlSeconds) {
        await client.setEx(key, ttlSeconds, serialized)
      } else {
        await client.set(key, serialized)
      }
      
      return true
    } catch (error) {
      console.error(`[Cache] Error setting key ${key}:`, error)
      return false
    }
  }

  /**
   * Delete value from cache
   */
  static async delete(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient()
      await client.del(key)
      return true
    } catch (error) {
      console.error(`[Cache] Error deleting key ${key}:`, error)
      return false
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  static async deletePattern(pattern: string): Promise<number> {
    try {
      const client = await getRedisClient()
      const keys = await client.keys(pattern)
      if (keys.length === 0) return 0
      
      return await client.del(keys)
    } catch (error) {
      console.error(`[Cache] Error deleting pattern ${pattern}:`, error)
      return 0
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient()
      const result = await client.exists(key)
      return result === 1
    } catch (error) {
      console.error(`[Cache] Error checking key ${key}:`, error)
      return false
    }
  }

  /**
   * Get TTL for key
   */
  static async getTTL(key: string): Promise<number> {
    try {
      const client = await getRedisClient()
      return await client.ttl(key)
    } catch (error) {
      console.error(`[Cache] Error getting TTL for key ${key}:`, error)
      return -1
    }
  }
}

/**
 * Session operations
 */
export class SessionStore {
  /**
   * Get session data
   */
  static async get(sessionId: string): Promise<any | null> {
    try {
      const client = await getRedisClient()
      const key = `session:${sessionId}`
      const value = await client.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error(`[Session] Error getting session ${sessionId}:`, error)
      return null
    }
  }

  /**
   * Set session data with TTL
   */
  static async set(sessionId: string, data: any, ttlSeconds: number = 1800): Promise<boolean> {
    try {
      const client = await getRedisClient()
      const key = `session:${sessionId}`
      const serialized = JSON.stringify(data)
      await client.setEx(key, ttlSeconds, serialized)
      return true
    } catch (error) {
      console.error(`[Session] Error setting session ${sessionId}:`, error)
      return false
    }
  }

  /**
   * Delete session
   */
  static async delete(sessionId: string): Promise<boolean> {
    try {
      const client = await getRedisClient()
      const key = `session:${sessionId}`
      await client.del(key)
      return true
    } catch (error) {
      console.error(`[Session] Error deleting session ${sessionId}:`, error)
      return false
    }
  }

  /**
   * Refresh session TTL
   */
  static async refresh(sessionId: string, ttlSeconds: number = 1800): Promise<boolean> {
    try {
      const client = await getRedisClient()
      const key = `session:${sessionId}`
      await client.expire(key, ttlSeconds)
      return true
    } catch (error) {
      console.error(`[Session] Error refreshing session ${sessionId}:`, error)
      return false
    }
  }
}

/**
 * Rate limiting operations
 */
export class RateLimiter {
  /**
   * Check rate limit
   */
  static async checkLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    try {
      const client = await getRedisClient()
      const redisKey = `ratelimit:${key}`
      
      // Get current count
      const current = await client.get(redisKey)
      const count = current ? parseInt(current, 10) : 0
      
      if (count >= maxRequests) {
        const ttl = await client.ttl(redisKey)
        return {
          allowed: false,
          remaining: 0,
          resetAt: Date.now() + ttl * 1000,
        }
      }
      
      // Increment counter
      if (count === 0) {
        await client.setEx(redisKey, windowSeconds, '1')
      } else {
        await client.incr(redisKey)
      }
      
      const newCount = count + 1
      const ttl = await client.ttl(redisKey)
      
      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - newCount),
        resetAt: Date.now() + ttl * 1000,
      }
    } catch (error) {
      console.error(`[RateLimit] Error checking limit for ${key}:`, error)
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: Date.now() + windowSeconds * 1000,
      }
    }
  }

  /**
   * Reset rate limit
   */
  static async reset(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient()
      const redisKey = `ratelimit:${key}`
      await client.del(redisKey)
      return true
    } catch (error) {
      console.error(`[RateLimit] Error resetting limit for ${key}:`, error)
      return false
    }
  }
}

