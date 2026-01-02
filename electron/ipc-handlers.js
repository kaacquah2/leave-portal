/**
 * IPC handlers for Electron main process
 */

const { ipcMain } = require('electron');
const authStorage = require('./auth-storage');
const { assertApiPath } = require('./security');
const RateLimiter = require('./rate-limiter');

class IpcHandlers {
  constructor(apiBaseUrl, logger) {
    this.apiBaseUrl = apiBaseUrl;
    this.logger = logger;
    this.rateLimiter = new RateLimiter();
    
    // Metrics collection
    this.metrics = {
      requests: [],
      totalRequests: 0,
      totalErrors: 0,
      totalTime: 0,
    };
    
    // Configuration
    this.config = {
      debugMode: process.env.DEBUG_IPC === 'true' || process.env.NODE_ENV === 'development',
      enableMetrics: true,
      maxRetries: 3,
      retryDelay: 1000, // Initial delay in ms
      retryableStatusCodes: [408, 429, 500, 502, 503, 504], // Transient failures
      metricsHistorySize: 1000, // Keep last 1000 requests
    };
  }

  /**
   * Setup all IPC handlers
   */
  setup() {
    this.setupBasicHandlers();
    this.setupApiHandlers();
  }

  /**
   * Setup basic IPC handlers
   */
  setupBasicHandlers() {
    ipcMain.handle('get-version', () => {
      const { app } = require('electron');
      return app.getVersion();
    });

    ipcMain.handle('get-api-url', () => {
      return this.apiBaseUrl || null;
    });

    ipcMain.on('get-api-url-sync', (event) => {
      event.returnValue = this.apiBaseUrl || null;
    });

    ipcMain.handle('send-message', (event, message) => {
      this.logger?.info(`[IPC] Message from renderer: ${message}`);
      return { success: true, received: message };
    });
  }

  /**
   * Setup API-related IPC handlers
   */
  setupApiHandlers() {
    ipcMain.handle('api:request', async (event, path, options = {}) => {
      try {
        assertApiPath(path);
        
        if (options && typeof options !== 'object') {
          return this.errorResponse('Invalid options: must be an object', 400);
        }
        
        if (path.includes('..') || path.includes('//')) {
          return this.errorResponse('Invalid path: contains unsafe characters', 400);
        }
        
        return await this.apiRequest(path, options);
      } catch (error) {
        this.logger?.warn(`[IPC] Security: Blocked API path: ${path}`);
        return this.errorResponse(error.message || 'Unknown error', 0);
      }
    });

    ipcMain.handle('api:login', async (event, email, password) => {
      if (!this.rateLimiter.check('api:login', event, this.logger)) {
        return this.errorResponse('Too many login attempts. Please try again later.', 429);
      }
      
      try {
        // Validate inputs
        if (!email || typeof email !== 'string' || email.length > 255) {
          return this.errorResponse('Invalid email: must be a non-empty string (max 255 characters)', 400);
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return this.errorResponse('Invalid email format', 400);
        }
        
        if (!password || typeof password !== 'string' || password.length < 1 || password.length > 1000) {
          return this.errorResponse('Invalid password: must be a non-empty string (max 1000 characters)', 400);
        }
        
        const result = await this.apiRequest('/api/auth/login', {
          method: 'POST',
          body: { email, password },
        });

        // Store token if login successful
        if (result.ok && result.data?.token) {
          authStorage.setToken(result.data.token);
          this.logger?.info('[IPC] Login successful, token stored');
        }

        return result;
      } catch (error) {
        this.logger?.error(`[IPC] Login error: ${error.message}`);
        return this.errorResponse(error.message || 'Login failed', 0);
      }
    });

    ipcMain.handle('api:logout', async (event) => {
      try {
        await this.apiRequest('/api/auth/logout', { method: 'POST' });
      } catch (error) {
        // Continue even if logout request fails
      }
      authStorage.clearToken();
      this.logger?.info('[IPC] Logout successful, token cleared');
      return { success: true };
    });

    ipcMain.handle('api:getMe', async (event) => {
      try {
        return await this.apiRequest('/api/auth/me');
      } catch (error) {
        return this.errorResponse(error.message || 'Failed to get user', 0);
      }
    });

    ipcMain.handle('api:hasToken', async (event) => {
      return { hasToken: authStorage.hasToken() };
    });

    // Metrics endpoint (for debugging/monitoring)
    ipcMain.handle('api:metrics', async (event) => {
      if (!this.config.enableMetrics) {
        return { error: 'Metrics collection is disabled' };
      }
      return { success: true, metrics: this.getMetrics() };
    });

    ipcMain.handle('api:refresh', async (event) => {
      try {
        const result = await this.apiRequest('/api/auth/refresh', {
          method: 'POST',
        });

        if (result.ok && result.data?.token) {
          authStorage.setToken(result.data.token);
          this.logger?.info('[IPC] Token refreshed successfully');
        }

        return result;
      } catch (error) {
        return this.errorResponse(error.message || 'Token refresh failed', 0);
      }
    });
  }

