/**
 * Shared Authentication Types
 * 
 * Centralized type definitions for authentication across the application.
 * Import from this file instead of duplicating types in individual auth modules.
 */

/**
 * Authenticated user interface
 */
export interface AuthUser {
  id: string
  email: string
  role: string
  staffId?: string | null
}

/**
 * Session interface (for next-auth compatibility)
 */
export interface Session {
  user: {
    id: string
    email: string
    role: string
    staffId?: string | null
  }
}

