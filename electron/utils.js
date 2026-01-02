/**
 * Shared utilities for Electron application
 */

/**
 * Detect if running in development mode
 * @returns {boolean}
 */
function isDev() {
  try {
    return require('electron-is-dev');
  } catch (e) {
    return process.env.NODE_ENV === 'development';
  }
}

/**
 * Resolve API URL from environment variables
 * Priority: ELECTRON_API_URL > NEXT_PUBLIC_API_URL > ELECTRON_DEFAULT_API_URL > hardcoded default
 * @param {string} defaultUrl - Default URL for production (fallback if no env vars set)
 * @returns {string}
 */
function resolveApiUrl(defaultUrl = 'https://hr-leave-portal.vercel.app') {
  const dev = isDev();
  // Use ELECTRON_DEFAULT_API_URL if set, otherwise use hardcoded default
  const effectiveDefault = process.env.ELECTRON_DEFAULT_API_URL || defaultUrl;
  const apiUrl = process.env.ELECTRON_API_URL || 
                 process.env.NEXT_PUBLIC_API_URL || 
                 (dev ? 'http://localhost:3000' : effectiveDefault);
  return apiUrl ? apiUrl.replace(/\/$/, '') : '';
}

module.exports = {
  isDev,
  resolveApiUrl,
};

