/**
 * Authentication Module Barrel Export
 * 
 * Centralized exports for all authentication-related functionality.
 * Import from this file for cleaner imports.
 */

// Core auth utilities (server-side)
export {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  createSession,
  deleteSession,
  getUserFromToken,
  getTokenFromRequest,
  generateResetToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
  markPasswordResetTokenAsUsed,
  getServerSession,
  authOptions,
} from './auth'

// Client-side auth utilities
export {
  logout,
  getCurrentUser,
  checkCookieExists,
} from './auth-client'

// API route protection
export {
  withAuth,
  type AuthHandler,
  type AuthContext,
  type AuthOptions,
  type ApiResponse,
  isAdmin,
  isHR,
  isHROfficer,
  isHRDirector,
  isEmployee,
  isManager,
  isChiefDirector,
  isAuditor,
  addCorsHeaders,
  handleCorsPreflight,
} from './auth-proxy'

// Edge-compatible auth (for middleware)
// IMPORTANT: For Edge Runtime (middleware.ts), import directly from './auth-edge'
// to avoid pulling in Prisma dependencies. Do NOT import from this barrel file in Edge Runtime.
export {
  verifyToken as verifyTokenEdge,
  getTokenFromRequest as getTokenFromRequestEdge,
  getUserFromToken as getUserFromTokenEdge,
} from './auth-edge'

// Types
export type { AuthUser, Session } from '../types/auth'