  /**
   * Make API request with retry logic and metrics
   * @private
   */
  async apiRequest(path, options = {}) {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : this.config.maxRetries;
    let lastError = null;
    let attempt = 0;

    // Log request (if debug mode enabled)
    if (this.config.debugMode) {
      this.logRequest(requestId, path, options);
    }

    // Retry loop
    while (attempt <= maxRetries) {
      try {
        const result = await this.executeRequest(path, options, requestId);
        const duration = Date.now() - startTime;

        // Collect metrics
        if (this.config.enableMetrics) {
          this.recordMetric(path, options.method || 'GET', result.status, duration, result.ok);
        }

        // Log response (if debug mode enabled)
        if (this.config.debugMode) {
          this.logResponse(requestId, path, result, duration);
        }

        // If successful or non-retryable error, return immediately
        if (result.ok || !this.isRetryableError(result.status, result.error)) {
          return result;
        }

        // If retryable error and we have retries left, wait and retry
        if (attempt < maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt); // Exponential backoff
          this.logger?.debug(`[IPC] Retrying request ${requestId} (attempt ${attempt + 1}/${maxRetries}) after ${delay}ms`);
          await this.sleep(delay);
          attempt++;
          continue;
        }

        return result;
      } catch (error) {
        lastError = error;
        const duration = Date.now() - startTime;

        // Log error
        if (this.config.debugMode) {
          this.logger?.error(`[IPC] Request ${requestId} failed:`, error);
        }

        // If network error and we have retries left, retry
        if (this.isNetworkError(error) && attempt < maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          this.logger?.debug(`[IPC] Retrying request ${requestId} after network error (attempt ${attempt + 1}/${maxRetries})`);
          await this.sleep(delay);
          attempt++;
          continue;
        }

        // Record error metric
        if (this.config.enableMetrics) {
          this.recordMetric(path, options.method || 'GET', 0, duration, false);
        }

        return this.errorResponse(error.message || 'Request failed', 0);
      }
    }

