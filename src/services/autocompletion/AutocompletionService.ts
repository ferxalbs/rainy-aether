/**
 * AI Autocompletion Service
 * 
 * Core service for generating AI-powered code completions using Gemini.
 * Features:
 * - Context-aware prompting (uses comments, surrounding code)
 * - Intelligent completion sanitization
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

/** Model for fast and precise autocompletions */
const AUTOCOMPLETION_MODEL = 'gemini-3-flash-preview';

/** Maximum prefix context (characters) */
const MAX_PREFIX_CHARS = 3000;

/** Maximum suffix context (characters) */
const MAX_SUFFIX_CHARS = 10000;

/** Rate limit: minimum ms between requests */
const MIN_REQUEST_INTERVAL_MS = 300;

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
            this.cache.delete(keyStr);
            this.cache.set(keyStr, value);
        }
        return value;
    }

    set(key: K, value: V): void {
        const keyStr = this.keyToString(key);
        this.cache.delete(keyStr);
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

    async initialize(): Promise<boolean> {
        if (this.isInitialized && this.client) {
            return true;
        }

        try {
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

    updateConfig(config: Partial<AutocompletionConfig>): void {
        this.config = { ...this.config, ...config };
        if (config.cacheSize !== undefined) {
            this.cache = new LRUCache(config.cacheSize);
        }
    }

    getConfig(): AutocompletionConfig {
        return { ...this.config };
    }

    isReady(): boolean {
        return this.isInitialized && this.client !== null && this.config.enabled;
    }

    cancelPendingRequest(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    clearCache(): void {
        this.cache.clear();
    }

    async getCompletion(context: AutocompletionContext): Promise<AutocompletionResult | null> {
        if (!this.isReady()) {
            await this.initialize();
            if (!this.isReady()) {
                return null;
            }
        }

        const trimmedPrefix = context.prefix.trim();
        if (trimmedPrefix.length < this.config.minPrefixLength) {
            return null;
        }

        const now = Date.now();
        if (now - this.lastRequestTime < MIN_REQUEST_INTERVAL_MS) {
            return null;
        }

        if (this.config.cacheEnabled) {
            const cacheKey: AutocompletionCacheKey = {
                fileUri: context.fileUri,
                prefix: context.prefix.slice(-500),
                suffix: context.suffix.slice(0, 200),
                cursorLine: context.cursorLine,
            };

            const cached = this.cache.get(cacheKey);
            if (cached) {
                return { ...cached, source: 'cache' };
            }
        }

        this.cancelPendingRequest();
        this.abortController = new AbortController();
        this.lastRequestTime = now;

        try {
            const prompt = this.buildCompletionPrompt(context);

            const response = await this.client!.models.generateContent({
                model: AUTOCOMPLETION_MODEL,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    temperature: 0.8,
                    maxOutputTokens: this.config.maxTokens,
                    topP: 0.95,
                    topK: 40,
                },
            });

            if (this.abortController?.signal.aborted) {
                return null;
            }

            const rawText = response.text || '';
            const completionText = this.sanitizeCompletion(rawText, context);

            if (!completionText) {
                return null;
            }

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
     * Build a minimal, strict prompt for code completion.
     * Less is more - complex prompts cause the model to generate explanations.
     */
    private buildCompletionPrompt(context: AutocompletionContext): string {
        const prefix = context.prefix.slice(-MAX_PREFIX_CHARS);
        const suffix = context.suffix.slice(0, MAX_SUFFIX_CHARS);

        // Ultra-minimal prompt - just code context, no instructions
        // The model should infer what to complete from the code structure
        return `Complete this ${context.language} code. Output ONLY code, nothing else.

${prefix}<COMPLETE_HERE>${suffix}`;
    }

    /**
     * Aggressively sanitize and validate the AI completion output.
     * Truncates at natural code boundaries to prevent thinking text leakage.
     */
    private sanitizeCompletion(raw: string, context: AutocompletionContext): string {
        let text = raw;

        // Remove the completion marker if it appears
        text = text.replace(/<COMPLETE_HERE>/g, '');
        text = text.replace(/<\/COMPLETE_HERE>/g, '');

        // Remove markdown code fences
        text = text.replace(/^```[\w]*\n?/gm, '');
        text = text.replace(/\n?```$/gm, '');
        text = text.replace(/```/g, '');

        // Remove control tokens
        text = text.replace(/<\|[^|>]+\|>/g, '');

        // Trim whitespace
        text = text.trim();

        // CRITICAL: Truncate at first sign of thinking/explanation text
        // This catches cases where valid code is followed by rambling
        const thinkingStarters = [
            '(implied)', '(note', '(actually', '(this',
            'Actually,', 'Note:', 'This is', 'The prompt',
            'Wait,', 'Let me', "Let's", 'I think',
            'Here is', 'Here we', 'Now,', 'First,',
            '// Note', '// TODO', '/* Note', '/* TODO',
        ];

        for (const starter of thinkingStarters) {
            const idx = text.indexOf(starter);
            if (idx > 0) {
                // Found thinking text after some valid code - truncate there
                text = text.slice(0, idx).trim();
                console.log('[AutocompletionService] Truncated at thinking:', starter);
            }
        }

        // Also truncate at patterns that look like AI rambling
        const ramblingPatterns = [
            /\s+or\s+just\s+/i,           // "or just ends"
            /\s+the\s+prompt\s+/i,        // "the prompt ends with"
            /\s+actually\s+/i,            // "Actually, ..."
            /\s+implied\s+/i,             // "(implied)"
            /\s+note\s*:/i,               // "Note:"
        ];

        for (const pattern of ramblingPatterns) {
            const match = text.match(pattern);
            if (match && match.index && match.index > 5) {
                text = text.slice(0, match.index).trim();
                console.log('[AutocompletionService] Truncated at rambling pattern');
            }
        }

        // For single-line completions, stop at reasonable boundaries
        if (!text.includes('\n')) {
            // If there's a semicolon followed by non-code text, truncate there
            const semiMatch = text.match(/;[\s]*[a-zA-Z]{3,}/);
            if (semiMatch && semiMatch.index !== undefined) {
                text = text.slice(0, semiMatch.index + 1); // Keep the semicolon
            }

            // If there's a closing brace/paren followed by text, truncate
            const braceMatch = text.match(/[}\)][\s]*[a-zA-Z]{4,}/);
            if (braceMatch && braceMatch.index !== undefined) {
                text = text.slice(0, braceMatch.index + 1); // Keep the brace
            }
        }

        // Reject if ENTIRELY thinking (starts with thinking words)
        const startsWithThinking = /^(wait|let me|let's|i |okay|ok,|alright|hmm|the |this |here |sure|certainly|actually|note)/i;
        if (startsWithThinking.test(text)) {
            console.warn('[AutocompletionService] Rejected: starts with thinking');
            return '';
        }

        // If completion starts with what's already at the end of prefix, remove it
        const prefixEnd = context.prefix.slice(-30).trim();
        if (prefixEnd.length > 5 && text.startsWith(prefixEnd)) {
            text = text.slice(prefixEnd.length).trim();
        }

        // Reject empty or too long
        if (text.length < 1 || text.length > 500) {
            return '';
        }

        // Limit lines for inline completion (max 5 lines for cleaner suggestions)
        const lines = text.split('\n');
        if (lines.length > 5) {
            text = lines.slice(0, 5).join('\n');
        }

        return text;
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
