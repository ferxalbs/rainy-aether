/**
 * Tool Cache System
 *
 * Caching layer for tool execution results to improve performance and reduce
 * redundant operations.
 */

import type { CacheEntry } from './types';
import { createHash } from 'crypto';

/**
 * Tool cache manager
 */
export class ToolCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Generate cache key from tool name and input
   */
  generateKey(toolName: string, input: unknown): string {
    const inputStr = JSON.stringify(input, Object.keys(input as object).sort());
    const hash = createHash('sha256').update(`${toolName}:${inputStr}`).digest('hex');
    return `${toolName}:${hash.substring(0, 16)}`;
  }

  /**
   * Get cached result
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check expiration
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data as T;
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttl: number = 300000): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Evict expired entries
   */
  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        evicted++;
      }
    }

    return evicted;
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return this.hits / total;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
    };
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }
}

// Singleton instance
let cacheInstance: ToolCache | null = null;

/**
 * Get tool cache instance
 */
export function getToolCache(): ToolCache {
  if (!cacheInstance) {
    cacheInstance = new ToolCache(1000);

    // Auto-cleanup expired entries every 5 minutes
    setInterval(() => {
      const evicted = cacheInstance?.evictExpired();
      if (evicted && evicted > 0) {
        console.log(`[ToolCache] Evicted ${evicted} expired entries`);
      }
    }, 300000);
  }
  return cacheInstance;
}

/**
 * Reset tool cache (for testing)
 */
export function resetToolCache(): void {
  cacheInstance = null;
}
