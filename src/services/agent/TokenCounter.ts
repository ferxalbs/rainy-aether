/**
 * Token Counter Service
 * 
 * Estimates token counts for messages and manages context limits.
 * Uses approximation of ~4 characters per token (industry standard estimate).
 */

import { ChatMessage } from '@/types/chat';

// ===========================
// Token Estimation
// ===========================

/**
 * Approximate characters per token
 * This is a rough estimate - actual tokenization varies by model
 * GPT-like: ~4 chars/token, Gemini: ~3.5 chars/token
 * We use 4 as a conservative estimate
 */
const CHARS_PER_TOKEN = 4;

/**
 * Estimate token count for a string
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Estimate token count for a message (includes role overhead)
 */
export function estimateMessageTokens(message: ChatMessage): number {
    let tokens = 0;

    // Content tokens
    tokens += estimateTokens(message.content);

    // Role overhead (~4 tokens for role marker)
    tokens += 4;

    // Tool calls overhead
    if (message.toolCalls) {
        for (const tc of message.toolCalls) {
            // Tool name + JSON args
            tokens += estimateTokens(tc.name);
            tokens += estimateTokens(JSON.stringify(tc.arguments));
            tokens += 10; // Structure overhead

            // Tool result if present
            if (tc.result) {
                tokens += estimateTokens(JSON.stringify(tc.result));
            }
        }
    }

    // Thoughts overhead (for thinking models)
    if (message.thoughts) {
        tokens += estimateTokens(message.thoughts);
    }

    return tokens;
}

/**
 * Estimate total tokens for a conversation
 */
export function estimateConversationTokens(messages: ChatMessage[]): number {
    return messages.reduce((total, msg) => total + estimateMessageTokens(msg), 0);
}

// ===========================
// Context Management
// ===========================

export interface ContextLimits {
    contextWindow: number;
    maxOutputTokens: number;
}

export interface ContextStatus {
    usedTokens: number;
    maxTokens: number;
    percentUsed: number;
    isNearLimit: boolean;  // > 80%
    isAtLimit: boolean;    // > 95%
    remainingTokens: number;
}

/**
 * Calculate context usage status
 */
export function getContextStatus(
    messages: ChatMessage[],
    limits: ContextLimits
): ContextStatus {
    const usedTokens = estimateConversationTokens(messages);
    // Reserve space for output tokens
    const effectiveMax = limits.contextWindow - limits.maxOutputTokens;
    const percentUsed = (usedTokens / effectiveMax) * 100;

    return {
        usedTokens,
        maxTokens: effectiveMax,
        percentUsed: Math.min(100, percentUsed),
        isNearLimit: percentUsed >= 80,
        isAtLimit: percentUsed >= 95,
        remainingTokens: Math.max(0, effectiveMax - usedTokens),
    };
}

/**
 * Truncate messages to fit within context limit while preserving:
 * 1. System prompt (always kept)
 * 2. Most recent messages (prioritized)
 * 3. User's original question if possible
 */
export function truncateToFitContext(
    messages: ChatMessage[],
    limits: ContextLimits,
    targetPercent: number = 70 // Target 70% usage after truncation
): { messages: ChatMessage[]; truncated: boolean; removedCount: number } {
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // Reserve space for output
    const targetTokens = Math.floor((limits.contextWindow - limits.maxOutputTokens) * (targetPercent / 100));

    // Calculate system message tokens
    const systemTokens = systemMessage ? estimateMessageTokens(systemMessage) : 0;
    const availableForConversation = targetTokens - systemTokens;

    // If we're already under limit, return as-is
    const currentConversationTokens = estimateConversationTokens(conversationMessages);
    if (currentConversationTokens <= availableForConversation) {
        return { messages, truncated: false, removedCount: 0 };
    }

    // Keep recent messages from the end
    const keptMessages: ChatMessage[] = [];
    let keptTokens = 0;

    // Iterate from most recent to oldest
    for (let i = conversationMessages.length - 1; i >= 0; i--) {
        const msg = conversationMessages[i];
        const msgTokens = estimateMessageTokens(msg);

        if (keptTokens + msgTokens <= availableForConversation) {
            keptMessages.unshift(msg);
            keptTokens += msgTokens;
        } else {
            // We've hit the limit - stop adding messages
            break;
        }
    }

    // Reconstruct messages array
    const result: ChatMessage[] = [];
    if (systemMessage) result.push(systemMessage);
    result.push(...keptMessages);

    const removedCount = conversationMessages.length - keptMessages.length;

    return {
        messages: result,
        truncated: removedCount > 0,
        removedCount,
    };
}

// ===========================
// Formatting Utilities
// ===========================

/**
 * Format token count for display (e.g., "12.5K", "1.2M")
 */
export function formatTokenCount(tokens: number): string {
    if (tokens >= 1000000) {
        return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
        return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
}

/**
 * Get a human-readable context status message
 */
export function getContextStatusMessage(status: ContextStatus): string | null {
    if (status.isAtLimit) {
        return 'Context limit reached. Older messages will be removed to continue.';
    }
    if (status.isNearLimit) {
        return `Approaching context limit (${status.percentUsed.toFixed(0)}% used)`;
    }
    return null;
}
