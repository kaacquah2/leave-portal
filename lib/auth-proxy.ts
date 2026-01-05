/**
 * Re-export auth proxy from lib/auth/auth-proxy.ts
 * This file exists to maintain backward compatibility with imports like '@/lib/auth-proxy'
 */
export * from './auth/auth-proxy'
export type { AuthUser } from './types/auth'

