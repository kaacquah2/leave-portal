/**
 * Security utilities for password policy and session timeout
 */

import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  maxAge: number // Days until password expires
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90, // 90 days
}

/**
 * Validate password against policy
 */
export function validatePassword(password: string, policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`)
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Check if password has expired
 */
export async function isPasswordExpired(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordChangedAt: true, passwordExpiresAt: true },
  })

  if (!user) return false

  if (user.passwordExpiresAt) {
    return new Date() > user.passwordExpiresAt
  }

  // Calculate expiration based on passwordChangedAt
  if (user.passwordChangedAt) {
    const expirationDate = new Date(user.passwordChangedAt)
    expirationDate.setDate(expirationDate.getDate() + DEFAULT_PASSWORD_POLICY.maxAge)
    return new Date() > expirationDate
  }

  return false
}

/**
 * Check if session has timed out
 */
export async function isSessionExpired(sessionId: string): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { expiresAt: true, lastActivity: true, user: { select: { sessionTimeout: true } } },
  })

  if (!session) return true

  // Check absolute expiration
  if (new Date() > session.expiresAt) {
    return true
  }

  // Check inactivity timeout
  const timeout = session.user?.sessionTimeout || 1800 // Default 30 minutes
  const lastActivity = session.lastActivity || new Date()
  const timeoutDate = new Date(lastActivity.getTime() + timeout * 1000)

  return new Date() > timeoutDate
}

/**
 * Update session last activity
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { lastActivity: new Date() },
  })
}

/**
 * Check if account is locked
 */
export async function isAccountLocked(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lockedUntil: true },
  })

  if (!user || !user.lockedUntil) return false

  if (new Date() > user.lockedUntil) {
    // Lock has expired, unlock account
    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    })
    return false
  }

  return true
}

/**
 * Increment failed login attempts and lock account if threshold reached
 */
export async function handleFailedLogin(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginAttempts: true },
  })

  if (!user) return

  const newAttempts = (user.failedLoginAttempts || 0) + 1
  const lockThreshold = 5 // Lock after 5 failed attempts
  const lockDuration = 30 * 60 * 1000 // 30 minutes

  if (newAttempts >= lockThreshold) {
    // Lock account
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newAttempts,
        lockedUntil: new Date(Date.now() + lockDuration),
      },
    })
  } else {
    // Just increment attempts
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newAttempts,
      },
    })
  }
}

/**
 * Reset failed login attempts on successful login
 */
export async function resetFailedLoginAttempts(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLogin: new Date(),
    },
  })
}

