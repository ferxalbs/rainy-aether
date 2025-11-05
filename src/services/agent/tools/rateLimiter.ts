/**
 * Tool Rate Limiter
 *
 * Rate limiting system to prevent abuse and ensure fair resource usage.
 */

import type { RateLimitEntry, ToolDefinition } from './types';
import { ToolRateLimitError } from './types';

/**
 * Rate limiter manager
 */
export class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();

  /**
   * Generate rate limit key
   */
  private generateKey(toolName: string, userId: string): string {
    return `${toolName}:${userId}`;
  }

  /**
   * Check if rate limit is exceeded
   */
  async checkLimit(
    tool: ToolDefinition,
    userId: string
  ): Promise<boolean> {
    // Skip if tool has no rate limit
    if (!tool.rateLimit) {
      return true;
    }

    const key = this.generateKey(tool.name, userId);
    const now = Date.now();

    // Get or create limit entry
    let entry = this.limits.get(key);
    if (!entry) {
      entry = {
        toolName: tool.name,
        userId,
        calls: [],
        windowStart: now,
      };
      this.limits.set(key, entry);
    }

    // Reset window if expired
    if (now - entry.windowStart > tool.rateLimit.windowMs) {
      entry.calls = [];
      entry.windowStart = now;
    }

    // Remove calls outside current window
    entry.calls = entry.calls.filter(
      callTime => now - callTime <= tool.rateLimit!.windowMs
    );

    // Check if limit exceeded
    if (entry.calls.length >= tool.rateLimit.maxCalls) {
      const oldestCall = Math.min(...entry.calls);
      const retryAfterMs = tool.rateLimit.windowMs - (now - oldestCall);

      throw new ToolRateLimitError(tool.name, retryAfterMs);
    }

    // Record call
    entry.calls.push(now);
    return true;
  }

  /**
   * Get remaining calls for user and tool
   */
  getRemainingCalls(
    tool: ToolDefinition,
    userId: string
  ): number {
    if (!tool.rateLimit) {
      return Infinity;
    }

    const key = this.generateKey(tool.name, userId);
    const entry = this.limits.get(key);

    if (!entry) {
      return tool.rateLimit.maxCalls;
    }

    const now = Date.now();
    const validCalls = entry.calls.filter(
      callTime => now - callTime <= tool.rateLimit!.windowMs
    );

    return Math.max(0, tool.rateLimit.maxCalls - validCalls.length);
  }

  /**
   * Get time until next call is allowed
   */
  getTimeUntilNextCall(
    tool: ToolDefinition,
    userId: string
  ): number {
    if (!tool.rateLimit) {
      return 0;
    }

    const key = this.generateKey(tool.name, userId);
    const entry = this.limits.get(key);

    if (!entry || entry.calls.length < tool.rateLimit.maxCalls) {
      return 0;
    }

    const now = Date.now();
    const oldestCall = Math.min(...entry.calls);
    return Math.max(0, tool.rateLimit.windowMs - (now - oldestCall));
  }

  /**
   * Reset rate limit for user and tool
   */
  reset(toolName: string, userId: string): void {
    const key = this.generateKey(toolName, userId);
    this.limits.delete(key);
  }

  /**
   * Reset all rate limits for user
   */
  resetUser(userId: string): void {
    for (const [key, entry] of this.limits.entries()) {
      if (entry.userId === userId) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Reset all rate limits for tool
   */
  resetTool(toolName: string): void {
    for (const [key, entry] of this.limits.entries()) {
      if (entry.toolName === toolName) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.limits.clear();
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.limits.entries()) {
      // Remove entries with no calls in the last hour
      const hasRecentCalls = entry.calls.some(callTime => now - callTime <= 3600000);
      if (!hasRecentCalls) {
        this.limits.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get rate limit statistics
   */
  getStats() {
    return {
      totalEntries: this.limits.size,
      byTool: this.getStatsByTool(),
      byUser: this.getStatsByUser(),
    };
  }

  /**
   * Get statistics by tool
   */
  private getStatsByTool(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const entry of this.limits.values()) {
      stats[entry.toolName] = (stats[entry.toolName] || 0) + entry.calls.length;
    }

    return stats;
  }

  /**
   * Get statistics by user
   */
  private getStatsByUser(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const entry of this.limits.values()) {
      stats[entry.userId] = (stats[entry.userId] || 0) + entry.calls.length;
    }

    return stats;
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

/**
 * Get rate limiter instance
 */
export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();

    // Auto-cleanup every 10 minutes
    setInterval(() => {
      const cleaned = rateLimiterInstance?.cleanup();
      if (cleaned && cleaned > 0) {
        console.log(`[RateLimiter] Cleaned up ${cleaned} expired entries`);
      }
    }, 600000);
  }
  return rateLimiterInstance;
}

/**
 * Reset rate limiter (for testing)
 */
export function resetRateLimiter(): void {
  rateLimiterInstance = null;
}
