/**
 * AI Autocompletion Service
 * 
 * Core service for generating AI-powered code completions using Gemini.
 * Features:
 * - Fill-in-Middle (FIM) prompt construction
 * - LRU caching for repeated contexts
 * - Request cancellation with AbortController
 * - Rate limiting to prevent API abuse
 */

import { GoogleGenAI } from '@google/genai';
import { loadCredential } from '@/services/agent/AgentService';
import {
    AutocompletionConfig,
    AutocompletionContext,
    AutocompletionResult,
    AutocompletionCacheKey,
    DEFAULT_AUTOCOMPLETION_CONFIG,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

/** Model for fast autocompletions */
const AUTOCOMPLETION_MODEL = 'gemini-2.5-flash-lite';

/** Maximum prefix context (characters) */
const MAX_PREFIX_CHARS = 2000;

/** Maximum suffix context (characters) */
const MAX_SUFFIX_CHARS = 500;

/** Rate limit: minimum ms between requests */
const MIN_REQUEST_INTERVAL_MS = 500;

// ============================================================================
// LRU Cache
// ============================================================================

class LRUCache<K, V> {
    private cache = new Map<string, V>();
    private maxSize: number;

    constructor(maxSize: number) {
        this.maxSize = maxSize;
    }

    private keyToString(key: K): string {
        return JSON.stringify(key);
    }

    get(key: K): V | undefined {
        const keyStr = this.keyToString(key);
        const value = this.cache.get(keyStr);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(keyStr);
            this.cache.set(keyStr, value);
        }
        return value;
    }

    set(key: K, value: V): void {
        const keyStr = this.keyToString(key);
        // Delete if exists (to update position)
        this.cache.delete(keyStr);
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) this.cache.delete(oldestKey);
        }
        this.cache.set(keyStr, value);
    }

    clear(): void {
        this.cache.clear();
    }

    get size(): number {
        return this.cache.size;
    }
}

// ============================================================================
// AutocompletionService
// ============================================================================

export class AutocompletionService {
    private client: GoogleGenAI | null = null;
    private config: AutocompletionConfig;
    private cache: LRUCache<AutocompletionCacheKey, AutocompletionResult>;
    private abortController: AbortController | null = null;
    private lastRequestTime: number = 0;
    private isInitialized: boolean = false;

    constructor(config: Partial<AutocompletionConfig> = {}) {
        this.config = { ...DEFAULT_AUTOCOMPLETION_CONFIG, ...config };
        this.cache = new LRUCache(this.config.cacheSize);
    }

    /**
     * Initialize the service by loading API credentials
     */
    async initialize(): Promise<boolean> {
        if (this.isInitialized && this.client) {
            return true;
        }

        try {
            // Use the same provider ID as AgentService: 'gemini_api_key'
            const apiKey = await loadCredential('gemini_api_key');
            if (!apiKey) {
                console.warn('[AutocompletionService] No Gemini API key configured');
                return false;
            }

            this.client = new GoogleGenAI({ apiKey });
            this.isInitialized = true;
            console.log('[AutocompletionService] Initialized successfully');
            return true;
        } catch (error) {
            console.error('[AutocompletionService] Failed to initialize:', error);
            return false;
        }
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<AutocompletionConfig>): void {
        this.config = { ...this.config, ...config };
        if (config.cacheSize !== undefined) {
            this.cache = new LRUCache(config.cacheSize);
        }
    }

    /**
     * Get current configuration
     */
    getConfig(): AutocompletionConfig {
        return { ...this.config };
    }

    /**
     * Check if service is ready
     */
    isReady(): boolean {
        return this.isInitialized && this.client !== null && this.config.enabled;
    }

