/**
 * Centralized Logging Service
 * 
 * Provides structured logging with different log levels.
 * In production, logs can be sent to external services (Sentry, LogRocket, etc.)
 * 
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('User logged in', { userId: '123' })
 *   logger.error('Database error', error, { context: 'user-creation' })
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  /**
   * Format log message with context
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  /**
   * Send log to external service (Sentry, LogRocket, etc.)
   * Override this method to integrate with external logging services
   */
  private async sendToExternalService(
    level: LogLevel,
    message: string,
    error?: Error,
    context?: LogContext
  ): Promise<void> {
    // In production, you can integrate with:
    // - Sentry: Sentry.captureException(error) or Sentry.captureMessage(message)
    // - LogRocket: LogRocket.captureException(error)
    // - CloudWatch, Datadog, etc.
    
    // For now, this is a placeholder for future integration
    if (this.isProduction && error) {
      // Example: Sentry integration (uncomment when Sentry is configured)
      // if (typeof Sentry !== 'undefined') {
      //   Sentry.captureException(error, {
      //     level: level === 'error' ? 'error' : 'info',
      //     tags: context,
      //   })
      // }
    }
  }

  /**
   * Debug logs (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context))
    }
  }

  /**
   * Info logs
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment || this.isProduction) {
      console.log(this.formatMessage('info', message, context))
    }
    // In production, you might want to send info logs to external service
  }

  /**
   * Warning logs
   */
  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context))
    // Send warnings to external service in production
    if (this.isProduction) {
      this.sendToExternalService('warn', message, undefined, context).catch(() => {
        // Silently fail if external service is unavailable
      })
    }
  }

  /**
   * Error logs
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    const errorMessage = `${message}: ${errorObj.message}`
    const stack = errorObj.stack

    console.error(this.formatMessage('error', errorMessage, context))
    if (stack && this.isDevelopment) {
      console.error('Stack trace:', stack)
    }

    // Always send errors to external service in production
    if (this.isProduction) {
      this.sendToExternalService('error', message, errorObj, context).catch(() => {
        // Silently fail if external service is unavailable
      })
    }
  }

  /**
   * Log database errors with additional context
   */
  databaseError(operation: string, error: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    this.error(`Database ${operation} failed`, errorObj, {
      ...context,
      operation,
      errorType: 'database',
    })
  }

  /**
   * Log API errors with request context
   */
  apiError(
    method: string,
    path: string,
    error: Error | unknown,
    context?: LogContext
  ): void {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    this.error(`API ${method} ${path} failed`, errorObj, {
      ...context,
      method,
      path,
      errorType: 'api',
    })
  }

  /**
   * Log authentication events (without sensitive data)
   */
  authEvent(event: string, context?: LogContext): void {
    // Remove sensitive data from context
    const safeContext = { ...context }
    delete safeContext.password
    delete safeContext.token
    delete safeContext.secret

    this.info(`Auth: ${event}`, safeContext)
  }
}

// Export singleton instance
export const logger = new Logger()

// Export type for use in other files
export type { LogContext }

