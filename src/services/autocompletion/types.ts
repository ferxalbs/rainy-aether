/**
 * AI Autocompletion Types
 * 
 * Type definitions for the AI-powered inline autocompletion system.
 */

import type * as monaco from 'monaco-editor';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Autocompletion configuration options
 */
export interface AutocompletionConfig {
    /** Whether autocompletion is enabled */
    enabled: boolean;
    /** Debounce delay in milliseconds before triggering completion */
    debounceMs: number;
    /** Maximum tokens for completion response */
    maxTokens: number;
    /** Minimum prefix length before triggering */
    minPrefixLength: number;
    /** Whether to trigger completion on new line */
    triggerOnNewLine: boolean;
    /** Whether to cache completions */
    cacheEnabled: boolean;
    /** Maximum number of cached completions */
    cacheSize: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_AUTOCOMPLETION_CONFIG: AutocompletionConfig = {
    enabled: true,
    debounceMs: 300,
    maxTokens: 1024, // Increased for longer, more complete suggestions
    minPrefixLength: 3,
    triggerOnNewLine: true,
    cacheEnabled: true,
    cacheSize: 50,
};

// ============================================================================
// Context
// ============================================================================

/**
 * Context for generating an autocompletion
 */
export interface AutocompletionContext {
    /** File URI */
    fileUri: string;
    /** Programming language */
    language: string;
    /** Code before the cursor (prefix) */
    prefix: string;
    /** Code after the cursor (suffix) */
    suffix: string;
    /** Current line number (1-indexed) */
    cursorLine: number;
    /** Current column number (1-indexed) */
    cursorColumn: number;
    /** The current line content */
    currentLine: string;
    /** Indentation of current line */
    indentation: string;
}

// ============================================================================
// Results
// ============================================================================

/**
 * A single autocompletion result
 */
export interface AutocompletionResult {
    /** The completion text to insert */
    text: string;
    /** The range where to insert the completion */
    range: monaco.IRange;
    /** Whether completion spans multiple lines */
    isMultiLine: boolean;
    /** Completion source identifier */
    source: 'ai' | 'cache';
    /** Timestamp when this completion was generated */
    timestamp: number;
}

/**
 * Cache key for autocompletion
 */
export interface AutocompletionCacheKey {
    fileUri: string;
    prefix: string;
    suffix: string;
    cursorLine: number;
}

// ============================================================================
// State
// ============================================================================

/**
 * Autocompletion store state
 */
export interface AutocompletionState {
    /** Whether autocompletion is enabled */
    enabled: boolean;
    /** Whether a completion request is in progress */
    isLoading: boolean;
    /** Last trigger timestamp */
    lastTriggerTime: number;
    /** Statistics */
    stats: {
        accepted: number;
        dismissed: number;
        generated: number;
    };
    /** Current configuration */
    config: AutocompletionConfig;
}

// ============================================================================
// Provider Types
// ============================================================================

/**
 * Trigger kind for inline completions
 */
export type AutocompletionTriggerKind = 'automatic' | 'explicit';

/**
 * Inline completion item compatible with Monaco
 */
export interface InlineCompletionItem {
    insertText: string;
    range: monaco.IRange;
    command?: monaco.languages.Command;
}
