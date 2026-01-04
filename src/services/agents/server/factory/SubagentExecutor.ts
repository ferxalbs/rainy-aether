/**
 * Subagent Executor
 * 
 * Provides isolated execution context for subagents.
 * Ensures subagents run independently from the general agent,
 * with their own tool scopes and context containment.
 */

import type { Agent as AgentKitAgent } from '@inngest/agent-kit';
import { SubagentFactory } from './SubagentFactory';
import type { SubagentConfig } from '../types/SubagentConfig';

/**
 * Result from subagent execution
 */
export interface SubagentExecutionResult {
    success: boolean;
    agentId: string;
    agentName: string;
    output: string;
    model: string;
    executionTimeMs: number;
    toolCalls?: Array<{
        name: string;
        args: Record<string, unknown>;
        result?: unknown;
    }>;
    error?: string;
}

/**
 * Execution options for subagent run
 */
export interface SubagentExecutionOptions {
    /** Maximum time to wait for execution in ms */
    timeoutMs?: number;
    /** Whether to include tool call details in result */
    includeToolCalls?: boolean;
}

/**
 * SubagentExecutor provides isolated execution for specialized subagents.
 * 
 * Key features:
 * - **Isolation**: Each execution creates a fresh agent instance
 * - **Tool scoping**: Only the configured tools are available
 * - **Context containment**: System prompt and behavior are self-contained
 * - **Output normalization**: Standardizes AgentKit output extraction
 * 
 * @example
 * ```typescript
 * const executor = new SubagentExecutor(config);
 * const result = await executor.execute("Review this code for bugs");
 * console.log(result.output); // Agent's response
 * ```
 */
export class SubagentExecutor {
    private config: SubagentConfig;
    private agent: AgentKitAgent<any>;

    constructor(config: SubagentConfig) {
        // Validate config before creating executor
        const validation = SubagentFactory.validate(config);
        if (!validation.valid) {
            throw new Error(`Invalid subagent config: ${validation.errors.join(', ')}`);
        }

        this.config = config;
        // Create the agent instance (isolated with its own tools and prompt)
        this.agent = SubagentFactory.create(config);

        console.log(`[SubagentExecutor] Created executor for '${config.name}' (${config.id})`);
    }

