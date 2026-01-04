/**
 * Password Policy Enforcement
 * 
 * Implements government password policy requirements:
 * - Complexity requirements
 * - Password expiry (90 days)
 * - Password history (prevent reuse of last 5 passwords)
 * - Account lockout after failed attempts
 * 
 * Legal Reference: Government ICT Security Standards
 * 
 * @module password-policy
 */

import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { PASSWORD_POLICY } from './ghana-statutory-constants'

/**
 * Check if password meets complexity requirements
 */
export function validatePasswordComplexity(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < PASSWORD_POLICY.MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters long`)
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Check if user is a seeded/test user (exempt from password expiration)
 * 
 * Seeded users are test/demo accounts created by the seed script.
 * They are exempt from password expiration and first-login password change requirements.
 */
export function isSeededUser(email: string): boolean {
  // Seeded users have specific email patterns for testing/demo purposes
  // All comprehensive role-based seed data uses @mofa.gov.gh domain with descriptive patterns
  
  // Check if email is from mofa.gov.gh domain (all seeded users use this)
  if (!email.toLowerCase().endsWith('@mofa.gov.gh')) {
    // Check legacy mofad.gov.gh patterns
    const legacyPatterns = [
      /^employee\.legacy@mofad\.gov\.gh$/i,
      /^supervisor\.legacy@mofad\.gov\.gh$/i,
      /^manager\.legacy@mofad\.gov\.gh$/i,
      /^hr\.legacy@mofad\.gov\.gh$/i,
      /^admin\.legacy@mofad\.gov\.gh$/i,
      /^hrassistant@mofad\.gov\.gh$/i,
      /^deputydirector@mofad\.gov\.gh$/i,
    ]
    return legacyPatterns.some(pattern => pattern.test(email))
  }
  
  // All @mofa.gov.gh emails from seed data follow these patterns:
  // - Simple: employee@, supervisor@, director@, etc.
  // - Descriptive: director.ppbme@, hr.hrmd01@, unithead.policy@, etc.
  // - Comprehensive: employee.policy01@, supervisor.monitoring01@, etc.
  // - Independent units: head.audit@, head.legal@, etc.
  
  // Match common seeded user prefixes
  const seededPrefixes = [
    'employee', 'supervisor', 'unithead', 'subunithead', 'divisionhead',
    'director', 'regionalmanager', 'hrofficer', 'hrdirector', 'chiefdirector',
    'auditor', 'sysadmin', 'hr', 'head'
  ]
  
  const emailPrefix = email.toLowerCase().split('@')[0]
  return seededPrefixes.some(prefix => emailPrefix.startsWith(prefix))
}

/**
 * Check if password has expired
 * 
 * Note: Seeded users (test/demo accounts) are exempt from password expiration
 */
export async function isPasswordExpired(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordExpiresAt: true, email: true },
  })

  if (!user) {
    return false
  }

  // Seeded users are exempt from password expiration
  if (isSeededUser(user.email)) {
    return false
  }

  if (!user.passwordExpiresAt) {
    return false
  }

  return new Date() > user.passwordExpiresAt
}

/**
 * Check if password is in history (prevent reuse)
 * 
 * Note: This function should be called with the PLAIN password, not the hash.
 * The function will hash the password and compare with stored hashes.
 * 
 * @param userId - User ID
 * @param plainPassword - Plain text password to check
 * @returns True if password is in history
 */
export async function isPasswordInHistory(
  userId: string,
  plainPassword: string
): Promise<boolean> {
  const history = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: PASSWORD_POLICY.PASSWORD_HISTORY_COUNT,
  })

  // Compare plain password with each stored hash
  // bcrypt.compare will hash the plain password and compare with stored hash
  for (const entry of history) {
    try {
      const matches = await bcrypt.compare(plainPassword, entry.passwordHash)
      if (matches) {
        return true
      }
    } catch (error) {
      // If comparison fails, continue to next entry
      console.error('Error comparing password with history:', error)
    }
  }

  return false
}

/**
 * Add password to history
 */
export async function addPasswordToHistory(
  userId: string,
  passwordHash: string
): Promise<void> {
  // Add new password to history
  await prisma.passwordHistory.create({
    data: {
      userId,
      passwordHash,
    },
  })

  // Keep only last N passwords
  const allHistory = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  if (allHistory.length > PASSWORD_POLICY.PASSWORD_HISTORY_COUNT) {
    const toDelete = allHistory.slice(PASSWORD_POLICY.PASSWORD_HISTORY_COUNT)
    for (const entry of toDelete) {
      await prisma.passwordHistory.delete({
        where: { id: entry.id },
      })
    }
  }
}

/**
 * Set password expiry date
 */
export async function setPasswordExpiry(userId: string): Promise<void> {
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + PASSWORD_POLICY.MAX_AGE_DAYS)

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordExpiresAt: expiryDate,
      passwordChangedAt: new Date(),
    },
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

  if (!user || !user.lockedUntil) {
    return false
  }

  return new Date() < user.lockedUntil
}

/**
 * Lock account after failed login attempts
 */
export async function handleFailedLoginAttempt(userId: string): Promise<{
  locked: boolean
  attemptsRemaining: number
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginAttempts: true },
  })

  if (!user) {
    return { locked: false, attemptsRemaining: 0 }
  }

  const newAttempts = (user.failedLoginAttempts || 0) + 1
  const attemptsRemaining = PASSWORD_POLICY.MAX_FAILED_ATTEMPTS - newAttempts

  if (newAttempts >= PASSWORD_POLICY.MAX_FAILED_ATTEMPTS) {
    // Lock account
    const lockUntil = new Date()
    lockUntil.setMinutes(
      lockUntil.getMinutes() + PASSWORD_POLICY.LOCKOUT_DURATION_MINUTES
    )

    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newAttempts,
        lockedUntil: lockUntil,
      },
    })

    return { locked: true, attemptsRemaining: 0 }
  } else {
    // Increment failed attempts
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newAttempts,
      },
    })

    return { locked: false, attemptsRemaining }
  }
}

/**
 * Reset failed login attempts (on successful login)
 */
export async function resetFailedLoginAttempts(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  })
}

/**
 * Force password change on first login
 */
export async function requirePasswordChange(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordExpiresAt: new Date(), // Expire immediately
    },
  })
}

