/**
 * Tool Executor
 * 
 * Executes tools with support for:
 * - Parallel execution (respecting tool.parallel flag)
 * - Caching (respecting tool.cacheable flag)
 * - Timeout handling
 * - Retry logic
 */

import type {
    ToolResult,
    ToolCall,
    ToolExecution,
} from './schema';
import { getToolByName } from './schema';

// ===========================
// Types
// ===========================

export interface ExecutorConfig {
    maxConcurrency: number;      // Max parallel tool executions
    defaultTimeout: number;      // Default timeout if not specified
    enableCache: boolean;        // Enable/disable caching globally
    onToolStart?: (call: ToolCall) => void;
    onToolComplete?: (execution: ToolExecution) => void;
    onToolError?: (call: ToolCall, error: Error) => void;
}

export interface BatchOptions {
    parallel: boolean;           // Execute in parallel if tools allow
    stopOnError: boolean;        // Stop batch if any tool fails
    maxConcurrency?: number;     // Override default concurrency
}

export interface ToolHandler {
    (args: Record<string, unknown>): Promise<ToolResult>;
}

// ===========================
// LRU Cache
// ===========================

class LRUCache<T> {
    private cache: Map<string, { value: T; timestamp: number; ttl: number }>;
    private maxSize: number;

    constructor(maxSize: number = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    get(key: string): T | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;

        // Check TTL
        if (Date.now() > entry.timestamp + entry.ttl) {
            this.cache.delete(key);
            return undefined;
        }

        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }

    set(key: string, value: T, ttl: number): void {
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) this.cache.delete(oldestKey);
        }

        this.cache.set(key, { value, timestamp: Date.now(), ttl });
    }

    has(key: string): boolean {
        return this.get(key) !== undefined;
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    get size(): number {
        return this.cache.size;
    }
}

// ===========================
// Tool Executor
// ===========================

export class ToolExecutor {
    private config: ExecutorConfig;
    private handlers: Map<string, ToolHandler>;
    private cache: LRUCache<ToolResult>;

    constructor(config: Partial<ExecutorConfig> = {}) {
        this.config = {
            maxConcurrency: 10,
            defaultTimeout: 30000,
            enableCache: true,
            ...config,
        };
        this.handlers = new Map();
        this.cache = new LRUCache(200);
    }

    /**
     * Register a handler for a tool
     */
    registerHandler(toolName: string, handler: ToolHandler): void {
        this.handlers.set(toolName, handler);
    }

    /**
     * Register multiple handlers
     */
    registerHandlers(handlers: Record<string, ToolHandler>): void {
        for (const [name, handler] of Object.entries(handlers)) {
            this.registerHandler(name, handler);
        }
    }

