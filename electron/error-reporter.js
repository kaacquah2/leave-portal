/**
 * Error Reporting Service
 * 
 * Collects and reports errors to external service (e.g., Sentry)
 * Falls back to file logging if service unavailable
 */

const logger = require('./logger');
const { app } = require('electron');

let errorReporter = null;
let isInitialized = false;

/**
 * Initialize error reporter
 */
function initErrorReporter() {
  if (isInitialized) return;

  try {
    // Check if Sentry DSN is configured
    const sentryDsn = process.env.SENTRY_DSN;
    
    if (sentryDsn && !isDev()) {
      // Initialize Sentry if DSN is provided
      try {
        // Note: You'll need to install @sentry/electron
        // const Sentry = require('@sentry/electron');
        // Sentry.init({
        //   dsn: sentryDsn,
        //   environment: process.env.NODE_ENV || 'production',
        //   release: app.getVersion(),
        // });
        // errorReporter = Sentry;
        logger.info('[ErrorReporter] Sentry DSN configured but package not installed');
        logger.info('[ErrorReporter] Install @sentry/electron to enable error reporting');
      } catch (error) {
        logger.warn('[ErrorReporter] Failed to initialize Sentry:', error.message);
      }
    }

    // Setup global error handlers
    setupGlobalHandlers();
    
    isInitialized = true;
    logger.info('[ErrorReporter] Error reporter initialized');
  } catch (error) {
    logger.error('[ErrorReporter] Failed to initialize:', error);
  }
}

/**
 * Setup global error handlers
 */
function setupGlobalHandlers() {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    reportError(error, {
      type: 'uncaughtException',
      fatal: true,
    });
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    reportError(error, {
      type: 'unhandledRejection',
      fatal: false,
      promise: promise.toString(),
    });
  });
}

/**
 * Check if in development mode
 */
function isDev() {
  try {
    return require('electron-is-dev');
  } catch (e) {
    return process.env.NODE_ENV === 'development';
  }
}

/**
 * Report an error
 */
function reportError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    timestamp: new Date().toISOString(),
    version: app.getVersion(),
    platform: process.platform,
    ...context,
  };

  // Log to file
  logger.error('[ErrorReporter] Error occurred:', errorInfo);

  // Report to external service if available
  if (errorReporter) {
    try {
      errorReporter.captureException(error, {
        extra: context,
        tags: {
          platform: process.platform,
          version: app.getVersion(),
        },
      });
    } catch (err) {
      logger.warn('[ErrorReporter] Failed to report to external service:', err.message);
    }
  }

  // In development, also log to console
  if (isDev()) {
    console.error('[ErrorReporter] Error:', errorInfo);
  }
}

/**
 * Report a message (non-error)
 */
function reportMessage(message, level = 'info', context = {}) {
  const messageInfo = {
    message,
    level,
    timestamp: new Date().toISOString(),
    version: app.getVersion(),
    platform: process.platform,
    ...context,
  };

  logger.info('[ErrorReporter] Message:', messageInfo);

  if (errorReporter) {
    try {
      errorReporter.captureMessage(message, {
        level,
        extra: context,
      });
    } catch (err) {
      logger.warn('[ErrorReporter] Failed to report message:', err.message);
    }
  }
}

/**
 * Set user context for error reporting
 */
function setUserContext(userId, email, role) {
  if (errorReporter) {
    try {
      errorReporter.setUser({
        id: userId,
        email,
        role,
      });
    } catch (err) {
      logger.warn('[ErrorReporter] Failed to set user context:', err.message);
    }
  }
}

/**
 * Clear user context
 */
function clearUserContext() {
  if (errorReporter) {
    try {
      errorReporter.setUser(null);
    } catch (err) {
      logger.warn('[ErrorReporter] Failed to clear user context:', err.message);
    }
  }
}

module.exports = {
  initErrorReporter,
  reportError,
  reportMessage,
  setUserContext,
  clearUserContext,
};