    /**
     * Cancel any pending completion request
     */
    cancelPendingRequest(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    /**
     * Clear the completion cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Generate a completion for the given context
     */
    async getCompletion(context: AutocompletionContext): Promise<AutocompletionResult | null> {
        if (!this.isReady()) {
            await this.initialize();
            if (!this.isReady()) {
                return null;
            }
        }

        // Check minimum prefix length
        const trimmedPrefix = context.prefix.trim();
        if (trimmedPrefix.length < this.config.minPrefixLength) {
            console.debug('[AutocompletionService] Prefix too short:', trimmedPrefix.length, '< min', this.config.minPrefixLength);
            return null;
        }

        // Rate limiting
        const now = Date.now();
        if (now - this.lastRequestTime < MIN_REQUEST_INTERVAL_MS) {
            console.debug('[AutocompletionService] Rate limited');
            return null;
        }

        // Check cache
        if (this.config.cacheEnabled) {
            const cacheKey: AutocompletionCacheKey = {
                fileUri: context.fileUri,
                prefix: context.prefix.slice(-500), // Last 500 chars for key
                suffix: context.suffix.slice(0, 200), // First 200 chars for key
                cursorLine: context.cursorLine,
            };

            const cached = this.cache.get(cacheKey);
            if (cached) {
                console.debug('[AutocompletionService] Cache hit');
                return { ...cached, source: 'cache' };
            }
        }

        // Cancel any pending request
        this.cancelPendingRequest();

        // Create new abort controller
        this.abortController = new AbortController();
        this.lastRequestTime = now;

        try {
            // Build FIM prompt
            const prompt = this.buildFIMPrompt(context);

            // Call Gemini API (matching the structure from gemini.ts)
            const response = await this.client!.models.generateContent({
                model: AUTOCOMPLETION_MODEL,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    temperature: 0.2, // Low temperature for deterministic completions
                    maxOutputTokens: this.config.maxTokens,
                    stopSequences: ['\n\n\n', '```', '<|fim_end|>', '<|fim_prefix|>', '<|fim_suffix|>', '<|fim_middle|>', '<|file_separator|>', '<|end|>'],
                },
            });

            // Check if aborted
            if (this.abortController?.signal.aborted) {
                return null;
            }

            // Extract completion text
            let completionText = response.text?.trim() || '';

            // Strip any FIM/control tokens that might have leaked
            const tokensToStrip = ['<|fim_prefix|>', '<|fim_suffix|>', '<|fim_middle|>', '<|fim_end|>', '<|file_separator|>', '<|end|>'];
            for (const token of tokensToStrip) {
                completionText = completionText.replace(new RegExp(token.replace(/[|]/g, '\\|'), 'g'), '');
            }
            completionText = completionText.trim();

            if (!completionText) {
                return null;
            }

            // Create result
            const result: AutocompletionResult = {
                text: completionText,
                range: {
                    startLineNumber: context.cursorLine,
                    startColumn: context.cursorColumn,
                    endLineNumber: context.cursorLine,
                    endColumn: context.cursorColumn,
                },
                isMultiLine: completionText.includes('\n'),
                source: 'ai',
                timestamp: Date.now(),
            };

            // Cache the result
            if (this.config.cacheEnabled) {
                const cacheKey: AutocompletionCacheKey = {
                    fileUri: context.fileUri,
                    prefix: context.prefix.slice(-500),
                    suffix: context.suffix.slice(0, 200),
                    cursorLine: context.cursorLine,
                };
                this.cache.set(cacheKey, result);
            }

            return result;
        } catch (error: any) {
            if (error.name === 'AbortError') {
                return null;
            }
            console.error('[AutocompletionService] Completion error:', error);
            return null;
        } finally {
            this.abortController = null;
        }
    }

    /**
     * Build Fill-in-Middle prompt for code completion
     */
    private buildFIMPrompt(context: AutocompletionContext): string {
        // Truncate prefix and suffix to fit context window
        const prefix = context.prefix.slice(-MAX_PREFIX_CHARS);
        const suffix = context.suffix.slice(0, MAX_SUFFIX_CHARS);

        return `You are a code completion assistant. Complete the code at the cursor position.
Only output the completion text, nothing else. Do not include explanations or markdown.

File: ${context.fileUri.split('/').pop() || 'untitled'}
Language: ${context.language}

<|fim_prefix|>
${prefix}<|fim_suffix|>
${suffix}
<|fim_middle|>`;
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let serviceInstance: AutocompletionService | null = null;

/**
 * Get the autocompletion service singleton
 */
export function getAutocompletionService(): AutocompletionService {
    if (!serviceInstance) {
        serviceInstance = new AutocompletionService();
    }
    return serviceInstance;
}

/**
 * Initialize the autocompletion service
 */
export async function initializeAutocompletionService(): Promise<boolean> {
    const service = getAutocompletionService();
    return service.initialize();
}
