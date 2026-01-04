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
    private extractOutput(result: { output: any[] }): string {
        if (!result.output || !Array.isArray(result.output) || result.output.length === 0) {
            console.log('[SubagentExecutor] No output array found');
            return '';
        }

        // Collect all assistant text messages
        const assistantMessages: string[] = [];

        for (const msg of result.output) {
            // Only extract from assistant role text messages
            if (msg.type === 'text' && msg.role === 'assistant') {
                if (typeof msg.content === 'string' && msg.content.trim()) {
                    assistantMessages.push(msg.content);
                } else if (Array.isArray(msg.content)) {
                    // Handle array content blocks (e.g., from Anthropic)
                    const textParts = msg.content
                        .filter((part: any) => part.type === 'text' && part.text)
                        .map((part: any) => part.text);
                    if (textParts.length > 0) {
                        assistantMessages.push(textParts.join('\n'));
                    }
                }
            }
        }

        // Return the last assistant message as the primary response
        if (assistantMessages.length > 0) {
            return assistantMessages[assistantMessages.length - 1];
        }

        // Fallback: try any text message regardless of role
        console.log('[SubagentExecutor] No assistant messages, trying fallback');
        for (let i = result.output.length - 1; i >= 0; i--) {
            const m = result.output[i];
            if (m.type === 'text' && typeof m.content === 'string' && m.content.trim()) {
                return m.content;
            }
        }

        // Last resort: extract from last message using common patterns
        const lastMsg = result.output[result.output.length - 1];
        if (lastMsg?.content) {
            if (typeof lastMsg.content === 'string') {
                return lastMsg.content;
            }
            if (typeof lastMsg.content === 'object') {
                return JSON.stringify(lastMsg.content);
            }
        }

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
