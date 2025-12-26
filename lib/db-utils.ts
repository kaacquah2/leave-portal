/**
 * Database utility functions for connection diagnostics and error handling
 */

import { prisma } from './prisma'

/**
 * Test database connection
 * @returns Promise<boolean> - true if connection is successful
 */
export async function testDatabaseConnection(): Promise<{
  connected: boolean
  error?: string
  details?: string
}> {
  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`
    return { connected: true }
  } catch (error: any) {
    let errorMessage = 'Unknown database error'
    let details = ''

    // Check for DNS/network errors
    if (error?.code === 'ENOTFOUND' || error?.message?.includes('ENOTFOUND')) {
      errorMessage = 'DNS resolution failed'
      details = 'Unable to resolve database hostname. Check your network connection and DNS settings.'
    } else if (error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Connection refused'
      details = 'The database server refused the connection. Check if the database is running and accessible.'
    } else if (error?.code === 'ETIMEDOUT' || error?.message?.includes('ETIMEDOUT')) {
      errorMessage = 'Connection timeout'
      details = 'The connection to the database timed out. Check your network connection and firewall settings.'
    } else if (error?.name === 'PrismaClientInitializationError') {
      errorMessage = 'Prisma initialization error'
      details = error?.message || 'Failed to initialize Prisma client.'
    } else if (error?.message) {
      errorMessage = error.message
      details = error.toString()
    }

    return {
      connected: false,
      error: errorMessage,
      details,
    }
  }
}

/**
 * Check if error is a database connection error
 */
export function isDatabaseConnectionError(error: any): boolean {
  if (!error) return false

  const errorString = error.toString().toLowerCase()
  const errorCode = error?.code
  const errorMessage = error?.message?.toLowerCase() || ''

  return (
    errorCode === 'ENOTFOUND' ||
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'ETIMEDOUT' ||
    error?.name === 'PrismaClientInitializationError' ||
    errorString.includes('enotfound') ||
    errorString.includes('econnrefused') ||
    errorString.includes('etimedout') ||
    errorString.includes('getaddrinfo') ||
    errorMessage.includes('can\'t reach database server') ||
    errorMessage.includes('database server')
  )
}

/**
 * Get user-friendly error message for database connection errors
 */
export function getDatabaseErrorMessage(error: any): {
  message: string
  details?: string
  statusCode: number
} {
  if (!isDatabaseConnectionError(error)) {
    return {
      message: 'Database error occurred',
      statusCode: 500,
    }
  }

  if (error?.code === 'ENOTFOUND' || error?.message?.includes('ENOTFOUND')) {
    return {
      message: 'Database connection failed',
      details: 'Unable to resolve database hostname. Please check your network connection and database configuration.',
      statusCode: 503,
    }
  }

  if (error?.code === 'ECONNREFUSED') {
    return {
      message: 'Database connection refused',
      details: 'The database server refused the connection. Please check if the database is running and accessible.',
      statusCode: 503,
    }
  }

  if (error?.code === 'ETIMEDOUT') {
    return {
      message: 'Database connection timeout',
      details: 'The connection to the database timed out. Please check your network connection.',
      statusCode: 503,
    }
  }

  if (error?.name === 'PrismaClientInitializationError') {
    return {
      message: 'Database initialization error',
      details: 'Failed to initialize database connection. Please check your database configuration.',
      statusCode: 503,
    }
  }

  return {
    message: 'Database connection error',
    details: 'Unable to connect to the database. Please try again later.',
    statusCode: 503,
  }
}

