/**
 * Optimized LSP Client Wrapper
 * Adds request caching, debouncing, and performance optimizations
 */

import { LSPClient } from './lspClient';
import type { LanguageServerConfig, CompletionItem, Hover, Location, Diagnostic } from './types';

/**
 * Cache entry for LSP responses
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Debounce configuration for different request types
 */
interface DebounceConfig {
  completions: number;
  hover: number;
  diagnostics: number;
  default: number;
}

/**
 * Optimized LSP Client with caching and debouncing
 */
export class OptimizedLSPClient extends LSPClient {
  private cache = new Map<string, CacheEntry<unknown>>();
  private debounceTimers = new Map<string, number>();
  private debounceConfig: DebounceConfig = {
    completions: 150, // 150ms for completions
    hover: 100, // 100ms for hover
    diagnostics: 300, // 300ms for diagnostics
    default: 200, // 200ms default
  };

  // Performance metrics
  private metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    responseTimes: [] as number[],
  };

  constructor(config: LanguageServerConfig) {
    super(config);

    // Periodically clean up expired cache entries
    setInterval(() => this.cleanCache(), 60000); // Every minute
  }

  /**
   * Get completions with caching and debouncing
   */
  async getCompletions(
    uri: string,
    line: number,
    character: number
  ): Promise<CompletionItem[]> {
    const cacheKey = `completion:${uri}:${line}:${character}`;

    // Check cache first
    const cached = this.getCached<CompletionItem[]>(cacheKey);
    if (cached !== null) {
      this.metrics.cacheHits++;
      return cached;
    }

    this.metrics.cacheMisses++;

    // Debounce the request
    return this.debounce(
      cacheKey,
      async () => {
        const startTime = performance.now();
        const result = await super.getCompletions(uri, line, character);
        this.recordResponseTime(performance.now() - startTime);

        // Cache for 5 seconds
        this.setCached(cacheKey, result, 5000);
        return result;
      },
      this.debounceConfig.completions
    );
  }

  /**
   * Get hover information with caching
   */
  async getHover(
    uri: string,
    line: number,
    character: number
  ): Promise<Hover | null> {
    const cacheKey = `hover:${uri}:${line}:${character}`;

    // Check cache first
    const cached = this.getCached<Hover | null>(cacheKey);
    if (cached !== null) {
      this.metrics.cacheHits++;
      return cached;
    }

    this.metrics.cacheMisses++;

    // Debounce the request
    return this.debounce(
      cacheKey,
      async () => {
        const startTime = performance.now();
        const result = await super.getHover(uri, line, character);
        this.recordResponseTime(performance.now() - startTime);

        // Cache for 10 seconds
        this.setCached(cacheKey, result, 10000);
        return result;
      },
      this.debounceConfig.hover
    );
  }

  /**
   * Get definition with caching (definitions don't change often)
   */
  async getDefinition(
    uri: string,
    line: number,
    character: number
  ): Promise<Location[]> {
    const cacheKey = `definition:${uri}:${line}:${character}`;

    // Check cache first
    const cached = this.getCached<Location[]>(cacheKey);
    if (cached !== null) {
      this.metrics.cacheHits++;
      return cached;
    }

    this.metrics.cacheMisses++;

    const startTime = performance.now();
    const result = await super.getDefinition(uri, line, character);
    this.recordResponseTime(performance.now() - startTime);

    // Cache for 30 seconds (definitions are stable)
    this.setCached(cacheKey, result, 30000);
    return result;
  }

  /**
   * Get references with caching
   */
  async getReferences(
    uri: string,
    line: number,
    character: number
  ): Promise<Location[]> {
    const cacheKey = `references:${uri}:${line}:${character}`;

    // Check cache first
    const cached = this.getCached<Location[]>(cacheKey);
    if (cached !== null) {
      this.metrics.cacheHits++;
      return cached;
    }

    this.metrics.cacheMisses++;

    const startTime = performance.now();
    const result = await super.getReferences(uri, line, character);
    this.recordResponseTime(performance.now() - startTime);

    // Cache for 20 seconds
    this.setCached(cacheKey, result, 20000);
    return result;
  }

  /**
   * Update document and invalidate related caches
   */
  async updateDocument(uri: string, content: string, version?: number): Promise<void> {
    // Invalidate all caches for this document
    this.invalidateCachesForUri(uri);

    // Call parent implementation
    await super.updateDocument(uri, content, version);
  }

  /**
   * Close document and clear its caches
   */
  async closeDocument(uri: string): Promise<void> {
    // Clear all caches for this document
    this.invalidateCachesForUri(uri);

    // Call parent implementation
    await super.closeDocument(uri);
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const cacheHitRate = this.metrics.totalRequests > 0
      ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100
      : 0;

    return {
      ...this.metrics,
      cacheHitRate: cacheHitRate.toFixed(2) + '%',
      cacheSize: this.cache.size,
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    console.info('[Optimized LSP] Cache cleared');
  }

  // Private helper methods

  /**
   * Get cached value if valid
   */
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set cached value with TTL
   */
  private setCached<T>(key: string, value: T, ttl: number): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Debounce a function call
   */
  private debounce<T>(
    key: string,
    fn: () => Promise<T>,
    delay: number
  ): Promise<T> {
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(async () => {
        this.debounceTimers.delete(key);
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);

      this.debounceTimers.set(key, timer);
    });
  }

  /**
   * Invalidate all caches for a URI
   */
  private invalidateCachesForUri(uri: string): void {
    const keysToDelete: string[] = [];

    for (const [key] of this.cache) {
      if (key.includes(uri)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.debug(`[Optimized LSP] Invalidated ${keysToDelete.length} cache entries for ${uri}`);
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.debug(`[Optimized LSP] Cleaned ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Record response time for metrics
   */
  private recordResponseTime(time: number): void {
    this.metrics.totalRequests++;
    this.metrics.responseTimes.push(time);

    // Keep only last 100 response times
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes.shift();
    }

    // Calculate average
    const sum = this.metrics.responseTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = sum / this.metrics.responseTimes.length;
  }

  /**
   * Stop the client and clean up
   */
  async stop(): Promise<void> {
    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Clear cache
    this.cache.clear();

    // Call parent stop
    await super.stop();
  }
}
