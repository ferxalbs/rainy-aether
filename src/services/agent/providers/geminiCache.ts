/**
 * GeminiCacheManager - Manages explicit content caching for Gemini API
 * 
 * This service creates and manages caches for system prompts and tool definitions
 * to dramatically reduce token consumption and costs.
 * 
 * Key features:
 * - Creates explicit caches for large system prompts
 * - Manages cache TTL (default: 1 hour)
 * - Tracks cache hit statistics
 * - Supports cache reuse across sessions
 */

import { GoogleGenAI } from '@google/genai';

// ===========================
// Types
// ===========================

export interface GeminiCacheConfig {
    displayName: string;
    systemInstruction: string;
    ttlSeconds?: number; // Default: 3600 (1 hour)
    model: string;
}

export interface CacheStats {
    totalInputTokens: number;
    cachedTokens: number;
    uncachedTokens: number;
    hitRate: number;
    estimatedSavings: number; // Percentage cost saved
    lastUpdated: number;
}

export interface CacheInfo {
    name: string;
    model: string;
    displayName: string;
    createTime: Date;
    expireTime: Date;
    tokenCount?: number;
}

// ===========================
// Cache Manager
// ===========================

export class GeminiCacheManager {
    private client: GoogleGenAI;
    private currentCache: CacheInfo | null = null;
    private cacheExpiry: number = 0;
    private stats: CacheStats = {
        totalInputTokens: 0,
        cachedTokens: 0,
        uncachedTokens: 0,
        hitRate: 0,
        estimatedSavings: 0,
        lastUpdated: 0,
    };

    // Hash of the last cached content to detect changes
    private lastContentHash: string = '';

    constructor(apiKey: string) {
        this.client = new GoogleGenAI({ apiKey });
    }

