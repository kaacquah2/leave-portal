// Client-side stub for Prisma
// This file is used as a replacement for lib/prisma.ts in client bundles
// Prisma should never be used in client-side code

export const prisma = null as any

if (typeof window !== 'undefined') {
  console.warn('Prisma Client is not available in client-side code. This should never happen.')
}

