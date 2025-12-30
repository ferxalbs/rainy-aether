/**
 * Tool Utilities
 * 
 * Utilities for optimizing tool responses following Anthropic's best practices:
 * - Response format control (concise/detailed)
 * - Token-efficient truncation
 * - Semantic response formatting
 */

// =============================================================================
// Types
// =============================================================================

export type ResponseFormat = 'concise' | 'detailed' | 'auto';

export interface TruncationResult<T> {
    data: T;
    truncated: boolean;
    originalSize?: number;
    truncatedSize?: number;
    message?: string;
}

export interface ToolResponseOptions {
    format?: ResponseFormat;
    maxTokens?: number;
    maxItems?: number;
    includeMetadata?: boolean;
}

// =============================================================================
// Token Estimation
// =============================================================================

/**
 * Estimate token count for a string.
 * Uses a simple heuristic: ~4 characters per token for code/text.
 * This is conservative to avoid exceeding limits.
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;
    // Average ~4 chars per token for English text
    // Code tends to be slightly more efficient but we use conservative estimate
    return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens for any value (serializes to JSON first)
 */
export function estimateValueTokens(value: unknown): number {
    if (value === null || value === undefined) return 1;
    if (typeof value === 'string') return estimateTokens(value);
    if (typeof value === 'number' || typeof value === 'boolean') return 1;

    try {
        const json = JSON.stringify(value);
        return estimateTokens(json);
    } catch {
        return 100; // Fallback for circular refs, etc.
    }
}

// =============================================================================
// Response Truncation
// =============================================================================

const DEFAULT_MAX_TOKENS = 25000;
const DEFAULT_MAX_ITEMS = 100;

/**
 * Truncate a string response to fit within token limits.
 * Adds helpful message about truncation.
 */
export function truncateString(
    text: string,
    maxTokens: number = DEFAULT_MAX_TOKENS
): TruncationResult<string> {
    const tokens = estimateTokens(text);

    if (tokens <= maxTokens) {
        return { data: text, truncated: false };
    }

    // Calculate approximate character limit
    const maxChars = maxTokens * 4;
    const truncated = text.slice(0, maxChars);

    // Try to truncate at a reasonable boundary (newline or space)
    const lastNewline = truncated.lastIndexOf('\n');
    const lastSpace = truncated.lastIndexOf(' ');
    const breakPoint = Math.max(lastNewline, lastSpace, maxChars - 200);

    const finalText = truncated.slice(0, breakPoint);

    return {
        data: finalText,
        truncated: true,
        originalSize: text.length,
        truncatedSize: finalText.length,
        message: `Output truncated (${text.length} → ${finalText.length} chars). Use more specific queries or filters to narrow results.`
    };
}

/**
 * Truncate an array response to fit within limits.
 * Prioritizes showing first items and includes count info.
 */
export function truncateArray<T>(
    items: T[],
    options: { maxItems?: number; maxTokens?: number } = {}
): TruncationResult<T[]> {
    const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

    if (items.length <= maxItems) {
        const tokens = estimateValueTokens(items);
        if (tokens <= maxTokens) {
            return { data: items, truncated: false };
        }
    }

    // First pass: limit by count
    let truncated = items.slice(0, maxItems);

    // Second pass: limit by tokens
    let tokens = estimateValueTokens(truncated);
    while (tokens > maxTokens && truncated.length > 1) {
        truncated = truncated.slice(0, Math.floor(truncated.length * 0.8));
        tokens = estimateValueTokens(truncated);
    }

    if (truncated.length === items.length) {
        return { data: items, truncated: false };
    }

    return {
        data: truncated,
        truncated: true,
        originalSize: items.length,
        truncatedSize: truncated.length,
        message: `Showing ${truncated.length} of ${items.length} results. Use filters to narrow your search.`
    };
}

// =============================================================================
// Response Formatting
// =============================================================================

/**
 * Format file content response based on response format.
 */
export function formatFileResponse(
    path: string,
    content: string,
    format: ResponseFormat = 'detailed'
): { path: string; content?: string; lineCount?: number; charCount?: number; preview?: string } {
    const lines = content.split('\n');

    if (format === 'concise') {
        return {
            path,
            lineCount: lines.length,
            charCount: content.length,
            preview: lines.slice(0, 5).join('\n') + (lines.length > 5 ? '\n...' : '')
        };
    }

    // Detailed format - but still truncate very large files
    const truncated = truncateString(content, 15000);

    return {
        path,
        content: truncated.data,
        lineCount: lines.length,
        charCount: content.length,
        ...(truncated.truncated && {
            preview: `[Truncated: showing first ${truncated.truncatedSize} of ${truncated.originalSize} chars]`
        })
    };
}