    /**
     * Execute a single tool
     */
    async execute(call: ToolCall): Promise<ToolExecution> {
        const execution: ToolExecution = {
            ...call,
            status: 'pending',
            startTime: Date.now(),
        };

        const schema = getToolByName(call.tool);
        if (!schema) {
            execution.status = 'error';
            execution.result = { success: false, error: `Unknown tool: ${call.tool}` };
            execution.endTime = Date.now();
            return execution;
        }

        // Check cache
        if (this.config.enableCache && schema.cacheable) {
            const cacheKey = this.getCacheKey(call);
            const cached = this.cache.get(cacheKey);
            if (cached) {
                execution.status = 'success';
                execution.result = { ...cached, cached: true };
                execution.endTime = Date.now();
                return execution;
            }
        }

        // Get handler
        const handler = this.handlers.get(call.tool);
        if (!handler) {
            execution.status = 'error';
            execution.result = { success: false, error: `No handler registered for tool: ${call.tool}` };
            execution.endTime = Date.now();
            return execution;
        }

        // Execute with timeout
        execution.status = 'running';
        this.config.onToolStart?.(call);

        try {
            const timeout = schema.timeout || this.config.defaultTimeout;
            const result = await this.executeWithTimeout(handler, call.args, timeout);

            execution.status = result.success ? 'success' : 'error';
            execution.result = result;
            execution.endTime = Date.now();
            execution.result.duration = execution.endTime - execution.startTime!;

            // Cache successful results
            if (result.success && this.config.enableCache && schema.cacheable) {
                const cacheKey = this.getCacheKey(call);
                this.cache.set(cacheKey, result, schema.cacheTimeout || 30000);
            }

            this.config.onToolComplete?.(execution);
        } catch (error) {
            execution.status = 'error';
            execution.result = {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
            execution.endTime = Date.now();
            this.config.onToolError?.(call, error instanceof Error ? error : new Error(String(error)));
        }

        return execution;
    }

    /**
     * Execute multiple tools in batch
     */
    async batch(
        calls: ToolCall[],
        options: Partial<BatchOptions> = {}
    ): Promise<ToolExecution[]> {
        const opts: BatchOptions = {
            parallel: true,
            stopOnError: false,
            ...options,
        };

        if (!opts.parallel) {
            // Sequential execution
            const results: ToolExecution[] = [];
            for (const call of calls) {
                const result = await this.execute(call);
                results.push(result);
                if (opts.stopOnError && result.status === 'error') {
                    break;
                }
            }
            return results;
        }

        // Group by parallelizable
        const parallelCalls: ToolCall[] = [];
        const sequentialCalls: ToolCall[] = [];

        for (const call of calls) {
            const schema = getToolByName(call.tool);
            if (schema?.parallel) {
                parallelCalls.push(call);
            } else {
                sequentialCalls.push(call);
            }
        }

        // Execute parallel calls
        const maxConcurrency = opts.maxConcurrency || this.config.maxConcurrency;
        const parallelResults = await this.executeParallel(parallelCalls, maxConcurrency, opts.stopOnError);

        // Execute sequential calls
        const sequentialResults: ToolExecution[] = [];
        for (const call of sequentialCalls) {
            const result = await this.execute(call);
            sequentialResults.push(result);
            if (opts.stopOnError && result.status === 'error') {
                break;
            }
        }

        // Combine results in original order
        const resultsMap = new Map<string, ToolExecution>();
        for (const result of [...parallelResults, ...sequentialResults]) {
            resultsMap.set(result.id, result);
        }

        return calls.map(call => resultsMap.get(call.id)!).filter(Boolean);
    }

    /**
     * Execute batch read operations (optimized for many file reads)
     */
    async batchRead(
        paths: string[],
        options: { chunkSize?: number } = {}
    ): Promise<Map<string, ToolResult>> {
        const chunkSize = options.chunkSize || 20;
        const results = new Map<string, ToolResult>();

        // Create calls
        const calls: ToolCall[] = paths.map(path => ({
            id: `read_${path}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            tool: 'read_file',
            args: { path },
            timestamp: Date.now(),
        }));

        // Execute in chunks
        for (let i = 0; i < calls.length; i += chunkSize) {
            const chunk = calls.slice(i, i + chunkSize);
            const executions = await this.batch(chunk, { parallel: true });

            for (let j = 0; j < chunk.length; j++) {
                const path = paths[i + j];
                results.set(path, executions[j]?.result || { success: false, error: 'Not executed' });
            }
        }

        return results;
    }

    /**
     * Clear the cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Invalidate cache for specific tool calls
     */
    invalidateCache(_toolName: string, _argsPattern?: Record<string, unknown>): void {
        // For now, just clear all cache
        // TODO: Implement pattern-based invalidation
        this.cache.clear();
    }

    // ===========================
    // Private Methods
    // ===========================

    private getCacheKey(call: ToolCall): string {
        return `${call.tool}:${JSON.stringify(call.args)}`;
    }

    private async executeWithTimeout(
        handler: ToolHandler,
        args: Record<string, unknown>,
        timeout: number
    ): Promise<ToolResult> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Tool execution timed out after ${timeout}ms`));
            }, timeout);

            handler(args)
                .then(result => {
                    clearTimeout(timer);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timer);
                    reject(error);
                });
        });
    }

    private async executeParallel(
        calls: ToolCall[],
        maxConcurrency: number,
        stopOnError: boolean
    ): Promise<ToolExecution[]> {
        const results: ToolExecution[] = [];
        const executing: Set<Promise<void>> = new Set();
        let stopped = false;

        for (const call of calls) {
            if (stopped) break;

            // Wait if at max concurrency
            while (executing.size >= maxConcurrency) {
                await Promise.race(executing);
            }

            const promise = (async () => {
                const result = await this.execute(call);
                results.push(result);

                if (stopOnError && result.status === 'error') {
                    stopped = true;
                }
            })();

            executing.add(promise);
            promise.finally(() => executing.delete(promise));
        }

        // Wait for remaining
        await Promise.all(executing);
        return results;
    }
}

// ===========================
// Factory
// ===========================

let executorInstance: ToolExecutor | null = null;

export function getToolExecutor(config?: Partial<ExecutorConfig>): ToolExecutor {
    if (!executorInstance) {
        executorInstance = new ToolExecutor(config);
    }
    return executorInstance;
}

export function createToolExecutor(config?: Partial<ExecutorConfig>): ToolExecutor {
    return new ToolExecutor(config);
}

/**
 * Helper to create a tool call
 */
export function createToolCall(tool: string, args: Record<string, unknown> = {}): ToolCall {
    return {
        id: `${tool}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        tool,
        args,
        timestamp: Date.now(),
    };
}
