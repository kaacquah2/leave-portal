import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { randomBytes } from 'crypto'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

const JWT_EXPIRES_IN = '7d'

export interface AuthUser {
  id: string
  email: string
  role: string
  staffId?: string | null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createToken(user: AuthUser): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    role: user.role,
    staffId: user.staffId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET)

  return token
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (payload && typeof payload === 'object' && 'id' in payload && 'email' in payload && 'role' in payload) {
      return {
        id: String(payload.id),
        email: String(payload.email),
        role: String(payload.role),
        staffId: payload.staffId ? String(payload.staffId) : null,
      }
    }
    return null
  } catch (error) {
    return null
  }
}

export async function createSession(userId: string, token: string, ip?: string, userAgent?: string) {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
      ip,
      userAgent,
    },
  })
}

export async function deleteSession(token: string) {
  await prisma.session.deleteMany({
    where: { token },
  })
}

export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  const user = await verifyToken(token)
  if (!user) return null

  // Verify session exists and is valid
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    staffId: user.staffId,
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Also check cookies
  const cookies = request.headers.get('cookie')
  if (cookies) {
    const tokenMatch = cookies.match(/token=([^;]+)/)
    if (tokenMatch) {
      return tokenMatch[1]
    }
  }

  return null
}

/**
 * Generate a secure random token for password reset
 */
export function generateResetToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Create a password reset token in the database
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = generateResetToken()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 1) // Token expires in 1 hour

  // Delete any existing tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  })

  // Create new token
  await prisma.passwordResetToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  })

  return token
}

/**
 * Verify and get password reset token
 */
export async function verifyPasswordResetToken(token: string): Promise<{ userId: string } | null> {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!resetToken) {
    return null
  }

  if (resetToken.used) {
    return null
  }

  if (resetToken.expiresAt < new Date()) {
    // Token expired, delete it
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    })
    return null
  }

  return { userId: resetToken.userId }
}

/**
 * Mark password reset token as used
 */
export async function markPasswordResetTokenAsUsed(token: string) {
  await prisma.passwordResetToken.updateMany({
    where: { token },
    data: { used: true },
  })
}