/**
 * Format search results based on response format.
 */
export function formatSearchResults(
    results: Array<{ file: string; line: number; content: string }>,
    format: ResponseFormat = 'detailed'
): { results: Array<{ file: string; line: number; content?: string }>; total: number } {
    const truncated = truncateArray(results, { maxItems: format === 'concise' ? 20 : 50 });

    if (format === 'concise') {
        return {
            results: truncated.data.map(r => ({ file: r.file, line: r.line })),
            total: results.length
        };
    }

    return {
        results: truncated.data,
        total: results.length
    };
}

/**
 * Format directory tree based on response format.
 */
export function formatDirectoryTree(
    tree: { directories: any[]; files: any[] },
    format: ResponseFormat = 'detailed'
): { tree: { directories: any[]; files: any[] }; summary?: string } {
    // Count total items
    const countItems = (node: { directories?: any[]; files?: any[] }): number => {
        const dirs = node.directories?.length ?? 0;
        const files = node.files?.length ?? 0;
        const subdirItems = node.directories?.reduce((sum, d) => sum + countItems(d.children || {}), 0) ?? 0;
        return dirs + files + subdirItems;
    };

    const totalItems = countItems(tree);

    if (format === 'concise') {
        // Return only top-level structure
        return {
            tree: {
                directories: tree.directories?.map(d => ({ name: d.name, hasChildren: !!d.children })) ?? [],
                files: tree.files?.map(f => ({ name: f.name })) ?? []
            },
            summary: `${tree.directories?.length ?? 0} directories, ${tree.files?.length ?? 0} files at root level (${totalItems} total items)`
        };
    }

    return { tree, summary: `${totalItems} total items` };
}

// =============================================================================
// Error Formatting
// =============================================================================

/**
 * Create a helpful, actionable error message.
 * Following Anthropic's guidance on clear error communication.
 */
export function createHelpfulError(
    error: string,
    context: {
        tool: string;
        suggestion?: string;
        alternatives?: string[];
        hint?: string;
    }
): { success: false; error: string; suggestion?: string; alternatives?: string[]; hint?: string } {
    return {
        success: false,
        error,
        ...(context.suggestion && { suggestion: context.suggestion }),
        ...(context.alternatives && { alternatives: context.alternatives }),
        ...(context.hint && { hint: context.hint })
    };
}

// =============================================================================
// Tool Annotations
// =============================================================================

export interface ToolAnnotations {
    /** Tool makes irreversible changes (delete, overwrite) */
    destructive?: boolean;
    /** Tool should prompt for user confirmation */
    requiresConfirmation?: boolean;
    /** Tool may take >5 seconds to execute */
    slowOperation?: boolean;
    /** Tool accesses external resources (network, APIs) */
    externalAccess?: boolean;
    /** Tool is read-only (no side effects) */
    readOnly?: boolean;
}

export const TOOL_ANNOTATIONS: Record<string, ToolAnnotations> = {
    // Read operations (safe)
    get_workspace_info: { readOnly: true },
    read_file: { readOnly: true },
    list_dir: { readOnly: true },
    read_directory_tree: { readOnly: true },
    search_code: { readOnly: true },
    list_files: { readOnly: true },
    get_diagnostics: { readOnly: true },
    git_status: { readOnly: true },

    // Write operations
    create_file: { destructive: false },
    write_file: { destructive: true, requiresConfirmation: false },
    edit_file: { destructive: true, requiresConfirmation: false },
    apply_file_diff: { destructive: true, requiresConfirmation: true },

    // Execute operations
    run_command: { slowOperation: true, externalAccess: true },
    run_tests: { slowOperation: true },
    format_file: { destructive: true },

    // Git operations
    git_commit: { destructive: true },
};

/**
 * Get annotations for a tool
 */
export function getToolAnnotations(toolName: string): ToolAnnotations {
    return TOOL_ANNOTATIONS[toolName] ?? { readOnly: false };
}

/**
 * Check if a tool is safe to execute without confirmation
 */
export function isToolSafe(toolName: string): boolean {
    const annotations = getToolAnnotations(toolName);
    return annotations.readOnly === true ||
        (!annotations.destructive && !annotations.requiresConfirmation);
}
