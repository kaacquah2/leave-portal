/**
 * Rate limiting for IPC handlers
 */

// Rate limit configurations
const RATE_LIMITS = {
  'api:login': { max: 5, window: 60000 }, // 5 per minute
  default: { max: 100, window: 60000 }     // 100 per minute
};

class RateLimiter {
  constructor() {
    this.limits = new Map();
  }

  /**
   * Check if request is within rate limit
   * @param {string} handlerName - Handler name
   * @param {object} event - IPC event
   * @param {object} logger - Logger instance
   * @returns {boolean} True if within limit
   */
  check(handlerName, event, logger) {
    const senderId = event.sender.id;
    const key = `${handlerName}:${senderId}`;
    const now = Date.now();
    
    const limitConfig = RATE_LIMITS[handlerName] || RATE_LIMITS.default;
    
    if (!this.limits.has(key)) {
      this.limits.set(key, { count: 1, resetTime: now + limitConfig.window });
      return true;
    }
    
    const limit = this.limits.get(key);
    
    // Reset if window expired
    if (now > limit.resetTime) {
      limit.count = 1;
      limit.resetTime = now + limitConfig.window;
      return true;
    }
    
    // Check if limit exceeded
    if (limit.count >= limitConfig.max) {
      logger?.warn(`[RateLimiter] Rate limit exceeded for ${handlerName} from sender ${senderId}`);
      return false;
    }
    
    limit.count++;
    return true;
  }

  /**
   * Clear all rate limits
   */
  clear() {
    this.limits.clear();
  }
}

module.exports = RateLimiter;