    /**
     * Execute a task with this subagent in an isolated context
     */
    async execute(
        task: string,
        options: SubagentExecutionOptions = {}
    ): Promise<SubagentExecutionResult> {
        const startTime = Date.now();
        const { timeoutMs = 60000, includeToolCalls = false } = options;

        console.log(`[SubagentExecutor] Executing task for '${this.config.name}'`);
        console.log(`  Task: ${task.substring(0, 100)}${task.length > 100 ? '...' : ''}`);

        try {
            // Run the agent with the task
            // The agent is already configured with isolated tools and system prompt
            const result = await Promise.race([
                this.agent.run(task),
                this.createTimeout(timeoutMs),
            ]);

            // Check if it was a timeout
            if (!result || typeof result === 'string') {
                return {
                    success: false,
                    agentId: this.config.id,
                    agentName: this.config.name,
                    output: '',
                    model: this.config.model,
                    executionTimeMs: Date.now() - startTime,
                    error: 'Execution timed out',
                };
            }

            // Extract output using standardized extraction
            const output = this.extractOutput(result);
            const toolCalls = includeToolCalls ? this.extractToolCalls(result) : undefined;

            const executionTimeMs = Date.now() - startTime;
            console.log(`[SubagentExecutor] Execution completed in ${executionTimeMs}ms`);
            console.log(`  Output length: ${output.length}`);

            return {
                success: true,
                agentId: this.config.id,
                agentName: this.config.name,
                output,
                model: this.config.model,
                executionTimeMs,
                toolCalls,
            };
        } catch (error) {
            const executionTimeMs = Date.now() - startTime;
            console.error(`[SubagentExecutor] Execution failed:`, error);

            return {
                success: false,
                agentId: this.config.id,
                agentName: this.config.name,
                output: '',
                model: this.config.model,
                executionTimeMs,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Extract text output from AgentKit result
     * Handles multiple message formats from different model providers
     */
    /**
     * Extract text output from AgentKit result
     * Handles multiple message formats from different model providers
     */
    private extractOutput(result: unknown): string {
        // Handle AgentKit's flexible output format
        // Format: { output: Message[] } where Message can have various structures

        const output = (result as any)?.output;

        // Debug logging for diagnosing format issues
        console.log('[SubagentExecutor] Output extraction debug:');
        console.log('  - Result type:', typeof result);
        console.log('  - Has output property:', !!output);
        if (output) {
            console.log('  - Output type:', typeof output);
            if (Array.isArray(output)) {
                console.log('  - Output array length:', output.length);
                if (output.length > 0) {
                    console.log('  - First item:', JSON.stringify(output[0]).substring(0, 200));
                    console.log('  - Last item:', JSON.stringify(output[output.length - 1]).substring(0, 200));
                }
            } else {
                console.log('  - Output content:', JSON.stringify(output).substring(0, 200));
            }
        }

        if (!output) {
            console.log('[SubagentExecutor] No output property found in result');
            return '';
        }

        // If output is already a string
        if (typeof output === 'string') {
            return output;
        }

        if (!Array.isArray(output) || output.length === 0) {
            console.log('[SubagentExecutor] Output is not an array or is empty');
            return '';
        }

        // Strategy 1: Find the last assistant text message
        for (let i = output.length - 1; i >= 0; i--) {
            const msg = output[i];

            // Check for assistant role messages
            if (msg.role === 'assistant') {
                // Content can be string or array
                if (typeof msg.content === 'string' && msg.content.trim()) {
                    console.log(`[SubagentExecutor] Strategy 1: Found assistant message at index ${i}`);
                    return msg.content;
                }
                if (Array.isArray(msg.content)) {
                    const textParts = msg.content
                        .filter((p: any) => p.type === 'text' && p.text)
                        .map((p: any) => p.text);
                    if (textParts.length > 0) {
                        console.log(`[SubagentExecutor] Strategy 1: Found assistant message (array) at index ${i}`);
                        return textParts.join('\n');
                    }
                }
            }

            // Also check type === 'text' with assistant role (variant format)
            if (msg.type === 'text' && msg.role === 'assistant') {
                if (typeof msg.content === 'string' && msg.content.trim()) {
                    console.log(`[SubagentExecutor] Strategy 1: Found assistant text message at index ${i}`);
                    return msg.content;
                }
            }
        }

        // Strategy 2: Find any text message regardless of role (fallback)
        console.log('[SubagentExecutor] No strict assistant messages found, trying fallback strategy');
        for (let i = output.length - 1; i >= 0; i--) {
            const msg = output[i];

            // Standard text message
            if (msg.type === 'text' && typeof msg.content === 'string' && msg.content.trim()) {
                console.log(`[SubagentExecutor] Strategy 2: Found text message at index ${i}`);
                return msg.content;
            }

            // Direct content string without type (some providers)
            if (typeof msg.content === 'string' && msg.content.trim() && !msg.type) {
                console.log(`[SubagentExecutor] Strategy 2: Found unstructured content message at index ${i}`);
                return msg.content;
            }
        }

        // Strategy 3: Last message content (any format)
        // This is a "Hail Mary" attempt to get something useful
        console.log('[SubagentExecutor] Fallback strategy failed, trying last resort (raw content)');
        const lastMsg = output[output.length - 1];
        if (lastMsg) {
            if (typeof lastMsg.content === 'string') {
                console.log('[SubagentExecutor] Strategy 3: Using last message content string');
                return lastMsg.content;
            }
            if (Array.isArray(lastMsg.content)) {
                const text = lastMsg.content
                    .filter((p: any) => (p.type === 'text' || p.text))
                    .map((p: any) => p.text || p.content || String(p))
                    .join('\n');
                if (text) {
                    console.log('[SubagentExecutor] Strategy 3: Extracted text from last message array');
                    return text;
                }
            }
        }

        console.log('[SubagentExecutor] FAILED to extract any output');
        return '';
    }

    /**
     * Extract tool calls from AgentKit result
     */
    private extractToolCalls(result: { output: any[] }): Array<{
        name: string;
        args: Record<string, unknown>;
        result?: unknown;
    }> {
        const toolCalls: Array<{ name: string; args: Record<string, unknown>; result?: unknown }> = [];

        if (!result.output || !Array.isArray(result.output)) {
            return toolCalls;
        }

        for (const msg of result.output) {
            if (msg.type === 'tool_call' && Array.isArray(msg.tools)) {
                for (const tool of msg.tools) {
                    toolCalls.push({
                        name: tool.name || 'unknown',
                        args: tool.input || {},
                    });
                }
            } else if (msg.type === 'tool_result') {
                // Match tool results to their calls if possible
                const lastCall = toolCalls[toolCalls.length - 1];
                if (lastCall && !lastCall.result) {
                    lastCall.result = msg.content;
                }
            }
        }

        return toolCalls;
    }

    /**
     * Create a timeout promise for execution limits
     */
    private createTimeout(ms: number): Promise<string> {
        return new Promise((resolve) => {
            setTimeout(() => resolve('timeout'), ms);
        });
    }

    /**
     * Get the subagent configuration
     */
    getConfig(): SubagentConfig {
        return this.config;
    }

    /**
     * Get the underlying AgentKit agent instance
     */
    getAgent(): AgentKitAgent<any> {
        return this.agent;
    }
}

/**
 * Create an executor for a subagent configuration
 * Convenience function for one-shot execution
 */
export function createSubagentExecutor(config: SubagentConfig): SubagentExecutor {
    return new SubagentExecutor(config);
}

/**
 * Execute a task with a subagent configuration in isolation
 * Convenience function for one-shot execution
 */
export async function executeWithSubagent(
    config: SubagentConfig,
    task: string,
    options?: SubagentExecutionOptions
): Promise<SubagentExecutionResult> {
    const executor = new SubagentExecutor(config);
    return executor.execute(task, options);
}
