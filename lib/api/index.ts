/**
 * API Module Barrel Export
 * 
 * Centralized exports for all API-related functionality.
 * Import from this file for cleaner imports.
 */

// API configuration
export {
  isDesktop,
  isElectron,
  getApiBaseUrl,
  API_BASE_URL,
} from './api-config'

// API fetch functions (preferred)
export {
  apiFetch,
  apiFetchJson,
  apiRequest, // @deprecated - use apiFetch
  apiRequestJson, // @deprecated - use apiFetchJson
  getPendingRequestsCount,
  type ApiFetchOptions,
} from './api-fetch'