    // All retries exhausted
    const duration = Date.now() - startTime;
    if (this.config.enableMetrics) {
      this.recordMetric(path, options.method || 'GET', 0, duration, false);
    }
    return this.errorResponse(
      lastError?.message || `Request failed after ${maxRetries} retries`,
      0
    );
  }

  /**
   * Execute a single API request
   * @private
   */
  async executeRequest(path, options = {}, requestId) {
    const token = authStorage.getToken();
    const url = path.startsWith('http') ? path : `${this.apiBaseUrl}${path}`;

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (path.includes('/api/auth/login')) {
      headers['x-request-token'] = 'true';
    }

    let body = undefined;
    if (options.body) {
      body = typeof options.body === 'string' 
        ? options.body 
        : JSON.stringify(options.body);
    }

    // Timeout handling
    const controller = new AbortController();
    const timeoutMs = options.timeout || 15000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    let response;
    try {
      response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        return this.errorResponse('Request timeout - network request took too long', 408);
      }
      throw error;
    }

    // Parse response
    let data = {};
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      data = { error: 'Invalid JSON response' };
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }

  /**
   * Check if error is retryable
   * @private
   */
  isRetryableError(status, error) {
    if (!status) return false;
    return this.config.retryableStatusCodes.includes(status);
  }

  /**
   * Check if error is a network error
   * @private
   */
  isNetworkError(error) {
    if (!error) return false;
    const networkErrors = ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED', 'NetworkError'];
    return networkErrors.some(err => error.message?.includes(err) || error.code === err);
  }

  /**
   * Sleep utility for retry delays
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log request (debug mode)
   * @private
   */
  logRequest(requestId, path, options) {
    const sanitizedOptions = { ...options };
    // Don't log sensitive data
    if (sanitizedOptions.body && typeof sanitizedOptions.body === 'object') {
      if (sanitizedOptions.body.password) {
        sanitizedOptions.body = { ...sanitizedOptions.body, password: '***' };
      }
      if (sanitizedOptions.body.token) {
        sanitizedOptions.body = { ...sanitizedOptions.body, token: '***' };
      }
    }
    this.logger?.debug(`[IPC] Request ${requestId}: ${options.method || 'GET'} ${path}`, {
      options: sanitizedOptions,
    });
  }

  /**
   * Log response (debug mode)
   * @private
   */
  logResponse(requestId, path, result, duration) {
    const sanitizedData = this.sanitizeResponseData(result.data);
    this.logger?.debug(`[IPC] Response ${requestId}: ${result.status} ${result.statusText} (${duration}ms)`, {
      path,
      status: result.status,
      ok: result.ok,
      dataSize: JSON.stringify(sanitizedData).length,
      duration,
    });
  }

  /**
   * Sanitize response data for logging (remove sensitive info)
   * @private
   */
  sanitizeResponseData(data) {
    if (!data || typeof data !== 'object') return data;
    const sanitized = { ...data };
    if (sanitized.token) sanitized.token = '***';
    if (sanitized.password) sanitized.password = '***';
    if (sanitized.accessToken) sanitized.accessToken = '***';
    if (sanitized.refreshToken) sanitized.refreshToken = '***';
    return sanitized;
  }

  /**
   * Record metrics for API call
   * @private
   */
  recordMetric(path, method, status, duration, success) {
    const metric = {
      path,
      method,
      status,
      duration,
      success,
      timestamp: Date.now(),
    };

    this.metrics.requests.push(metric);
    this.metrics.totalRequests++;
    this.metrics.totalTime += duration;

    if (!success) {
      this.metrics.totalErrors++;
    }

    // Keep only recent metrics
    if (this.metrics.requests.length > this.config.metricsHistorySize) {
      this.metrics.requests.shift();
    }
  }

  /**
   * Create error response
   * @private
   */
  errorResponse(error, status) {
    return {
      ok: false,
      error: typeof error === 'string' ? error : error.message || 'Unknown error',
      status: status || 0,
      data: null,
    };
  }

  /**
   * Get metrics summary
   * @returns {object} Metrics summary
   */
  getMetrics() {
    const recentRequests = this.metrics.requests.slice(-100); // Last 100 requests
    const avgDuration = this.metrics.totalRequests > 0
      ? Math.round(this.metrics.totalTime / this.metrics.totalRequests)
      : 0;
    const errorRate = this.metrics.totalRequests > 0
      ? (this.metrics.totalErrors / this.metrics.totalRequests * 100).toFixed(2)
      : 0;

    // Group by endpoint
    const byEndpoint = {};
    recentRequests.forEach(req => {
      const key = `${req.method} ${req.path}`;
      if (!byEndpoint[key]) {
        byEndpoint[key] = { count: 0, totalDuration: 0, errors: 0 };
      }
      byEndpoint[key].count++;
      byEndpoint[key].totalDuration += req.duration;
      if (!req.success) byEndpoint[key].errors++;
    });

    // Calculate averages per endpoint
    const endpointStats = Object.entries(byEndpoint).map(([endpoint, stats]) => ({
      endpoint,
      count: stats.count,
      avgDuration: Math.round(stats.totalDuration / stats.count),
      errorRate: (stats.errors / stats.count * 100).toFixed(2),
    }));

    return {
      totalRequests: this.metrics.totalRequests,
      totalErrors: this.metrics.totalErrors,
      errorRate: `${errorRate}%`,
      avgDuration: `${avgDuration}ms`,
      recentRequests: recentRequests.length,
      endpointStats: endpointStats.sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      requests: [],
      totalRequests: 0,
      totalErrors: 0,
      totalTime: 0,
    };
  }

  /**
   * Cleanup rate limiter and metrics
   */
  cleanup() {
    this.rateLimiter.clear();
    // Optionally reset metrics on cleanup
    // this.resetMetrics();
  }
}

module.exports = IpcHandlers;

