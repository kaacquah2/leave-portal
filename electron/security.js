/**
 * Security validation utilities
 */

// Allowed API path prefixes (security boundary)
const ALLOWED_API_PREFIXES = Object.freeze(['/api/', '/auth/']);

/**
 * Validate API path against allowlist
 * @param {string} path - API path to validate
 * @throws {Error} If path is invalid
 */
function assertApiPath(path) {
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid API path: must be a non-empty string');
  }
  
  // Normalize path
  let normalizedPath = path.trim();
  if (!normalizedPath || !normalizedPath.startsWith('/')) {
    throw new Error('Invalid API path: must start with /');
  }
  
  // Decode URL-encoded paths to prevent traversal bypass
  try {
    const decodedPath = decodeURIComponent(normalizedPath);
    
    // Check for path traversal attempts
    if (decodedPath.includes('..') || decodedPath.includes('//')) {
      throw new Error('Invalid API path: path traversal detected');
    }
    
    normalizedPath = decodedPath;
  } catch (error) {
    if (error.message.includes('path traversal')) {
      throw error;
    }
    throw new Error('Invalid API path: malformed URL encoding');
  }
  
  // Strict prefix matching
  const isValid = ALLOWED_API_PREFIXES.some(prefix => {
    if (normalizedPath.startsWith(prefix)) {
      return true;
    }
    const prefixWithoutSlash = prefix.slice(0, -1);
    return normalizedPath === prefixWithoutSlash;
  });
  
  if (!isValid) {
    throw new Error(`Invalid API path: ${normalizedPath} must start with one of ${ALLOWED_API_PREFIXES.join(', ')}`);
  }
}

/**
 * Safely open external URL with protocol validation
 * @param {string} urlString - URL to open
 * @param {object} shell - Electron shell module
 * @param {object} logger - Logger instance
 */
function safeOpenExternal(urlString, shell, logger) {
  try {
    const url = new URL(urlString);
    const allowedProtocols = ['http:', 'https:', 'mailto:'];
    if (!allowedProtocols.includes(url.protocol)) {
      logger?.warn(`[Security] Blocked unsafe protocol: ${url.protocol} from ${urlString}`);
      return;
    }
    shell.openExternal(urlString);
  } catch (error) {
    logger?.warn(`[Security] Invalid URL for external open: ${urlString}`);
  }
}

/**
 * Validate navigation URL
 * @param {string} navigationUrl - URL to validate
 * @param {boolean} isDev - Development mode flag
 * @returns {boolean} True if navigation is allowed
 */
function isNavigationAllowed(navigationUrl, isDev) {
  try {
    const parsedUrl = new URL(navigationUrl);
    
    // In production: only allow app:// protocol
    if (!isDev) {
      return parsedUrl.protocol === 'app:';
    }
    
    // In dev: allow localhost
    return parsedUrl.hostname === 'localhost';
  } catch (e) {
    return false;
  }
}

module.exports = {
  assertApiPath,
  safeOpenExternal,
  isNavigationAllowed,
  ALLOWED_API_PREFIXES,
};

