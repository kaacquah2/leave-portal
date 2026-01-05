/**
 * Offline Cache Storage
 * 
 * Provides cache-based storage for API responses.
 * Uses Tauri SQLite for persistence when available, falls back to IndexedDB/Storage.
 * 
 * Rules:
 * - Cache is disposable (no business logic)
 * - No schema constraints
 * - No conflict resolution
 * - Cache key = HTTP method + path + query string
 */

import { isDesktop } from './api-config';

export interface CacheEntry {
  key: string;
  method: string;
  path: string;
  response: any;
  timestamp: string;
  expiresAt?: string;
}

/**
 * Generate cache key from request
 */
function generateCacheKey(method: string, path: string, query?: string): string {
  const normalizedPath = path.replace(/\/+/g, '/').replace(/\/$/, '');
  const queryPart = query ? `?${query}` : '';
  return `${method}:${normalizedPath}${queryPart}`;
}

/**
 * Check if entry is expired
 */
function isExpired(entry: CacheEntry | null): boolean {
  if (!entry) return true;
  if (!entry.expiresAt) return false;
  return new Date(entry.expiresAt) < new Date();
}

/**
 * Get cache entry from Tauri
 */
async function getCacheEntryTauri(key: string): Promise<CacheEntry | null> {
  if (!isDesktop()) return null;
  
  try {
    const { tauriAPI } = await import('./tauri-api');
    if (tauriAPI && typeof window !== 'undefined' && '__TAURI__' in window) {
      const result = await tauriAPI.offline?.getCacheEntry(key);
      return result?.data || null;
    }
  } catch (error) {
    console.warn('[Offline Cache] Tauri cache read failed:', error);
  }
  
  return null;
}

/**
 * Set cache entry in Tauri
 */
async function setCacheEntryTauri(entry: CacheEntry): Promise<void> {
  if (!isDesktop()) return;
  
  try {
    const { tauriAPI } = await import('./tauri-api');
    if (tauriAPI && typeof window !== 'undefined' && '__TAURI__' in window) {
      await tauriAPI.offline?.setCacheEntry(entry);
    }
  } catch (error) {
    console.warn('[Offline Cache] Tauri cache write failed:', error);
  }
}

/**
 * Clear cache entry in Tauri
 */
async function clearCacheEntryTauri(key: string): Promise<void> {
  if (!isDesktop()) return;
  
  try {
    const { tauriAPI } = await import('./tauri-api');
    if (tauriAPI && typeof window !== 'undefined' && '__TAURI__' in window) {
      await tauriAPI.offline?.clearCacheEntry(key);
    }
  } catch (error) {
    console.warn('[Offline Cache] Tauri cache clear failed:', error);
  }
}

/**
 * Fallback: Use localStorage for web
 */
function getCacheEntryWeb(key: string): CacheEntry | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(`cache:${key}`);
    if (!stored) return null;
    
    const entry: CacheEntry = JSON.parse(stored);
    if (isExpired(entry)) {
      localStorage.removeItem(`cache:${key}`);
      return null;
    }
    
    return entry;
  } catch (error) {
    console.warn('[Offline Cache] Web cache read failed:', error);
    return null;
  }
}

/**
 * Fallback: Set cache entry in localStorage
 */
function setCacheEntryWeb(entry: CacheEntry): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(`cache:${entry.key}`, JSON.stringify(entry));
  } catch (error) {
    console.warn('[Offline Cache] Web cache write failed:', error);
  }
}

/**
 * Fallback: Clear cache entry from localStorage
 */
function clearCacheEntryWeb(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(`cache:${key}`);
  } catch (error) {
    console.warn('[Offline Cache] Web cache clear failed:', error);
  }
}

/**
 * Get cached response (returns response data only)
 */
export async function getCachedResponse(
  method: string,
  path: string,
  query?: string
): Promise<any | null> {
  const key = generateCacheKey(method, path, query);
  
  // Try Tauri first
  if (isDesktop()) {
    const entry = await getCacheEntryTauri(key);
    if (entry && !isExpired(entry)) {
      return entry.response;
    }
  }
  
  // Fallback to web storage
  const entry = getCacheEntryWeb(key);
  if (entry && !isExpired(entry)) {
    return entry.response;
  }
  
  return null;
}

/**
 * Get cached entry (returns full entry with metadata)
 */
export async function getCachedEntry(
  method: string,
  path: string,
  query?: string
): Promise<CacheEntry | null> {
  const key = generateCacheKey(method, path, query);
  
  // Try Tauri first
  if (isDesktop()) {
    const entry = await getCacheEntryTauri(key);
    if (entry && !isExpired(entry)) {
      return entry;
    }
  }
  
  // Fallback to web storage
  const entry = getCacheEntryWeb(key);
  if (entry && !isExpired(entry)) {
    return entry;
  }
  
  return null;
}

/**
 * Cache a response
 */
export async function cacheResponse(
  method: string,
  path: string,
  response: any,
  query?: string,
  maxAge?: number // seconds
): Promise<void> {
  // Only cache GET requests
  if (method.toUpperCase() !== 'GET') return;
  
  const key = generateCacheKey(method, path, query);
  const timestamp = new Date().toISOString();
  const expiresAt = maxAge 
    ? new Date(Date.now() + maxAge * 1000).toISOString()
    : undefined;
  
  const entry: CacheEntry = {
    key,
    method: method.toUpperCase(),
    path,
    response,
    timestamp,
    expiresAt,
  };
  
  // Try Tauri first
  if (isDesktop()) {
    await setCacheEntryTauri(entry);
  }
  
  // Also set in web storage (for fallback)
  setCacheEntryWeb(entry);
}

/**
 * Clear cached response
 */
export async function clearCachedResponse(
  method: string,
  path: string,
  query?: string
): Promise<void> {
  const key = generateCacheKey(method, path, query);
  
  if (isDesktop()) {
    await clearCacheEntryTauri(key);
  }
  
  clearCacheEntryWeb(key);
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  if (isDesktop()) {
    try {
      const { tauriAPI } = await import('./tauri-api');
      if (tauriAPI && typeof window !== 'undefined' && '__TAURI__' in window) {
        await tauriAPI.offline?.clearAllCache();
      }
    } catch (error) {
      console.warn('[Offline Cache] Tauri clear all failed:', error);
    }
  }
  
  // Clear web storage
  if (typeof window !== 'undefined') {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('cache:')) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('[Offline Cache] Web clear all failed:', error);
    }
  }
}

