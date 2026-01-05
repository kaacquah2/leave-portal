/**
 * Pagination Utilities
 * 
 * Standardized pagination helpers for API routes
 * Ensures consistent pagination across all endpoints
 */

export interface PaginationParams {
  limit: number
  offset: number
  page?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  page?: number
  totalPages?: number
}

/**
 * Parse pagination parameters from URL search params
 * Supports both limit/offset and page-based pagination
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')
  const pageParam = searchParams.get('page')
  
  // Default to limit/offset if provided
  if (limitParam || offsetParam) {
    return {
      limit: parseInt(limitParam || '50', 10),
      offset: parseInt(offsetParam || '0', 10),
    }
  }
  
  // Fall back to page-based pagination
  if (pageParam) {
    const page = parseInt(pageParam, 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    return {
      limit,
      offset: (page - 1) * limit,
      page,
    }
  }
  
  // Default pagination
  return {
    limit: 50,
    offset: 0,
  }
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const response: PaginatedResponse<T> = {
    data,
    total,
    limit: params.limit,
    offset: params.offset,
  }
  
  if (params.page !== undefined) {
    response.page = params.page
    response.totalPages = Math.ceil(total / params.limit)
  }
  
  return response
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(params: PaginationParams): { valid: boolean; error?: string } {
  if (params.limit < 1 || params.limit > 1000) {
    return { valid: false, error: 'Limit must be between 1 and 1000' }
  }
  
  if (params.offset < 0) {
    return { valid: false, error: 'Offset must be non-negative' }
  }
  
  if (params.page !== undefined && params.page < 1) {
    return { valid: false, error: 'Page must be greater than 0' }
  }
  
  return { valid: true }
}