    /**
     * Simple hash function for content comparison
     */
    private hashContent(content: string): string {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16);
    }

    /**
     * Create or reuse a cache for the system prompt
     * Returns the cache name if successful, null otherwise
     */
    async getOrCreateCache(config: GeminiCacheConfig): Promise<string | null> {
        const contentHash = this.hashContent(config.systemInstruction);

        // Check if current cache is still valid and content hasn't changed
        if (
            this.currentCache &&
            Date.now() < this.cacheExpiry &&
            contentHash === this.lastContentHash
        ) {
            console.log(`[GeminiCache] Reusing existing cache: ${this.currentCache.name}`);
            return this.currentCache.name;
        }

        try {
            // Delete old cache if exists
            if (this.currentCache?.name) {
                await this.deleteCache();
            }

            const ttl = config.ttlSeconds || 3600; // 1 hour default

            console.log(`[GeminiCache] Creating new cache for model: ${config.model}`);
            console.log(`[GeminiCache] System instruction length: ${config.systemInstruction.length} chars`);

            // Create new cache with TTL
            // Note: model name must include version suffix (e.g., "gemini-2.0-flash-001")
            const cacheResult = await this.client.caches.create({
                model: config.model,
                config: {
                    displayName: config.displayName,
                    systemInstruction: config.systemInstruction,
                    ttl: `${ttl}s`,
                }
            });

            if (!cacheResult.name) {
                console.warn('[GeminiCache] Cache created but no name returned');
                return null;
            }

            this.currentCache = {
                name: cacheResult.name,
                model: config.model,
                displayName: config.displayName,
                createTime: new Date(),
                expireTime: new Date(Date.now() + ttl * 1000),
                tokenCount: (cacheResult as any).usageMetadata?.totalTokenCount,
            };

            this.cacheExpiry = Date.now() + (ttl * 1000);
            this.lastContentHash = contentHash;

            console.log(`[GeminiCache] ✓ Created cache: ${this.currentCache.name}`);
            if (this.currentCache.tokenCount) {
                console.log(`[GeminiCache] Cached ${this.currentCache.tokenCount} tokens`);
            }

            return this.currentCache.name;
        } catch (error) {
            // Cache creation can fail for various reasons (model doesn't support, API limits, etc.)
            // Fall back to normal requests without caching
            console.warn('[GeminiCache] Failed to create cache (will use implicit caching):', error);
            return null;
        }
    }

    /**
     * Update stats from response metadata
     */
    updateStats(metadata: {
        promptTokenCount?: number;
        cachedContentTokenCount?: number;
        candidatesTokenCount?: number;
    }): void {
        const totalInput = metadata.promptTokenCount ?? 0;
        const cached = metadata.cachedContentTokenCount ?? 0;
        const uncached = totalInput - cached;

        this.stats = {
            totalInputTokens: totalInput,
            cachedTokens: cached,
            uncachedTokens: uncached,
            hitRate: totalInput > 0 ? (cached / totalInput) * 100 : 0,
            // Cache reads are ~10x cheaper, so savings = (cached * 0.9) / total
            estimatedSavings: totalInput > 0 ? (cached * 0.9 / totalInput) * 100 : 0,
            lastUpdated: Date.now(),
        };

        if (cached > 0) {
            console.log(
                `[GeminiCache] 📊 Stats: ${cached.toLocaleString()}/${totalInput.toLocaleString()} tokens cached ` +
                `(${this.stats.hitRate.toFixed(1)}% hit rate, ~${this.stats.estimatedSavings.toFixed(0)}% cost savings)`
            );
        }
    }

    /**
     * Get current cache statistics
     */
    getStats(): CacheStats {
        return { ...this.stats };
    }

    /**
     * Get current cache info
     */
    getCacheInfo(): CacheInfo | null {
        return this.currentCache ? { ...this.currentCache } : null;
    }

    /**
     * Check if cache is valid and not expired
     */
    isCacheValid(): boolean {
        return this.currentCache !== null && Date.now() < this.cacheExpiry;
    }

    /**
     * Delete the current cache
     */
    async deleteCache(): Promise<void> {
        if (this.currentCache?.name) {
            try {
                await this.client.caches.delete({ name: this.currentCache.name });
                console.log(`[GeminiCache] Deleted cache: ${this.currentCache.name}`);
            } catch (error) {
                console.warn('[GeminiCache] Failed to delete cache:', error);
            }
            this.currentCache = null;
            this.cacheExpiry = 0;
            this.lastContentHash = '';
        }
    }

    /**
     * List all caches (for debugging/management)
     */
    async listCaches(): Promise<CacheInfo[]> {
        try {
            const caches: CacheInfo[] = [];
            const pager = await this.client.caches.list();
            // Iterate through all caches in the pager
            for (const cache of pager.page) {
                caches.push({
                    name: cache.name || '',
                    model: cache.model || '',
                    displayName: cache.displayName || '',
                    createTime: new Date(cache.createTime || 0),
                    expireTime: new Date(cache.expireTime || 0),
                });
            }
            return caches;
        } catch (error) {
            console.warn('[GeminiCache] Failed to list caches:', error);
            return [];
        }
    }

    /**
     * Cleanup - delete all expired caches (housekeeping)
     */
    async cleanupExpiredCaches(): Promise<number> {
        let deleted = 0;
        try {
            const caches = await this.listCaches();
            const now = new Date();

            for (const cache of caches) {
                if (cache.expireTime < now && cache.name) {
                    try {
                        await this.client.caches.delete({ name: cache.name });
                        deleted++;
                    } catch {
                        // Ignore individual deletion failures
                    }
                }
            }

            if (deleted > 0) {
                console.log(`[GeminiCache] Cleaned up ${deleted} expired caches`);
            }
        } catch (error) {
            console.warn('[GeminiCache] Cleanup failed:', error);
        }
        return deleted;
    }
}

// ===========================
// Singleton Export
// ===========================

let cacheManagerInstance: GeminiCacheManager | null = null;

export function getGeminiCacheManager(apiKey: string): GeminiCacheManager {
    if (!cacheManagerInstance) {
        cacheManagerInstance = new GeminiCacheManager(apiKey);
    }
    return cacheManagerInstance;
}

export function resetGeminiCacheManager(): void {
    if (cacheManagerInstance) {
        cacheManagerInstance.deleteCache().catch(() => { });
        cacheManagerInstance = null;
    }
}
